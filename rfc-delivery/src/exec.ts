// Child processes, typed: every git, gh and yarn call of the orchestrator goes through `run`.
import { spawn } from 'node:child_process';

export class CommandError extends Error {
  readonly command: string;
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;

  constructor(command: string, code: number | null, stdout: string, stderr: string) {
    const tail = (stderr || stdout).trim().split('\n').slice(-5).join('\n');
    super(`${command} exited with ${code ?? 'a signal'}${tail ? `:\n${tail}` : ''}`);
    this.command = command;
    this.code = code;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

export interface RunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  /** Resolve with the exit code instead of throwing on a non-zero exit. */
  allowFailure?: boolean;
  /** Stream the output to this process's terminal instead of capturing it. */
  inherit?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export const run = (command: string, args: readonly string[], options: RunOptions = {}): Promise<RunResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: options.inherit ? 'inherit' : [options.input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      signal: options.signal,
      timeout: options.timeoutMs,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.setEncoding('utf8').on('data', (d: string) => (stdout += d));
    child.stderr?.setEncoding('utf8').on('data', (d: string) => (stderr += d));
    if (options.input !== undefined) child.stdin?.end(options.input);
    child.on('error', reject);
    child.on('close', (code) => {
      const result = { code: code ?? 1, stdout, stderr };
      if (code === 0 || options.allowFailure) resolve(result);
      else reject(new CommandError([command, ...args].join(' '), code, stdout, stderr));
    });
  });

/** Runs and returns the trimmed standard output. */
export const out = async (command: string, args: readonly string[], options: RunOptions = {}): Promise<string> =>
  (await run(command, args, options)).stdout.trim();

/** True when the command exits with 0. */
export const ok = async (command: string, args: readonly string[], options: RunOptions = {}): Promise<boolean> =>
  (await run(command, args, { ...options, allowFailure: true })).code === 0;

/** A git bound to one working tree. */
export interface Git {
  readonly cwd: string;
  out(...args: string[]): Promise<string>;
  ok(...args: string[]): Promise<boolean>;
  run(args: string[], options?: RunOptions): Promise<RunResult>;
}

export const gitIn = (cwd: string): Git => ({
  cwd,
  out: (...args) => out('git', args, { cwd }),
  ok: (...args) => ok('git', args, { cwd }),
  run: (args, options = {}) => run('git', args, { cwd, ...options }),
});

export const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
