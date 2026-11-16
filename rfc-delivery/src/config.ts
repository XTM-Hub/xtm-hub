// Where everything is, resolved once per run.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Stop } from './log.ts';

/** The rfc-delivery folder of the checkout this code runs from. */
export const TOOL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const RFC_ID = /^RFC-[A-Z]+-\d+$/;

export interface Config {
  rfc: string;
  /** The trusted checkout the tool runs from: its `.claude` (settings, agents, skills) rules every session. */
  repoRoot: string;
  toolDir: string;
  /** The xtm-hub-private checkout and the RFC's tracking folder in it. */
  privateDir: string;
  dirRel: string;
  dir: string;
  flowDir: string;
  /** Run logs, transcripts and screenshots: under the git directory, never committed. */
  logDir: string;
  /** The worktree where the chunks are built, one per RFC. */
  worktree: string;
  sessionTimeoutMs: number;
  checksTimeoutMs: number;
  checksIntervalMs: number;
  budgetUsd: number | undefined;
  model: string | undefined;
  appPort: number;
  apiPort: number;
  noScreens: boolean;
  /** host:port of the services the backend tests need. */
  services: string[];
  /** Extra health commands, run before each chunk. */
  probes: string[];
}

const absolute = (path: string, from: string): string => resolve(from, path);
const number = (value: string | undefined, fallback: number): number =>
  value !== undefined && /^\d+$/.test(value) ? Number(value) : fallback;

export const loadConfig = (rfc: string, env: NodeJS.ProcessEnv = process.env): Config => {
  if (!RFC_ID.test(rfc)) throw new Stop(`not an RFC id: ${rfc} (RFC-XHUB-0001)`);
  const git = (...args: string[]) => execFileSync('git', args, { cwd: TOOL_DIR, encoding: 'utf8' }).trim();
  const repoRoot = git('rev-parse', '--show-toplevel');
  const commonDir = git('rev-parse', '--path-format=absolute', '--git-common-dir');
  const parent = dirname(repoRoot);
  const privateDir = absolute(env.RFC_PRIVATE_DIR ?? '../xtm-hub-private', repoRoot);
  const flowDir = absolute(env.RFC_FLOW_DIR ?? '../filigran-flow', repoRoot);
  for (const [name, path] of [['xtm-hub-private', privateDir], ['filigran-flow', flowDir]] as const) {
    if (!existsSync(path)) throw new Stop(`no ${name} checkout at ${path}: clone it there or set RFC_${name === 'filigran-flow' ? 'FLOW' : 'PRIVATE'}_DIR`);
  }
  const dirRel = join('rfc-delivery', rfc);
  const logDir = join(commonDir, 'rfc-delivery', rfc);
  mkdirSync(logDir, { recursive: true });
  return {
    rfc,
    repoRoot,
    toolDir: TOOL_DIR,
    privateDir,
    dirRel,
    dir: join(privateDir, dirRel),
    flowDir,
    logDir,
    worktree: env.RFC_WORKTREE ? absolute(env.RFC_WORKTREE, repoRoot) : join(parent, `${basename(repoRoot)}-${rfc.toLowerCase()}`),
    sessionTimeoutMs: number(env.RFC_SESSION_TIMEOUT, 5400) * 1000,
    checksTimeoutMs: number(env.RFC_CHECKS_TIMEOUT, 5400) * 1000,
    checksIntervalMs: number(env.RFC_CHECKS_INTERVAL, 30) * 1000,
    budgetUsd: env.RFC_BUDGET_USD ? Number(env.RFC_BUDGET_USD) : undefined,
    model: env.RFC_MODEL || undefined,
    appPort: number(env.RFC_APP_PORT, 3012),
    apiPort: number(env.RFC_API_PORT, 4002),
    noScreens: Boolean(env.RFC_NO_SCREENS),
    services: (env.RFC_SERVICES ?? 'localhost:5434,localhost:9002').split(',').map((s) => s.trim()).filter(Boolean),
    probes: (env.RFC_PROBES ?? '').split(';').map((s) => s.trim()).filter(Boolean),
  };
};
