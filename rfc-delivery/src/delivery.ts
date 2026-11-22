// The delivery of one RFC: the loop that builds its chunks one at a time in the worktree, each as
// a stacked pull request, then posts the automated RFC review. BMAD's sprint loop, with the
// tracking files of the private repository as its sprint status.
import { appendFileSync, existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Config } from './config.ts';
import { App, probeServices } from './environment.ts';
import { gitIn, run, sleep, type Git } from './exec.ts';
import { checksState, GitHub } from './github.ts';
import { Stop, type Logger } from './log.ts';
import type { Mode } from './policy.ts';
import { PrivateRepo } from './private.ts';
import { failed, SCHEMAS, Sessions, type ItemOutput, type ReviewOutput, type SpecOutput } from './sessions.ts';
import { none, str, Tracking, type ChunkStatus } from './tracking.ts';
import { Worktree } from './worktree.ts';

const NEEDS_LABEL = 'needs more info';
const BLOCK_MARK = '**RFC delivery blocked**';
const SUBJECT = /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\([a-z0-9._/-]+\))?!?: .+ \(#\d+\)$/;
/** New files are refused outside these trees: a note a session left behind may quote the spec. */
const NEW_FILE_ROOTS = ['apps/', 'bruno/', 'docs/', 'chart/', 'xtm-hub-dev/'];

type WorkflowMode = 'Spec mode' | 'Build mode' | 'CI fix mode' | 'Validation fix mode' | 'Stack fix mode';
const MODE_POLICY: Record<WorkflowMode, Mode> = {
  'Spec mode': 'spec',
  'Build mode': 'write',
  'CI fix mode': 'write',
  'Validation fix mode': 'write',
  'Stack fix mode': 'write',
};

type WorkResult = ItemOutput | { status: 'HOLD'; summary: string };

export interface RunOptions {
  once?: boolean;
  noWait?: boolean;
  dryRun?: boolean;
}

export class Delivery {
  readonly cfg: Config;
  readonly log: Logger;
  readonly tracking: Tracking;
  readonly gh: GitHub;
  readonly private: PrivateRepo;
  readonly wt: Worktree;
  readonly app: App;
  readonly sessions: Sessions;
  readonly abort = new AbortController();
  private readonly repo: Git;

  constructor(cfg: Config, log: Logger) {
    this.cfg = cfg;
    this.log = log;
    this.tracking = new Tracking(cfg.dir);
    const status = this.tracking.status();
    this.gh = new GitHub(status.repository, log);
    this.private = new PrivateRepo(cfg, log, new GitHub(status.private_repository, log), this.tracking);
    this.wt = new Worktree(cfg, log);
    this.app = new App(cfg, log);
    this.sessions = new Sessions(cfg, log, this.abort);
    this.repo = gitIn(cfg.repoRoot);
  }

  // ---------------------------------------------------------------- small accessors

  private get status() {
    return this.tracking.status();
  }

  private requiredChecks(): string[] {
    return this.status.required_checks.split(',').map((s) => s.trim()).filter(Boolean);
  }

  private labels(): string[] {
    return str(this.status.labels).split(',').map((s) => s.trim()).filter(Boolean);
  }

  private boardStatuses(): [string?, string?, string?] {
    return str(this.status.project_statuses).split(',').map((s) => s.trim()) as [string?, string?, string?];
  }

  private async board(id: string, which: 0 | 1 | 2): Promise<void> {
    const board = str(this.status.github_project);
    const target = this.boardStatuses()[which];
    const issue = this.tracking.facts(id).issue;
    if (board && target && !none(issue)) await this.gh.moveOnBoard(board, issue as number, target);
  }

  private file(name: string): string {
    return join(this.cfg.logDir, name);
  }

  private marker(id: string, kind: 'spec-done' | 'blocked' | 'resume'): string {
    return this.file(`${id}.${kind}`);
  }

  private issue(id: string): string {
    return str(this.tracking.facts(id).issue);
  }

  /** The facts every prompt carries: the chunk, the tracking folder, the RFC, the tooling. */
  private context(id: string): string {
    const s = this.status;
    return (
      `chunk ${id} (issue #${this.issue(id)}, slice ${this.tracking.chunk(id).slice}) of ${this.cfg.rfc}. ` +
      `The tracking folder is ${this.cfg.dir}. The RFC: git -C ${this.cfg.flowDir} show ${s.source.sha}:${s.source.path}. ` +
      `The tooling is ${this.cfg.toolDir}: run its cli as node ${this.cfg.toolDir}/cli.mjs.`
    );
  }

  private async session(id: string, mode: WorkflowMode, extra = ''): Promise<ItemOutput> {
    const name = `${id}-${mode.toLowerCase().replaceAll(' ', '-')}`;
    const result = await this.sessions.run<ItemOutput>({
      name,
      prompt: `Read ${this.cfg.toolDir}/WORKFLOW.md fully and follow its ${mode} for ${this.context(id)}${extra ? ` ${extra}` : ''}`,
      schema: mode === 'CI fix mode' ? SCHEMAS.ci : SCHEMAS.item,
      mode: MODE_POLICY[mode],
    });
    const output = result.output ?? failed(`No structured output (${result.error ?? 'timeout or crash'}): see ${join(this.cfg.logDir, `${name}.jsonl`)}.`);
    this.log(`${id}: ${mode} ${output.status}`);
    return output;
  }

  // ---------------------------------------------------------------- preconditions and recovery

  private async signing(git: Git, where: string): Promise<void> {
    if ((await git.out('config', '--get', 'commit.gpgsign').catch(() => '')) !== 'true') throw new Stop(`commit signing is off in ${where} (git config commit.gpgsign true)`);
  }

  private async requireReady(): Promise<void> {
    await this.signing(this.repo, this.cfg.repoRoot);
    await this.private.check();
    await this.private.pull();
    const { errors } = this.tracking.validate();
    if (errors.length) throw new Stop(`the plan does not validate:\n${errors.join('\n')}`);
    await this.wt.ensure(this.status.base);
    await this.signing(this.wt.git, this.cfg.worktree);
    if (!(await this.wt.clean())) {
      const changes = (await this.wt.changes()).map((c) => c.path).slice(0, 20).join('\n');
      throw new Stop(`the worktree ${this.cfg.worktree} has changes no chunk claims:\n${changes}`);
    }
  }

  private lockFile(): string {
    return this.file('run.lock');
  }

  runningPid(): number | undefined {
    if (!existsSync(this.lockFile())) return undefined;
    const pid = Number(readFileSync(this.lockFile(), 'utf8'));
    try {
      process.kill(pid, 0);
      return pid;
    } catch {
      return undefined;
    }
  }

  acquireLock(): void {
    const pid = this.runningPid();
    if (pid && pid !== process.pid) throw new Stop(`a delivery of ${this.cfg.rfc} is already running (pid ${pid})`);
    writeFileSync(this.lockFile(), String(process.pid));
    process.once('exit', () => {
      if (this.runningPid() === process.pid) rmSync(this.lockFile(), { force: true });
    });
  }

  /** A chunk's commit is on its branch when the branch holds a commit ending with its issue. */
  private async committed(id: string): Promise<boolean> {
    const branch = str(this.tracking.facts(id).branch);
    if (!branch || !(await this.wt.hasBranch(branch))) return false;
    const subjects = await this.wt.git.out('log', '--format=%s', `${this.tracking.base(id)}..${branch}`).catch(() => '');
    return subjects.split('\n').some((s) => s.endsWith(`(#${this.issue(id)})`));
  }

  /** After a crash: puts aside the code a running chunk left; puts each chunk's status back in line with its branch. */
  private async recover(): Promise<void> {
    await this.wt.ensure(this.status.base);
    const mergeHead = await this.wt.git.out('rev-parse', '--git-path', 'MERGE_HEAD');
    if (existsSync(resolve(this.cfg.worktree, mergeHead))) throw new Stop(`a merge is in progress in ${this.cfg.worktree}: finish it or run 'git merge --abort' there`);
    for (const { chunk, status } of this.tracking.chunks()) {
      if (status !== 'in-progress' && status !== 'review') continue;
      if (await this.wt.putAside(chunk.id, 'interrupted')) this.log(`${chunk.id}: the changes of an interrupted run put aside`);
      if (status === 'review' && !(await this.committed(chunk.id))) {
        this.tracking.setStatus(chunk.id, 'in-progress');
        this.log(`${chunk.id}: interrupted before its commit, restarting it`);
      } else if (status === 'in-progress' && (await this.committed(chunk.id))) {
        this.tracking.setStatus(chunk.id, 'review');
        rmSync(this.marker(chunk.id, 'spec-done'), { force: true });
        this.log(`${chunk.id}: interrupted after its commit, publishing it`);
      }
    }
  }

  // ---------------------------------------------------------------- stack and pull requests

  private async refreshBodies(): Promise<void> {
    const s = this.status;
    if (!none(s.pull_request)) await this.gh.editPullRequest(s.pull_request as number, { body: this.tracking.publicPrBody() }).catch(() => this.log(`could not update the body of PR #${s.pull_request}`));
    const pr = this.private.pullRequest;
    if (pr) await new GitHub(s.private_repository, this.log).editPullRequest(pr, { body: this.tracking.privatePrBody() }).catch(() => this.log('could not update the tracking PR'));
  }

  /** A pull request a human merged moves its chunk to merged; the chunks above then stack lower. */
  private async syncMerged(): Promise<void> {
    const rfcBranch = str(this.status.branch);
    let changed = false;
    for (const { chunk, status } of this.tracking.chunks()) {
      if (status !== 'done' && status !== 'review') continue;
      const pr = this.tracking.facts(chunk.id).pull_request;
      if (none(pr)) continue;
      const data = await this.gh.viewPullRequest<{ state: string; baseRefName: string }>(pr as number, ['state', 'baseRefName']).catch(() => undefined);
      if (data?.state !== 'MERGED') continue;
      if (data.baseRefName !== rfcBranch)
        throw new Stop(`${chunk.id}: PR #${pr} was merged into ${data.baseRefName}, not the RFC branch ${rfcBranch}. Merge the stack bottom-up into ${rfcBranch}, then run again`);
      this.tracking.setStatus(chunk.id, 'merged');
      this.log(`${chunk.id}: PR #${pr} merged into the RFC branch`);
      changed = true;
    }
    if (!changed) return;
    await this.retarget();
    await this.private.commit('record the merged chunks');
    await this.refreshBodies();
  }

  /** Points each open chunk pull request at the branch it stacks on now. */
  private async retarget(): Promise<void> {
    for (const { chunk, status } of this.tracking.chunks()) {
      const pr = this.tracking.facts(chunk.id).pull_request;
      if (status === 'merged' || none(pr)) continue;
      const want = this.tracking.base(chunk.id);
      const have = (await this.gh.viewPullRequest<{ baseRefName: string }>(pr as number, ['baseRefName']).catch(() => undefined))?.baseRefName;
      if (have && have !== want) {
        await this.gh.editPullRequest(pr as number, { base: want });
        this.log(`${chunk.id}: PR #${pr} now targets ${want}`);
      }
    }
  }

  private async checkoutChunk(id: string): Promise<void> {
    let branch = str(this.tracking.facts(id).branch);
    if (!branch) branch = `issue/${this.issue(id)}`;
    if (await this.wt.hasBranch(branch)) {
      await this.wt.checkout(branch);
    } else {
      const base = this.tracking.base(id);
      await this.wt.createBranch(branch, base);
      this.log(`${id}: branch ${branch} created on ${base}`);
    }
    this.tracking.setFact(id, 'branch', branch);
  }

  private async chunkPrBody(id: string, base: string): Promise<string> {
    const chunk = this.tracking.chunk(id);
    const acs = (chunk.acceptance ?? []).join(', ');
    const { position, of } = this.tracking.position(id);
    const below = base === this.status.branch ? undefined : await this.gh.openPullRequestOf(base).catch(() => undefined);
    const read = (name: string) => (existsSync(this.file(name)) ? readFileSync(this.file(name), 'utf8').trim() : '');
    return [
      `Implements: ${this.cfg.rfc}${acs ? ` (${acs})` : ''}`,
      '',
      `Part of #${this.status.rfc_issue}. Chunk ${position} of ${of} of the stack, slice ${chunk.slice}.${below ? ` Stacked on #${below}: review that one first.` : ''}`,
      '',
      '# Context',
      '',
      read(`${id}-pr-summary.md`),
      '',
      '## How to test',
      '',
      read(`${id}-how-to-test.md`),
      '',
      'Built by `yarn rfc`: a spec, the implementation, the verification and a four-reviewer pass, unattended. The team\'s review decides.',
      '',
      `Related to #${this.issue(id)}`,
    ].join('\n');
  }

  private async publishChunk(id: string): Promise<void> {
    const branch = str(this.tracking.facts(id).branch);
    const base = this.tracking.base(id);
    await this.wt.push(branch);
    const body = await this.chunkPrBody(id, base);
    const pr = this.tracking.facts(id).pull_request;
    if (none(pr)) {
      const number = await this.gh.createPullRequest({ base, head: branch, title: this.tracking.title(id), body, draft: true, labels: this.labels() });
      this.tracking.setFact(id, 'pull_request', number);
      await this.private.commit(`open the pull request of ${id}`);
      this.log(`${id}: opened draft PR #${number} onto ${base}`);
    } else {
      await this.gh.editPullRequest(pr as number, { base, body }).catch(() => this.log(`could not update PR #${pr}`));
    }
    await this.refreshBodies();
  }

  /** Every required check of the pull request's head `sha` passed (true) or one failed (false). */
  private async waitChecks(pr: number | string, sha: string): Promise<boolean> {
    const required = this.requiredChecks();
    const started = Date.now();
    let nextNote = started + 300_000;
    this.log(`waiting for the required checks of PR #${pr} (${required.join(', ')})`);
    for (;;) {
      const head = (await this.gh.viewPullRequest<{ headRefOid: string }>(pr, ['headRefOid']).catch(() => undefined))?.headRefOid;
      const state = head === sha ? checksState(await this.gh.checks(pr), required) : 'pending';
      if (state !== 'pending') return state === 'pass';
      if (Date.now() - started > this.cfg.checksTimeoutMs) throw new Stop(`the required checks of PR #${pr} are still not done after ${Math.round(this.cfg.checksTimeoutMs / 60_000)} minutes`);
      if (Date.now() >= nextNote) {
        this.log(`still waiting for the checks of PR #${pr} after ${Math.round((Date.now() - started) / 60_000)} minutes`);
        nextNote += 300_000;
      }
      await sleep(this.cfg.checksIntervalMs, this.abort.signal);
    }
  }

  private async markDone(id: string, note = ''): Promise<void> {
    const pr = this.tracking.facts(id).pull_request as number;
    this.tracking.setStatus(id, 'done');
    await this.gh.ready(pr).catch(() => this.log(`could not mark PR #${pr} ready`));
    await this.gh.editIssueLabels(this.issue(id), { remove: NEEDS_LABEL });
    await this.board(id, 2);
    await this.private.commit(`${id} done`);
    await this.private.comment(`\`${id}\` done${note}: ${this.status.repository}#${pr} is ready for review.`);
    await this.refreshBodies();
    this.log(`${id} done${note}`);
  }

  // ---------------------------------------------------------------- one chunk

  /** The spec session, the screens of the untouched code, then the build session. */
  private async workChunk(id: string): Promise<WorkResult> {
    const spec = this.tracking.specPath(id);
    if (existsSync(spec) && (this.tracking.statusOf(id) === 'ready-for-dev' || existsSync(this.marker(id, 'spec-done')))) {
      this.log(`${id}: spec ready, resuming at the build`);
    } else {
      const result = await this.sessions.run<SpecOutput>({
        name: `${id}-spec`,
        prompt: `Read ${this.cfg.toolDir}/WORKFLOW.md fully and follow its Spec mode for ${this.context(id)}`,
        schema: SCHEMAS.spec,
        mode: 'spec',
      });
      const output = result.output;
      this.log(`${id} spec: ${output?.status ?? `no output (${result.error ?? 'timeout or crash'})`}`);
      if (!output) return failed(`Spec mode produced no structured output (${result.error ?? 'timeout or crash'}).`);
      if (output.status !== 'DONE') return { ...failed(output.summary), status: output.status, ...(output.question ? { question: output.question } : {}) };
      if (!(await this.wt.clean())) return failed('Spec mode changed files of the worktree: the spec and the screens need the untouched code.');
      const { errors } = this.tracking.checkSpec(id);
      if (errors.length) return failed(`The spec does not meet its contract:\n${errors.join('\n')}`);
      this.tracking.setStatus(id, 'ready-for-dev');
      writeFileSync(this.marker(id, 'spec-done'), '');
      await this.private.commit(`write the spec of ${id}`);
      if (this.tracking.chunk(id).spec_checkpoint) {
        await this.private.comment(`Spec of \`${id}\` written: \`${this.cfg.dirRel}/chunks/${id}.md\`. Set \`approved_by\` in its frontmatter to let the loop build it.`);
        return { status: 'HOLD', summary: 'the spec waits for its approval' };
      }
    }
    if (this.hasScreens(id)) {
      const before = await this.screens(id, 'before');
      if (!before.ok) return failed(`The screens of the spec cannot be captured before the change: see ${before.log}.`);
    }
    this.tracking.setStatus(id, 'in-progress');
    const restored = existsSync(this.marker(id, 'resume')) && (await this.wt.restore(id));
    rmSync(this.marker(id, 'resume'), { force: true });
    if (restored) this.log(`${id}: the code put aside by the earlier attempt brought back`);
    return this.session(
      id,
      'Build mode',
      restored
        ? 'The working tree already holds the changes of an earlier attempt at this chunk, put aside when it stopped. Check them against the spec, keep what is right, and finish the chunk from there.'
        : '',
    );
  }

  private hasScreens(id: string): boolean {
    return !this.cfg.noScreens && this.tracking.screens(id).length > 0;
  }

  private async screens(id: string, phase: 'before' | 'after'): Promise<{ ok: boolean; log: string }> {
    await this.app.ensure();
    const log = this.file(`${id}-${phase}.log`);
    const result = await run('node', [join(this.cfg.toolDir, 'screenshot.mjs'), this.tracking.specPath(id), phase], {
      cwd: this.cfg.worktree,
      env: { ...process.env, RFC_APP_URL: this.app.url },
      allowFailure: true,
    });
    writeFileSync(log, result.stdout + result.stderr);
    return { ok: result.code === 0, log };
  }

  /** The deterministic validation of a change, before it is committed. */
  private async validate(id: string): Promise<{ ok: boolean; log: string }> {
    const log = this.file(`${id}-validate.log`);
    writeFileSync(log, '');
    const note = (line: string) => appendFileSync(log, `${line}\n`);
    const fail = (why: string) => (note(why), { ok: false, log });
    const changes = await this.wt.changes();
    if (!changes.length) return fail('the change is empty');
    const stray = changes.filter((c) => c.untracked && !NEW_FILE_ROOTS.some((root) => c.path.startsWith(root))).map((c) => c.path);
    if (stray.length) return fail(`new files outside ${NEW_FILE_ROOTS.join(', ')}, refused (move or delete them): ${stray.join(' ')}`);
    const touched = (prefix: string) => changes.some((c) => c.path.startsWith(prefix));
    const steps: [string, string, string][] = [];
    if (touched('apps/backend/')) steps.push(['backend', '@xtm-hub/backend', 'test:ci']);
    if (touched('apps/frontend/')) for (const s of ['lint', 'format:check', 'i18n:check', 'check-ts', 'test']) steps.push(['frontend', '@xtm-hub/frontend', s]);
    if (touched('apps/e2e/')) for (const s of ['lint', 'format:check']) steps.push(['e2e', '@xtm-hub/test_e2e', s]);
    for (const [area, ws, script] of steps) {
      this.log(`${id}: validating, ${area} ${script}`);
      const result = await run('yarn', ['workspace', ws, script], { cwd: this.cfg.worktree, allowFailure: true, signal: this.abort.signal });
      note(`$ yarn workspace ${ws} ${script}\n${result.stdout}${result.stderr}`);
      if (result.code !== 0) return fail(`${area} ${script} failed`);
    }
    this.log(`${id}: validating, the spec`);
    const spec = this.tracking.checkSpec(id);
    if (spec.errors.length) return fail(`the spec does not meet its contract:\n${spec.errors.join('\n')}`);
    if (this.hasScreens(id)) {
      this.log(`${id}: validating, the screens after the change`);
      const after = await this.screens(id, 'after');
      if (!after.ok) return fail(`the screens after the change failed: see ${after.log}`);
    }
    return { ok: true, log };
  }

  /** One validation fix session when the validation fails; a question stays a question. */
  private async validateWithFix(id: string, result: ItemOutput): Promise<ItemOutput> {
    const first = await this.validate(id);
    if (first.ok) return result;
    const before = this.file(`${id}-validate-before-fix.log`);
    writeFileSync(before, readFileSync(first.log, 'utf8'));
    this.log(`${id}: the validation failed, one validation fix session (${before})`);
    const fixed = await this.session(id, 'Validation fix mode', `The failing validation log is ${before}.`);
    if (fixed.status !== 'DONE') return fixed;
    const second = await this.validate(id);
    return second.ok ? fixed : failed(`The validation still fails after one fix session: see ${second.log}.`);
  }

  /** Commits a validated result on the chunk's branch. */
  private async commitResult(id: string, result: ItemOutput): Promise<boolean> {
    const issue = this.issue(id);
    const subject = SUBJECT.test(result.commit_subject) && result.commit_subject.endsWith(`(#${issue})`) ? result.commit_subject : this.tracking.title(id);
    const body = result.commit_body
      .split('\n')
      .filter((l) => !/^(co-authored-by|signed-off-by):/i.test(l))
      .join('\n');
    if (await this.wt.clean()) {
      this.log(`${id}: nothing to commit`);
      return false;
    }
    await this.wt.commit(subject, body);
    writeFileSync(this.file(`${id}-pr-summary.md`), result.pr_summary);
    writeFileSync(this.file(`${id}-how-to-test.md`), result.how_to_test);
    this.tracking.setStatus(id, 'review');
    rmSync(this.marker(id, 'spec-done'), { force: true });
    await this.wt.dropPutAside(id);
    await this.board(id, 1);
    await this.private.commit(`build ${id}`);
    this.log(`${id} committed: ${subject}`);
    return true;
  }

  private retryHint(reason: string, id: string): string {
    return reason === 'NEEDS_HUMAN'
      ? `To retry, answer in this pull request or edit \`${this.cfg.dirRel}/chunks/${id}.md\`, then run \`yarn rfc ${this.cfg.rfc}\` again: it retries the chunk once it has an answer.`
      : `Running \`yarn rfc ${this.cfg.rfc}\` again retries the chunk.`;
  }

  /** The question goes to the tracking pull request only, since it may quote the RFC; the public issue gets a label. */
  private async block(id: string, result: ItemOutput | SpecOutput, reason: string): Promise<void> {
    const ref = await this.wt.putAside(id, reason);
    this.tracking.setStatus(id, 'blocked');
    // A question needs its answer in the spec: the next attempt writes it again.
    if (reason === 'NEEDS_HUMAN') rmSync(this.marker(id, 'spec-done'), { force: true });
    writeFileSync(this.marker(id, 'blocked'), `${reason} ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}\n`);
    await this.private.commit(`block ${id}`);
    await this.private.comment(
      [
        `${BLOCK_MARK}: \`${id}\``,
        '',
        `${reason}: ${result.summary}`,
        ...(result.question ? ['', result.question] : []),
        '',
        `Run log: \`${this.cfg.logDir}\`.${ref ? ` The code it wrote is kept on \`${ref}\` (\`git diff HEAD ${ref}\` in the worktree).` : ''} To investigate with the context loaded: \`yarn rfc ${this.cfg.rfc} debug ${id}\`. ${this.retryHint(reason, id)}`,
      ].join('\n'),
    );
    await this.gh.editIssueLabels(this.issue(id), { add: NEEDS_LABEL });
    await this.refreshBodies();
    this.log(`${id} blocked: ${reason}`);
  }

  /** Blocked chunks whose question has no answer yet: no comment since the block, no change to the spec. */
  private async waiting(): Promise<string[]> {
    const pr = this.private.pullRequest;
    const out: string[] = [];
    for (const { chunk, status } of this.tracking.chunks()) {
      const marker = this.marker(chunk.id, 'blocked');
      if (status !== 'blocked' || !existsSync(marker)) continue;
      const [reason, since = ''] = readFileSync(marker, 'utf8').trim().split(' ');
      if (reason !== 'NEEDS_HUMAN') continue;
      const spec = this.tracking.specPath(chunk.id);
      if (existsSync(spec) && statSync(spec).mtimeMs > statSync(marker).mtimeMs) continue;
      const answers = pr ? await new GitHub(this.status.private_repository, this.log).answersSince(pr, since, BLOCK_MARK).catch(() => 0) : 0;
      if (answers > 0) continue;
      out.push(chunk.id);
    }
    return out;
  }

  /** Waits for the checks of a pushed chunk; on a failure, one CI fix session, then a rerun if it is flaky. */
  private async settle(id: string): Promise<void> {
    const pr = this.tracking.facts(id).pull_request as number;
    const branch = str(this.tracking.facts(id).branch);
    await this.wt.checkout(branch);
    if (await this.waitChecks(pr, await this.wt.head())) return this.markDone(id);
    this.log(`${id}: the required checks failed, one CI fix attempt`);
    const runId = await this.gh.ciRun(branch, await this.wt.head());
    const ciLog = this.file(`${id}-ci.log`);
    writeFileSync(ciLog, runId ? await this.gh.failedLog(runId) : 'No CI run found for this commit.');
    let result = await this.session(id, 'CI fix mode', `The failing log is ${ciLog}.`);
    if (result.status === 'FLAKY') {
      const why = result.summary.split('\n')[0];
      if (!(await this.wt.clean())) {
        this.log(`${id}: the CI fix session found the failure flaky but changed files: not rerunning`);
      } else if (runId && (await this.gh.rerunFailed(runId))) {
        this.log(`${id}: the failure is not this chunk's, failed jobs rerun: ${why}`);
        const deadline = Date.now() + 300_000;
        while ((await this.gh.runStatus(runId)) === 'completed' && Date.now() < deadline) await sleep(this.cfg.checksIntervalMs, this.abort.signal);
        if (await this.waitChecks(pr, await this.wt.head())) return this.markDone(id, ` after a rerun of flaky checks (${why})`);
      }
    } else if (result.status === 'DONE') {
      result = await this.validateWithFix(id, result);
    }
    if (result.status === 'DONE' && (await this.commitResult(id, result))) {
      await this.publishChunk(id);
      if (await this.waitChecks(pr, await this.wt.head())) return this.markDone(id, ' after a CI fix');
    }
    await this.block(id, failed(`The required checks fail after one fix attempt. Logs: ${ciLog}.`), 'CI');
    throw new Stop(`${id}: the required checks still fail after a fix attempt: yarn rfc ${this.cfg.rfc} debug ${id}`);
  }

  // ---------------------------------------------------------------- the RFC

  private topBranch(): string {
    const done = this.tracking.chunks().filter((c) => c.status === 'done');
    return str(done.length ? this.tracking.facts(done[done.length - 1]!.chunk.id).branch : this.status.branch);
  }

  private async gate(): Promise<void> {
    const top = this.topBranch();
    const base = this.status.base;
    this.log(`every chunk is done: automated RFC review of origin/${base}...${top}`);
    await this.wt.git.out('fetch', '--quiet', 'origin', base);
    const s = this.status;
    const review = await this.sessions.run<ReviewOutput>({
      name: 'rfc-review',
      prompt:
        `Read ${this.cfg.toolDir}/WORKFLOW.md fully and follow its RFC review mode for ${this.cfg.rfc}. The tracking folder is ${this.cfg.dir}. ` +
        `The RFC: git -C ${this.cfg.flowDir} show ${s.source.sha}:${s.source.path}. The whole change: git diff origin/${base}...${top}.`,
      schema: SCHEMAS.review,
      mode: 'read',
    });
    const findings = review.output?.findings ?? `The automated review produced no output (${review.error ?? 'timeout or crash'}).`;
    const report = [
      `# ${this.cfg.rfc}: automated RFC review`,
      '',
      `${new Date().toISOString().slice(0, 10)}, on \`${top}\` at \`${(await this.wt.git.out('rev-parse', '--short', top)) || '?'}\`.`,
      '',
      findings,
      '',
      '---',
      `To finish this review: \`yarn rfc ${this.cfg.rfc} review\` on the xtm-hub checkout. It walks through these findings with you, fixes what you approve on the right chunk, and closes the RFC.`,
    ].join('\n');
    writeFileSync(join(this.cfg.dir, 'rfc-review.md'), `${report}\n`);
    this.tracking.setField('rfc_status', 'review');
    await this.private.commit(`post the automated review of ${this.cfg.rfc}`);
    await this.private.comment(report);
    if (!none(s.pull_request))
      await this.gh
        .comment(s.pull_request as number, 'Every chunk of the stack is built and its checks pass. The RFC review is in progress; review the chunk pull requests from the bottom of the stack up.')
        .catch(() => undefined);
    await this.refreshBodies();
    this.log(`${this.cfg.rfc} is ready for its review: yarn rfc ${this.cfg.rfc} review`);
  }

  /** The loop starts once someone other than its author approved the tracking pull request. */
  private async approve(): Promise<void> {
    const pr = this.private.pullRequest;
    if (!pr) throw new Stop(`no tracking pull request yet: run 'yarn rfc ${this.cfg.rfc} start'`);
    if (!(await new GitHub(this.status.private_repository, this.log).approvedByOther(pr)))
      throw new Stop(`the plan waits for the team: approve the tracking PR ${this.status.private_repository}#${pr} (someone other than its author)`);
    this.tracking.setField('rfc_status', 'in-progress');
    await this.private.commit('start the loop: plan approved');
    await this.refreshBodies();
    this.log(`plan approved on the tracking PR #${pr}: the loop starts`);
  }

  // ---------------------------------------------------------------- the loop

  async loop(options: RunOptions = {}): Promise<void> {
    if (!options.dryRun) {
      this.acquireLock();
      await this.recover();
    }
    for (;;) {
      if (!options.dryRun) {
        await this.requireReady();
        await this.syncMerged();
      }
      const waiting = await this.waiting();
      const next = this.tracking.next(waiting);
      if (options.dryRun) {
        if (waiting.length) process.stdout.write(`waiting for an answer: ${waiting.join(',')}\n`);
        process.stdout.write(`next: ${next.action} ${'chunk' in next ? next.chunk : '-'} ${'detail' in next ? next.detail : '-'}\n`);
        return;
      }
      switch (next.action) {
        case 'approve':
          await this.approve();
          continue;
        case 'end':
          return this.log(`${this.cfg.rfc} is delivered`);
        case 'hold':
          return this.log(`${this.cfg.rfc} waits for its review: yarn rfc ${this.cfg.rfc} review`);
        case 'gate':
          return this.gate();
        case 'wait':
          return this.log(`${next.chunk} waits for an answer on the tracking PR #${this.private.pullRequest}`);
        case 'hold-spec':
          return this.log(`${next.chunk}: its spec waits for approved_by in ${this.cfg.dirRel}/chunks/${next.chunk}.md`);
        case 'stuck':
          throw new Stop(`${next.chunk} depends on ${next.detail}, which is not done: build it or set it done by hand`);
        case 'ci':
          if (options.noWait) return;
          await this.publishChunk(next.chunk);
          await this.settle(next.chunk);
          break;
        case 'run':
          if (await this.runChunk(next.chunk, options)) return;
          break;
      }
      if (options.once) return;
    }
  }

  /** Builds one chunk. True when the loop must stop here (a spec waiting for its approval). */
  private async runChunk(id: string, options: RunOptions): Promise<boolean> {
    if (this.tracking.statusOf(id) === 'blocked') {
      this.log(`${id} was blocked: retrying it`);
      rmSync(this.marker(id, 'blocked'), { force: true });
      writeFileSync(this.marker(id, 'resume'), '');
      if (await this.committed(id)) {
        this.tracking.setStatus(id, 'review');
        return false;
      }
    }
    if (!this.issue(id)) throw new Stop(`${id} has no issue yet: run 'yarn rfc ${this.cfg.rfc} issues' first`);
    await probeServices(this.cfg);
    await this.checkoutChunk(id);
    await this.board(id, 0);
    await this.gh.assignMe(this.issue(id));
    if (this.tracking.statusOf(id) !== 'ready-for-dev') this.tracking.setStatus(id, 'in-progress');
    await this.private.commit(`start ${id}`);
    this.log(`== ${id} (issue #${this.issue(id)}, on ${this.tracking.base(id)})`);
    let result = await this.workChunk(id);
    if (result.status === 'HOLD') {
      this.log(`${id}: spec written, waiting for its approval`);
      return true;
    }
    if (result.status === 'DONE') result = await this.validateWithFix(id, result);
    const outcome = result.status === 'DONE' ? ((await this.commitResult(id, result)) ? 'DONE' : 'nothing to commit') : result.status;
    if (outcome !== 'DONE') {
      await this.block(id, result, outcome);
      throw new Stop(`${id} blocked (${outcome}): yarn rfc ${this.cfg.rfc} debug ${id}. ${this.retryHint(outcome, id).replaceAll('`', '')}`);
    }
    if (!options.noWait) {
      await this.publishChunk(id);
      await this.settle(id);
    }
    return false;
  }

  // ---------------------------------------------------------------- commands around the loop

  /** The RFC issue and one sub-issue per chunk of this repository. Titles only: the public issues cite the RFC by id. */
  async createIssues(confirm: (lines: string[]) => Promise<boolean>): Promise<void> {
    const s = this.status;
    const todo = this.tracking.chunks().filter((c) => none(this.tracking.facts(c.chunk.id).issue));
    const lines = [...(none(s.rfc_issue) ? [`${s.public_title} (the RFC)`] : []), ...todo.map((c) => this.tracking.title(c.chunk.id))];
    if (!lines.length) return this.log('every issue exists');
    if (!(await confirm(lines))) return;
    let rfcIssue = s.rfc_issue as number;
    if (none(s.rfc_issue)) {
      rfcIssue = await this.gh.createIssue(str(s.public_title), `Implements: ${this.cfg.rfc}. Delivered as a stack of pull requests, one sub-issue per chunk.`, str(s.public_title).replace(/[(:!].*/, ''));
      this.tracking.setField('rfc_issue', rfcIssue);
      this.log(`#${rfcIssue} the RFC`);
    }
    for (const { chunk } of todo) {
      const acs = (chunk.acceptance ?? []).join(', ');
      const number = await this.gh.createIssue(this.tracking.title(chunk.id), `Part of #${rfcIssue}. Implements: ${this.cfg.rfc} (${chunk.slice}${acs ? `; ${acs}` : ''}).`, chunk.type ?? 'feat');
      await this.gh.addSubIssue(rfcIssue, number).catch(() => this.log(`could not attach #${number} to #${rfcIssue}`));
      this.tracking.setFact(chunk.id, 'issue', number);
      this.log(`#${number} ${this.tracking.title(chunk.id)}`);
    }
    await this.private.commit(`create the issues of ${this.cfg.rfc}`);
  }

  /** The RFC branch with one empty signed commit, its draft pull request onto the base, and the tracking pull request. Idempotent. */
  async start(): Promise<void> {
    const s = this.status;
    if (none(s.rfc_issue)) throw new Stop(`no RFC issue yet: run 'yarn rfc ${this.cfg.rfc} issues' first`);
    await this.signing(this.repo, this.cfg.repoRoot);
    const branch = none(s.branch) ? `issue/${s.rfc_issue}` : str(s.branch);
    this.tracking.setField('branch', branch);
    if (!(await this.repo.ok('ls-remote', '--exit-code', '--heads', 'origin', branch))) {
      // GitHub opens no pull request without a commit between the branches. No checkout: the trusted checkout stays where it is.
      await this.repo.out('fetch', '--quiet', 'origin', s.base);
      const commit = await this.repo.out(
        'commit-tree', '-S', '-p', `origin/${s.base}`,
        '-m', `chore: start the delivery of ${this.cfg.rfc} (#${s.rfc_issue})`,
        '-m', `Chunks land here as stacked pull requests; this pull request brings them to ${s.base}.`,
        `origin/${s.base}^{tree}`,
      );
      await this.repo.out('push', '--quiet', 'origin', `${commit}:refs/heads/${branch}`);
      this.log(`branch ${branch} created on origin/${s.base}`);
    }
    if (none(s.pull_request)) {
      const pr = await this.gh.createPullRequest({ base: s.base, head: branch, title: `${s.public_title} (#${s.rfc_issue})`, body: this.tracking.publicPrBody(), draft: true, labels: this.labels() });
      this.tracking.setField('pull_request', pr);
      this.log(`opened draft PR #${pr}: ${branch} onto ${s.base}`);
    }
    await this.private.commit(`plan the delivery of ${this.cfg.rfc}`);
    if (!this.private.pullRequest) {
      const pr = await new GitHub(s.private_repository, this.log).createPullRequest({
        base: 'main',
        head: s.private_branch,
        title: `docs(rfc-delivery): plan the delivery of ${this.cfg.rfc}`,
        body: this.tracking.privatePrBody(),
      });
      this.tracking.setField('private_pull_request', pr);
      await this.private.commit('link the tracking pull request');
      this.log(`opened the tracking PR ${s.private_repository}#${pr}: the team reviews the split there`);
    }
    await this.wt.ensure(s.base);
    await this.refreshBodies();
  }

  /**
   * Carries a fix of a lower chunk into the chunks above it (or every chunk): merges, never
   * rebases, so the reviews keep their place. A conflict gets one Stack fix session. Each chunk
   * that moved goes back to review: the loop waits for its checks again.
   */
  async restack(from?: string): Promise<void> {
    this.acquireLock();
    await this.requireReady();
    if (from && !this.tracking.chunks().some((c) => c.chunk.id === from)) throw new Stop(`no chunk ${from} in ${this.cfg.rfc}`);
    await this.syncMerged();
    const git = this.wt.git;
    await git.out('fetch', '--quiet', 'origin');
    let started = !from;
    for (const { chunk, status } of this.tracking.chunks()) {
      if (chunk.id === from) started = true;
      if (!started || status === 'merged') continue;
      const branch = str(this.tracking.facts(chunk.id).branch);
      if (!branch) continue;
      if (!(await this.wt.hasBranch(branch))) await git.out('branch', '--quiet', branch, `origin/${branch}`);
      const base = this.tracking.base(chunk.id);
      await this.wt.checkout(branch);
      await git.ok('merge', '--ff-only', '--quiet', `origin/${branch}`);
      const remoteAhead = (await git.ok('rev-parse', '--verify', '--quiet', `origin/${base}`)) && !(await git.ok('merge-base', '--is-ancestor', `origin/${base}`, base).catch(() => false));
      const baseRef = remoteAhead || !(await this.wt.hasBranch(base)) ? `origin/${base}` : base;
      if (!(await git.ok('merge-base', '--is-ancestor', baseRef, 'HEAD'))) {
        if (!(await git.ok('merge', '--quiet', '--no-edit', baseRef))) {
          const conflicted = (await git.out('diff', '--name-only', '--diff-filter=U')).split('\n').filter(Boolean);
          if (!conflicted.length) {
            await git.ok('merge', '--abort');
            throw new Stop(`${chunk.id}: merging ${base} failed`);
          }
          this.log(`${chunk.id}: merging ${base} conflicts in ${conflicted.join(' ')}: one Stack fix session`);
          const result = await this.session(chunk.id, 'Stack fix mode', `The conflicted files: ${conflicted.join(' ')}.`);
          const markers = await run('grep', ['-lE', '^(<<<<<<<|>>>>>>>)( |$)', ...conflicted], { cwd: this.cfg.worktree, allowFailure: true });
          if (result.status !== 'DONE' || markers.code === 0) {
            await git.ok('merge', '--abort');
            throw new Stop(`${chunk.id}: the conflicts with ${base} need a human (in ${this.cfg.worktree})`);
          }
          await git.out('add', '-A');
          await git.out('commit', '--quiet', '--no-edit');
        }
        this.log(`${chunk.id}: ${base} merged in`);
      }
      const remote = await git.out('rev-parse', '--verify', '--quiet', `origin/${branch}`).catch(() => '');
      if ((await this.wt.head()) === remote) continue;
      await this.wt.push(branch);
      const pr = this.tracking.facts(chunk.id).pull_request;
      if (!none(pr)) await this.gh.editPullRequest(pr as number, { base }).catch(() => undefined);
      if (status === 'done') this.tracking.setStatus(chunk.id, 'review');
      this.log(`${chunk.id}: pushed, back to review`);
    }
    await this.private.commit(`restack ${this.cfg.rfc}`);
    await this.refreshBodies();
    this.log(`restacked: run yarn rfc ${this.cfg.rfc} to wait for the checks again`);
  }

  /** Retries a blocked or interrupted chunk from the code it put aside. */
  async resume(id: string | undefined, options: RunOptions): Promise<void> {
    const target = id ?? this.tracking.chunks().find((c) => c.status === 'blocked' || c.status === 'in-progress')?.chunk.id;
    if (!target) throw new Stop('nothing to resume: no chunk is blocked or in progress');
    if (await this.wt.putAsideRef(target)) {
      writeFileSync(this.marker(target, 'resume'), '');
      this.log(`${target}: resuming from the code it put aside`);
    }
    rmSync(this.marker(target, 'blocked'), { force: true });
    await this.loop(options);
  }

  /** After a change by hand in the worktree: pushes the chunk branches and rewrites the bodies. */
  async publish(): Promise<void> {
    this.acquireLock();
    for (const { chunk } of this.tracking.chunks()) {
      const branch = str(this.tracking.facts(chunk.id).branch);
      if (!branch || !(await this.wt.hasBranch(branch))) continue;
      await this.wt.push(branch).catch(() => this.log(`could not push ${chunk.id}`));
    }
    await this.private.commit(`publish ${this.cfg.rfc} by hand`);
    await this.refreshBodies();
    this.log(`published: yarn rfc ${this.cfg.rfc} waits for the checks of the chunks in review`);
  }

  statusReport(): string {
    const counts = new Map<ChunkStatus, number>();
    for (const { status } of this.tracking.chunks()) counts.set(status, (counts.get(status) ?? 0) + 1);
    const next = this.tracking.next();
    return [
      ...[...counts].map(([status, n]) => `${String(n).padStart(3)} ${status}`),
      `rfc_status: ${this.status.rfc_status ?? 'planning'}`,
      `worktree: ${this.cfg.worktree}${existsSync(this.cfg.worktree) ? '' : ' (not created yet)'}`,
      `next: ${next.action} ${'chunk' in next ? next.chunk : ''}`.trim(),
    ].join('\n');
  }

  /**
   * An interactive Claude Code session in the worktree, for a human: debug, feedback, review.
   * Without a terminal (run by an agent, the run-rfc skill), prints the brief instead: the calling
   * session follows it itself rather than opening a session inside its own.
   */
  async interactive(doc: string, prompt: string): Promise<number> {
    const pid = this.runningPid();
    if (pid) throw new Stop(`a delivery of ${this.cfg.rfc} is running (pid ${pid}): let it stop first`);
    await this.wt.ensure(this.status.base);
    const s = this.status;
    const full = `Read ${doc} fully and follow it. ${prompt} The worktree of the RFC is ${this.cfg.worktree}, the tracking folder ${this.cfg.dir}, the RFC is git -C ${this.cfg.flowDir} show ${s.source.sha}:${s.source.path}, the run logs are in ${this.cfg.logDir}, the tooling in ${this.cfg.toolDir}.`;
    if (!process.stdin.isTTY) {
      process.stdout.write(`${full}\n`);
      return 0;
    }
    const result = await run('claude', ['--add-dir', this.cfg.dir, '--add-dir', this.cfg.flowDir, '--add-dir', this.cfg.toolDir, full], { cwd: this.cfg.worktree, inherit: true, allowFailure: true });
    return result.code;
  }
}
