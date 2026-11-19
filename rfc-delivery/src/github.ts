// GitHub through the gh CLI (its authentication, its pagination). The decisions taken on what
// GitHub returns are pure functions, exported for the tests.
import { CommandError, out, run, sleep } from './exec.ts';
import type { Logger } from './log.ts';

// ---------------------------------------------------------------- pure decisions

export type ChecksState = 'pass' | 'fail' | 'pending';

/** Every required check passed (or was skipped), one failed (or was cancelled), or not yet. */
export const checksState = (checks: { name: string; bucket: string }[], required: string[]): ChecksState => {
  const buckets = required.map((name) => checks.find((c) => c.name === name)?.bucket ?? 'missing');
  if (buckets.some((b) => b === 'fail' || b === 'cancel')) return 'fail';
  if (buckets.every((b) => b === 'pass' || b === 'skipping')) return 'pass';
  return 'pending';
};

interface Review {
  author: { login: string };
  state: string;
  submittedAt: string;
}

/** The latest review of someone other than the author is an approval. */
export const approvedByOther = (data: { author?: { login: string }; reviews?: Review[] }): boolean => {
  const author = data.author?.login;
  const latest = new Map<string, Review>();
  for (const r of data.reviews ?? []) {
    if (r.author.login === author) continue;
    const seen = latest.get(r.author.login);
    if (!seen || seen.submittedAt < r.submittedAt) latest.set(r.author.login, r);
  }
  return [...latest.values()].some((r) => r.state === 'APPROVED');
};

/** Comments written after `since` that are not the loop's own block notices: answers to a block. */
export const answersSince = (comments: { created_at: string; body: string }[], since: string, mark: string): number =>
  comments.filter((c) => c.created_at > since && !c.body.startsWith(mark)).length;

/** The type label and the issue Type `.github/LABELS.md` (2. Type label) asks of an issue. */
export const issueKind = (conventionalType: string): { label?: string; type: 'Feature' | 'Bug' | 'Task' } => {
  switch (conventionalType) {
    case 'feat':
      return { label: 'feature', type: 'Feature' };
    case 'fix':
      return { label: 'bug', type: 'Bug' };
    case 'docs':
      return { label: 'documentation', type: 'Task' };
    default:
      return { type: 'Task' };
  }
};

export const numberFromUrl = (url: string): number => {
  const n = Number(url.trim().split('/').pop());
  if (!Number.isInteger(n)) throw new Error(`no number in ${url}`);
  return n;
};

// ---------------------------------------------------------------- network

const reachable = async (url: string): Promise<boolean> => {
  try {
    await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10_000) });
    return true;
  } catch {
    return false;
  }
};

export const networkUp = async (): Promise<boolean> =>
  (await reachable('https://api.anthropic.com')) && (await reachable('https://api.github.com'));

/** Waits until both APIs answer. False when they stay out of reach for `timeoutMs`. */
export const waitForNetwork = async (log: Logger, timeoutMs = 3 * 3600_000, signal?: AbortSignal): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  let nextNote = 0;
  while (!(await networkUp())) {
    if (Date.now() > deadline) return false;
    if (Date.now() >= nextNote) {
      log('network down: waiting for api.anthropic.com and api.github.com');
      nextNote = Date.now() + 600_000;
    }
    await sleep(30_000, signal);
  }
  return true;
};

// ---------------------------------------------------------------- gh

export interface PullRequestInput {
  base: string;
  head: string;
  title: string;
  body: string;
  draft?: boolean;
  labels?: string[];
}

export class GitHub {
  readonly repository: string;
  private readonly log: Logger;

  constructor(repository: string, log: Logger) {
    this.repository = repository;
    this.log = log;
  }

  /** A read made again once the network is back; a write never, since GitHub may have applied it. */
  private async gh(args: string[], { read = false, input }: { read?: boolean; input?: string } = {}): Promise<string> {
    try {
      return await out('gh', args, { input });
    } catch (error) {
      if (!read || !(error instanceof CommandError) || (await networkUp())) throw error;
      if (!(await waitForNetwork(this.log))) throw error;
      return out('gh', args, { input });
    }
  }

  private repo(...args: string[]): string[] {
    return [...args, '--repo', this.repository];
  }

