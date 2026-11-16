// What a chunk needs around it: the services of the backend tests, and for the screens the API
// and the frontend running the worktree's code.
import { spawn } from 'node:child_process';
import { openSync, realpathSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join, relative, isAbsolute } from 'node:path';
import type { Config } from './config.ts';
import { ok, out, run, sleep } from './exec.ts';
import { Stop, type Logger } from './log.ts';

const portOpen = (host: string, port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: 3000 });
    socket.once('connect', () => (socket.destroy(), resolve(true)));
    socket.once('timeout', () => (socket.destroy(), resolve(false)));
    socket.once('error', () => resolve(false));
  });

const answers = async (url: string): Promise<boolean> => {
  try {
    await fetch(url, { signal: AbortSignal.timeout(10_000) });
    return true;
  } catch {
    return false;
  }
};

/** The PostgreSQL, S3 and other services of the backend tests, and the extra probes. */
export const probeServices = async (cfg: Config): Promise<void> => {
  for (const service of cfg.services) {
    const [host, port] = service.split(':') as [string, string];
    if (!(await portOpen(host, Number(port))))
      throw new Stop(`nothing answers on ${service}: start the stack (docker compose -f xtm-hub-dev/docker-compose.yml up -d)`);
  }
  for (const probe of cfg.probes) {
    if (!(await ok('bash', ['-c', probe]))) throw new Stop(`environment probe failed: ${probe}`);
  }
};

/** The working directory of the process listening on a port, if any. */
const listenerCwd = async (port: number): Promise<string | undefined> => {
  const pid = (await out('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN']).catch(() => '')).split('\n')[0];
  if (!pid) return undefined;
  const cwd = (await out('lsof', ['-a', '-p', pid, '-d', 'cwd', '-Fn']).catch(() => '')).split('\n').find((l) => l.startsWith('n'));
  return cwd?.slice(1);
};

const within = (path: string, root: string): boolean => {
  const rel = relative(realpathSync(root), realpathSync(path));
  return !rel.startsWith('..') && !isAbsolute(rel);
};

export class App {
  private readonly cfg: Config;
  private readonly log: Logger;
  private readonly started: number[] = [];

  constructor(cfg: Config, log: Logger) {
    this.cfg = cfg;
    this.log = log;
  }

  get url(): string {
    return `http://localhost:${this.cfg.appPort}`;
  }

  /**
   * The API and the frontend of the worktree, for the screens. A server on those ports running
   * another checkout serves other code: the run stops rather than capture it.
   */
  async ensure(): Promise<void> {
    await this.serve(this.cfg.apiPort, `http://localhost:${this.cfg.apiPort}/health`, 'api', ['workspace', '@xtm-hub/backend', 'tsx', 'src/index.ts'], {
      LOCAL_DEV: 'true',
      // Not a test environment: the API must not rewrite apps/frontend/schema.graphql.
      NODE_ENV: 'development',
    });
    await this.serve(this.cfg.appPort, `${this.url}/login`, 'frontend', ['workspace', '@xtm-hub/frontend', 'next', 'dev', '--turbopack', '-p', String(this.cfg.appPort)], {});
    for (let attempt = 1; attempt <= 3; attempt++) {
      const preflight = await run('node', [join(this.cfg.toolDir, 'screenshot.mjs'), '--preflight'], {
        cwd: this.cfg.worktree,
        env: { ...process.env, RFC_APP_URL: this.url },
        allowFailure: true,
      });
      if (preflight.code === 0) return;
      this.log(`screenshot preflight failed (try ${attempt} of 3): ${preflight.stderr.trim().split('\n').pop() ?? ''}`);
      if (attempt < 3) await sleep(20_000);
    }
    throw new Stop('screenshots cannot run (Chromium: yarn workspace @xtm-hub/test_e2e playwright install chromium)');
  }

  private async serve(port: number, probe: string, name: string, args: string[], env: Record<string, string>): Promise<void> {
    const cwd = await listenerCwd(port);
    if (cwd) {
      if (within(cwd, this.cfg.worktree)) return;
      throw new Stop(`the ${name} on :${port} runs from ${cwd}, not from the worktree ${this.cfg.worktree}: stop it, the screens need the chunk's code`);
    }
    const logFile = join(this.cfg.logDir, `${name}.log`);
    this.log(`starting the ${name} of the worktree on :${port} (${logFile})`);
    const fd = openSync(logFile, 'a');
    const child = spawn('yarn', args, { cwd: this.cfg.worktree, env: { ...process.env, ...env }, detached: true, stdio: ['ignore', fd, fd] });
    child.unref();
    if (child.pid) this.started.push(child.pid);
    const deadline = Date.now() + 300_000;
    while (!(await answers(probe))) {
      if (Date.now() > deadline) throw new Stop(`the ${name} did not start on :${port}: see ${logFile}`);
      await sleep(5000);
    }
  }

  /** Stops what this run started. */
  stop(): void {
    for (const pid of this.started.splice(0)) {
      try {
        process.kill(-pid, 'SIGTERM');
      } catch {
        // already gone
      }
    }
  }
}
