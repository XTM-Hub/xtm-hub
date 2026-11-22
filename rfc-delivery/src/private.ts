// The tracking branch in xtm-hub-private: every state change is committed and pushed, so the
// tracking pull request always shows where the delivery stands.
import type { Config } from './config.ts';
import { gitIn, type Git } from './exec.ts';
import type { GitHub } from './github.ts';
import { Stop, type Logger } from './log.ts';
import { none, type Tracking } from './tracking.ts';

export class PrivateRepo {
  readonly git: Git;
  private readonly cfg: Config;
  private readonly log: Logger;
  private readonly gh: GitHub;
  private readonly tracking: Tracking;

  constructor(cfg: Config, log: Logger, gh: GitHub, tracking: Tracking) {
    this.cfg = cfg;
    this.log = log;
    this.gh = gh;
    this.tracking = tracking;
    this.git = gitIn(cfg.privateDir);
  }

  private get branch(): string {
    return this.tracking.status().private_branch;
  }

  get pullRequest(): string | undefined {
    const pr = this.tracking.status().private_pull_request;
    return none(pr) ? undefined : String(pr);
  }

  /** Commits the RFC folder and pushes it; takes the team's commits first when the push is refused. */
  async commit(what: string): Promise<void> {
    await this.git.out('add', '-A', '--', this.cfg.dirRel);
    if (await this.git.ok('diff', '--cached', '--quiet')) return;
    await this.git.out('commit', '--quiet', '-m', `docs(rfc-delivery): ${what} (${this.cfg.rfc})`);
    if (await this.git.ok('push', '--quiet', 'origin', `HEAD:${this.branch}`)) return;
    if (!((await this.git.ok('pull', '--quiet', '--rebase', 'origin', this.branch)) && (await this.git.ok('push', '--quiet', 'origin', `HEAD:${this.branch}`))))
      throw new Stop(`could not push ${this.branch} of ${this.cfg.privateDir}: resolve it by hand, then run again`);
  }

  /** The team edits the tracking branch too: answers in a spec, `approved_by`. */
  async pull(): Promise<void> {
    if (!(await this.git.ok('ls-remote', '--exit-code', '--heads', 'origin', this.branch))) return;
    if (!(await this.git.ok('pull', '--quiet', '--ff-only', 'origin', this.branch)))
      throw new Stop(`${this.cfg.privateDir} cannot fast-forward ${this.branch}: resolve it by hand`);
  }

  /** Ready to commit: signing on, on the tracking branch, nothing changed outside the RFC folder. */
  async check(): Promise<void> {
    if ((await this.git.out('config', '--get', 'commit.gpgsign').catch(() => '')) !== 'true') throw new Stop(`commit signing is off in ${this.cfg.privateDir}`);
    if ((await this.git.out('branch', '--show-current')) !== this.branch) throw new Stop(`${this.cfg.privateDir} is not on ${this.branch}`);
    const dirty = (await this.git.out('status', '--porcelain', '--untracked-files=all'))
      .split('\n')
      .filter((l) => l && !l.slice(3).startsWith(`${this.cfg.dirRel}/`));
    if (dirty.length) throw new Stop(`${this.cfg.privateDir} has changes outside ${this.cfg.dirRel}:\n${dirty.join('\n')}`);
  }

  async comment(body: string): Promise<void> {
    const pr = this.pullRequest;
    if (!pr) return;
    await this.gh.comment(pr, body).catch((e: Error) => this.log(`could not comment on the tracking PR: ${e.message.split('\n')[0]}`));
  }
}