  private graphql(query: string, fields: Record<string, string | number>, read = false): Promise<string> {
    const args = ['api', 'graphql', '-f', `query=${query}`];
    for (const [k, v] of Object.entries(fields)) args.push(typeof v === 'number' ? '-F' : '-f', `${k}=${v}`);
    return this.gh(args, { read });
  }

  // ---- issues

  async createIssue(title: string, body: string, conventionalType: string): Promise<number> {
    const number = numberFromUrl(await this.gh(this.repo('issue', 'create', '--title', title, '--body-file', '-'), { input: body }));
    await this.classifyIssue(number, conventionalType);
    return number;
  }

  /** Type label and issue Type, as `.github/LABELS.md` asks. A failure is logged, not fatal. */
  async classifyIssue(number: number, conventionalType: string): Promise<void> {
    const kind = issueKind(conventionalType);
    try {
      if (kind.label) await this.gh(this.repo('issue', 'edit', String(number), '--add-label', kind.label));
      const [owner, name] = this.repository.split('/') as [string, string];
      const types = JSON.parse(
        await this.graphql('query($o: String!, $n: String!) { repository(owner: $o, name: $n) { issueTypes(first: 20) { nodes { id name } } } }', { o: owner, n: name }, true),
      ) as { data: { repository: { issueTypes: { nodes: { id: string; name: string }[] } } } };
      const typeId = types.data.repository.issueTypes.nodes.find((t) => t.name === kind.type)?.id;
      if (!typeId) return this.log(`no issue type ${kind.type} in ${this.repository}: set the Type of #${number} by hand`);
      await this.graphql('mutation($i: ID!, $t: ID!) { updateIssueIssueType(input: {issueId: $i, issueTypeId: $t}) { issue { number } } }', {
        i: await this.nodeId(number),
        t: typeId,
      });
    } catch (error) {
      this.log(`could not classify #${number}: ${(error as Error).message.split('\n')[0]}`);
    }
  }

  async nodeId(issue: number): Promise<string> {
    return this.gh(this.repo('issue', 'view', String(issue), '--json', 'id', '--jq', '.id'), { read: true });
  }

  async addSubIssue(parent: number, child: number): Promise<void> {
    await this.graphql('mutation($p: ID!, $c: ID!) { addSubIssue(input: {issueId: $p, subIssueId: $c}) { issue { number } } }', {
      p: await this.nodeId(parent),
      c: await this.nodeId(child),
    });
  }

  async editIssueLabels(issue: number | string, { add, remove }: { add?: string; remove?: string }): Promise<void> {
    const args = this.repo('issue', 'edit', String(issue));
    if (add) args.push('--add-label', add);
    if (remove) args.push('--remove-label', remove);
    await this.gh(args).catch(() => undefined);
  }

  async assignMe(issue: number | string): Promise<void> {
    await this.gh(this.repo('issue', 'edit', String(issue), '--add-assignee', '@me')).catch(() => undefined);
  }

  // ---- pull requests

  async createPullRequest(pr: PullRequestInput): Promise<number> {
    const args = this.repo('pr', 'create', '--base', pr.base, '--head', pr.head, '--title', pr.title, '--body-file', '-');
    if (pr.draft) args.push('--draft');
    for (const label of pr.labels ?? []) args.push('--label', label);
    return numberFromUrl(await this.gh(args, { input: pr.body }));
  }

  async editPullRequest(pr: number | string, { base, body }: { base?: string; body?: string }): Promise<void> {
    const args = this.repo('pr', 'edit', String(pr));
    if (base) args.push('--base', base);
    if (body !== undefined) args.push('--body-file', '-');
    await this.gh(args, { input: body });
  }

  async ready(pr: number | string): Promise<void> {
    await this.gh(this.repo('pr', 'ready', String(pr)));
  }

  async comment(pr: number | string, body: string): Promise<void> {
    await this.gh(this.repo('pr', 'comment', String(pr), '--body-file', '-'), { input: body });
  }

  async viewPullRequest<T>(pr: number | string, fields: string[]): Promise<T> {
    return JSON.parse(await this.gh(this.repo('pr', 'view', String(pr), '--json', fields.join(',')), { read: true })) as T;
  }

