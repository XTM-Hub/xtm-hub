// The worktree of one RFC: a checkout of its own, next to the trusted one, where the loop checks
// out each chunk branch and the sessions write the code. The trusted checkout stays free and keeps
// the tooling, whatever branch the worktree is on.
import { appendFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Config } from './config.ts';
import { gitIn, run, type Git } from './exec.ts';
import { Stop, type Logger } from './log.ts';

/** Gitignored files the worktree needs from the trusted checkout, relative to the root. */
const LOCAL_FILES = ['apps/backend/config/local.json'];

export class Worktree {
  readonly path: string;
  readonly git: Git;
  private readonly cfg: Config;
  private readonly log: Logger;
  private readonly repo: Git;

  constructor(cfg: Config, log: Logger) {
    this.cfg = cfg;
    this.log = log;
    this.path = cfg.worktree;
    this.git = gitIn(cfg.worktree);
    this.repo = gitIn(cfg.repoRoot);
  }

  /** Creates the worktree on first use, with its dependencies installed; checks it on the next ones. */
  async ensure(base: string): Promise<void> {
    if (existsSync(this.path)) {
      const common = await this.git.out('rev-parse', '--path-format=absolute', '--git-common-dir').catch(() => '');
      const ours = await this.repo.out('rev-parse', '--path-format=absolute', '--git-common-dir');
      if (resolve(common) !== resolve(ours)) throw new Stop(`${this.path} exists and is not a worktree of ${this.cfg.repoRoot}: move it, or set RFC_WORKTREE`);
      return;
    }
    this.log(`creating the worktree ${this.path} on origin/${base}`);
    await this.repo.out('fetch', '--quiet', 'origin', base);
    mkdirSync(dirname(this.path), { recursive: true });
    await this.repo.out('worktree', 'add', '--quiet', '--detach', this.path, `origin/${base}`);
    for (const file of LOCAL_FILES) {
      const from = join(this.cfg.repoRoot, file);
      if (existsSync(from)) copyFileSync(from, join(this.path, file));
    }
    await this.install();
  }

  /** Dependencies, then the gitignored files the frontend type check needs. */
  async install(): Promise<void> {
    const logFile = join(this.cfg.logDir, 'worktree-install.log');
    this.log(`installing the dependencies of the worktree (${logFile})`);
    for (const args of [['install', '--immutable'], ['workspace', '@xtm-hub/frontend', 'next', 'typegen']]) {
      const result = await run('yarn', args, { cwd: this.path, allowFailure: true });
      appendFileSync(logFile, `$ yarn ${args.join(' ')}\n${result.stdout}${result.stderr}\n`);
      if (result.code !== 0) throw new Stop(`yarn ${args.join(' ')} failed in the worktree: see ${logFile}`);
    }
  }

  /** Changed and untracked paths, relative to the root. */
  async changes(): Promise<{ path: string; untracked: boolean }[]> {
    const lines = (await this.git.out('status', '--porcelain', '--untracked-files=all')).split('\n').filter(Boolean);
    return lines.map((l) => ({ path: l.slice(3).split(' -> ').pop() as string, untracked: l.startsWith('??') }));
  }

  async clean(): Promise<boolean> {
    return (await this.changes()).length === 0;
  }

  async branch(): Promise<string> {
    return this.git.out('branch', '--show-current');
  }

  async head(): Promise<string> {
    return this.git.out('rev-parse', 'HEAD');
  }

  async hasBranch(name: string): Promise<boolean> {
    return this.git.ok('rev-parse', '--verify', '--quiet', `refs/heads/${name}`);
  }

  async checkout(branch: string): Promise<void> {
    if ((await this.branch()) !== branch) await this.git.out('checkout', '--quiet', branch);
  }

  /** A new branch on top of `origin/<base>`, fetched first: the base may have moved. */
  async createBranch(branch: string, base: string): Promise<void> {
    await this.git.out('fetch', '--quiet', 'origin', base);
    await this.git.out('checkout', '--quiet', '-b', branch, `origin/${base}`);
  }

  /** Commits everything, signed as the git configuration says. */
  async commit(subject: string, body: string): Promise<void> {
    await this.git.out('add', '-A');
    await this.git.out('commit', '--quiet', '-m', subject, ...(body.trim() ? ['-m', body] : []));
  }

  async push(branch: string): Promise<void> {
    await this.git.out('push', '--quiet', 'origin', `${branch}:${branch}`);
  }

  // ---- code put aside when a chunk stops

  private ref(id: string): string {
    return `refs/rfc-delivery/${this.cfg.rfc}/${id}`;
  }

  async putAsideRef(id: string): Promise<string | undefined> {
    return (await this.git.ok('rev-parse', '--verify', '--quiet', this.ref(id))) ? this.ref(id) : undefined;
  }

  /**
   * Keeps the uncommitted change of a chunk on a ref of its own (not the stash the developer
   * shares), then cleans the worktree. Returns the ref, or nothing when there was no change.
   */
  async putAside(id: string, why: string): Promise<string | undefined> {
    if (await this.clean()) return undefined;
    await this.git.out('add', '-A');
    const tree = await this.git.out('write-tree');
    const commit = await this.git.out('commit-tree', '--no-gpg-sign', '-p', 'HEAD', '-m', `rfc-delivery: ${id} put aside (${why})`, tree);
    await this.git.out('update-ref', this.ref(id), commit);
    await this.git.out('reset', '--quiet', '--hard', 'HEAD');
    await this.git.out('clean', '--quiet', '-fd');
    return this.ref(id);
  }

  /** Brings back the change put aside for a chunk, uncommitted. False when there is none. */
  async restore(id: string): Promise<boolean> {
    const ref = await this.putAsideRef(id);
    if (!ref) return false;
    const patch = await run('git', ['diff', '--binary', 'HEAD', ref], { cwd: this.path });
    if (patch.stdout.trim()) {
      const applied = await run('git', ['apply', '--3way', '--whitespace=nowarn'], { cwd: this.path, input: patch.stdout, allowFailure: true });
      if (applied.code !== 0) throw new Stop(`${id}: the code put aside (${ref}) does not apply on ${await this.branch()}: apply it by hand (git diff HEAD ${ref})`);
      await this.git.out('reset', '--quiet'); // --3way stages: keep the change unstaged, as it was
    }
    await this.git.out('update-ref', '-d', ref);
    return true;
  }

  async dropPutAside(id: string): Promise<void> {
    if (await this.putAsideRef(id)) await this.git.out('update-ref', '-d', this.ref(id));
  }
}