  async openPullRequestOf(head: string): Promise<number | undefined> {
    const list = JSON.parse(await this.gh(this.repo('pr', 'list', '--head', head, '--state', 'open', '--json', 'number'), { read: true })) as { number: number }[];
    return list[0]?.number;
  }

  async checks(pr: number | string): Promise<{ name: string; bucket: string }[]> {
    // gh exits 8 while checks are pending: read the JSON whatever the code.
    const result = await run('gh', this.repo('pr', 'checks', String(pr), '--json', 'name,bucket'), { allowFailure: true });
    try {
      return JSON.parse(result.stdout) as { name: string; bucket: string }[];
    } catch {
      return [];
    }
  }

  async approvedByOther(pr: number | string): Promise<boolean> {
    return approvedByOther(await this.viewPullRequest(pr, ['author', 'reviews']));
  }

  async answersSince(pr: number | string, since: string, mark: string): Promise<number> {
    const pages = await this.gh(['api', `repos/${this.repository}/issues/${pr}/comments`, '--paginate', '--slurp'], { read: true });
    return answersSince((JSON.parse(pages) as { created_at: string; body: string }[][]).flat(), since, mark);
  }

  // ---- CI runs

  async ciRun(branch: string, sha: string): Promise<string | undefined> {
    const id = await this.gh(
      this.repo('run', 'list', '--branch', branch, '--commit', sha, '--workflow', 'dockerbuild-ci.yml', '--limit', '1', '--json', 'databaseId', '--jq', '.[0].databaseId // empty'),
      { read: true },
    ).catch(() => '');
    return id || undefined;
  }

  async failedLog(runId: string): Promise<string> {
    const result = await run('gh', this.repo('run', 'view', runId, '--log-failed'), { allowFailure: true });
    return result.stdout.split('\n').slice(-400).join('\n');
  }

  async rerunFailed(runId: string): Promise<boolean> {
    return (await run('gh', this.repo('run', 'rerun', runId, '--failed'), { allowFailure: true })).code === 0;
  }

  async runStatus(runId: string): Promise<string> {
    return this.gh(this.repo('run', 'view', runId, '--json', 'status', '--jq', '.status'), { read: true }).catch(() => '');
  }

  // ---- project board

  /** Moves an issue to a status of an organization project (`org/number`). A failure is logged. */
  async moveOnBoard(board: string, issue: number | string, status: string): Promise<void> {
    const [org, number] = board.split('/') as [string, string];
    const [owner, repo] = this.repository.split('/') as [string, string];
    try {
      const data = JSON.parse(
        await this.graphql(
          `query($org: String!, $number: Int!, $owner: String!, $repo: String!, $issue: Int!) {
            organization(login: $org) { projectV2(number: $number) { id
              field(name: "Status") { ... on ProjectV2SingleSelectField { id options { id name } } } } }
            repository(owner: $owner, name: $repo) { issue(number: $issue) { id projectItems(first: 20) { nodes { id project { id } } } } } }`,
          { org, number: Number(number), owner, repo, issue: Number(issue) },
          true,
        ),
      ).data;
      const project = data.organization.projectV2;
      const option = project?.field?.options?.find((o: { name: string }) => o.name === status)?.id;
      let item = data.repository.issue.projectItems.nodes.find((n: { project: { id: string } }) => n.project.id === project?.id)?.id;
      if (project && !item) {
        item = JSON.parse(
          await this.graphql('mutation($p: ID!, $c: ID!) { addProjectV2ItemById(input: {projectId: $p, contentId: $c}) { item { id } } }', {
            p: project.id,
            c: data.repository.issue.id,
          }),
        ).data.addProjectV2ItemById.item.id;
      }
      if (!project || !option || !item) throw new Error('project, status or item not found');
      await this.graphql(
        'mutation($p: ID!, $i: ID!, $f: ID!, $o: String!) { updateProjectV2ItemFieldValue(input: {projectId: $p, itemId: $i, fieldId: $f, value: {singleSelectOptionId: $o}}) { projectV2Item { id } } }',
        { p: project.id, i: item, f: project.field.id, o: option },
      );
    } catch (error) {
      this.log(`board: could not move #${issue} to ${status} (${(error as Error).message.split('\n')[0]})`);
    }
  }
}
