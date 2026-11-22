// What an unattended session may run. The orchestrator owns version control, the tracking files
// and GitHub; a session reads anything, writes the chunk's code in the worktree and its spec in
// the tracking folder, and runs the repository's own scripts. Everything else is refused with a
// message that tells the model what to do instead.
//
// The SDK calls `decide` (through canUseTool) for every tool call that the project settings and
// Claude Code's own read-only checks do not already allow.
import { isAbsolute, relative, resolve, sep } from 'node:path';

export type Mode = 'read' | 'spec' | 'write';

export interface PolicyContext {
  mode: Mode;
  worktree: string;
  toolDir: string;
  /** The RFC's tracking folder in the private repository. */
  dir: string;
  flowDir: string;
  privateDir: string;
}

export type Decision = { allow: true } | { allow: false; message: string };

/** Tools every session may use, whatever their input. */
export const READ_ONLY_TOOLS = ['Read', 'Glob', 'Grep', 'Agent', 'TodoWrite', 'ToolSearch'];

const allow: Decision = { allow: true };
const deny = (message: string): Decision => ({ allow: false, message });

const MESSAGES = {
  vcs: 'The orchestrator owns version control and GitHub: it commits, pushes, opens pull requests and comments. Leave the change uncommitted in the working tree and return the structured result.',
  shell:
    'One plain command per call: no loop, no condition, no variable, no command substitution, no backgrounding. To read several files, make several Read calls in parallel; to search, use Grep or Glob.',
  redirect: 'No output redirection to a file: create or change files with the Write and Edit tools.',
  cd: 'Stay at the worktree root: run package scripts as `yarn workspace @xtm-hub/<backend|frontend|test_e2e> <script>` and use paths relative to the root, or absolute paths.',
  outside: 'Write only inside the worktree (the chunk\'s code) and the chunk spec in the tracking folder.',
  tracking: 'chunks.yaml and rfc-status.yaml belong to the orchestrator: never edit them.',
  e2e: 'Never run the e2e suite: its hooks drop the database schema. The CI runs it.',
  network: 'No web access from a delivery session: the RFC, the spec and the code are all you need, and a spec must not leave this machine.',
  unknown: (cmd: string) =>
    `\`${cmd}\` is not one of the commands a delivery session may run. Read files with Read, search with Grep or Glob, and run the repository's checks with \`yarn workspace @xtm-hub/<workspace> <script>\`.`,
} as const;

// ---------------------------------------------------------------- shell parsing

export interface Parsed {
  /** The simple commands, each as its words, quotes removed. */
  commands: string[][];
  error?: string;
}

const OPERATORS = ['&&', '||', ';', '|', '\n'];

/**
 * Splits a command line into simple commands. Refuses what it cannot check word by word:
 * substitutions, variables, compound commands, backgrounding, here-documents, and redirections
 * other than to /dev/null or between standard streams.
 */
export const parseCommand = (line: string): Parsed => {
  const commands: string[][] = [];
  let words: string[] = [];
  let word = '';
  let quoted = false; // the current word had quotes: an empty word still counts
  let i = 0;
  const endWord = () => {
    if (word || quoted) words.push(word);
    word = '';
    quoted = false;
  };
  const endCommand = () => {
    endWord();
    if (words.length) commands.push(words);
    words = [];
  };
  while (i < line.length) {
    const c = line[i] as string;
    if (c === "'") {
      const end = line.indexOf("'", i + 1);
      if (end < 0) return { commands, error: MESSAGES.shell };
      word += line.slice(i + 1, end);
      quoted = true;
      i = end + 1;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      for (; j < line.length && line[j] !== '"'; j++) {
        if (line[j] === '\\') j++;
        else if (line[j] === '`' || (line[j] === '$' && /[A-Za-z_{(]/.test(line[j + 1] ?? ''))) return { commands, error: MESSAGES.shell };
      }
      if (j >= line.length) return { commands, error: MESSAGES.shell };
      word += line.slice(i + 1, j).replace(/\\(["\\$`])/g, '$1');
      quoted = true;
      i = j + 1;
      continue;
    }
    if (c === '\\') {
      word += line[i + 1] ?? '';
      i += 2;
      continue;
    }
    if (c === '`' || (c === '$' && /[A-Za-z_{(]/.test(line[i + 1] ?? ''))) return { commands, error: MESSAGES.shell };
    const op = OPERATORS.find((o) => line.startsWith(o, i));
    if (op) {
      endCommand();
      i += op.length;
      continue;
    }
    if (c === '&') return { commands, error: MESSAGES.shell };
    if (c === '(' || c === ')' || c === '{' || c === '}') return { commands, error: MESSAGES.shell };
    if (c === '>' || c === '<') {
      // 2>&1, >/dev/null, 2>/dev/null, &>/dev/null: allowed; anything else writes or reads a file.
      endWord();
      const rest = line.slice(i).match(/^(>>?|<)\s*(&[12]|\/dev\/null)(?=\s|$|[;&|])/);
      if (!rest) return { commands, error: c === '<' && line.startsWith('<<', i) ? MESSAGES.shell : MESSAGES.redirect };
      // A digit right before the operator (2>) is a file descriptor, not an argument.
      if (/^[12]$/.test(words[words.length - 1] ?? '') && line[i - 1] !== ' ') words.pop();
      i += rest[0].length;
      continue;
    }
    if (c === ' ' || c === '\t') {
      endWord();
      i++;
      continue;
    }
    word += c;
    i++;
  }
  endCommand();
  return { commands };
};

// ---------------------------------------------------------------- command rules

const COMPOUND = new Set(['for', 'while', 'until', 'if', 'case', 'function', 'select', 'do', 'then', 'done', 'fi', 'esac']);

/** Commands that only read, whatever their arguments (beyond the checks below). */
const READERS = new Set([
  'cat', 'head', 'tail', 'wc', 'sort', 'uniq', 'cut', 'tr', 'ls', 'pwd', 'echo', 'printf', 'grep', 'egrep', 'rg', 'jq', 'diff', 'comm',
  'basename', 'dirname', 'realpath', 'file', 'stat', 'du', 'which', 'date', 'true', 'column', 'nl', 'od', 'test', '[',
]);

const GIT_READ = new Set(['status', 'diff', 'log', 'show', 'ls-files', 'ls-tree', 'merge-base', 'rev-parse', 'blame', 'grep', 'cat-file', 'shortlog', 'describe', 'name-rev', 'rev-list', 'whatchanged']);
const GIT_BRANCH_READ = new Set(['--show-current', '--list', '-a', '--all', '-r', '--remotes', '-v', '-vv', '--contains', '--merged', '--no-merged']);

const WORKSPACE_SCRIPTS: Record<string, Set<string>> = {
  '@xtm-hub/backend': new Set([
    'check-ts', 'lint', 'lint:fix', 'format', 'format:check', 'test', 'test:ci', 'generate:ts', 'generate:module', 'generate-pg-to-ts',
    'migrate:make', 'migrate:latest', 'migrate:up', 'migrate:down', 'esmigrate:make', 'esmigrate:up', 'seed:make',
  ]),
  '@xtm-hub/frontend': new Set(['lint', 'lint:fix', 'format', 'format:check', 'check-ts', 'test', 'i18n:check', 'relay', 'codegen']),
  '@xtm-hub/test_e2e': new Set(['lint', 'lint:fix', 'format:check', 'prettier:format']),
};

const CLI_READ = new Set(['parse', 'readiness', 'locate', 'chunk', 'title', 'list', 'get', 'base', 'above', 'check-spec', 'validate', 'next', 'pr-body', 'private-pr-body']);

const inside = (path: string, root: string): boolean => {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

/** Resolves a path a session gives, relative to the worktree root (sessions run there). */
const at = (ctx: PolicyContext, path: string): string => (isAbsolute(path) ? resolve(path) : resolve(ctx.worktree, path));

const isTrackingFile = (ctx: PolicyContext, path: string): boolean =>
  [resolve(ctx.dir, 'chunks.yaml'), resolve(ctx.dir, 'rfc-status.yaml')].includes(path);

/** Where a session may write: the worktree (not its git files) in write mode, the specs in spec and write modes. */
export const writable = (ctx: PolicyContext, raw: string): Decision => {
  const path = at(ctx, raw);
  if (isTrackingFile(ctx, path)) return deny(MESSAGES.tracking);
  if (inside(path, resolve(ctx.dir, 'chunks')) && ctx.mode !== 'read') return allow;
  if (ctx.mode === 'write' && inside(path, ctx.worktree)) {
    const rel = relative(ctx.worktree, path).split(sep);
    if (rel[0] === '.git' || rel[0] === 'node_modules') return deny(MESSAGES.outside);
    return allow;
  }
  return deny(MESSAGES.outside);
};

const isCli = (ctx: PolicyContext, script: string | undefined, name: string): boolean =>
  script !== undefined && (at(ctx, script) === resolve(ctx.toolDir, name) || script === `rfc-delivery/${name}`);

const checkGit = (ctx: PolicyContext, args: string[]): Decision => {
  let rest = args;
  let repo = ctx.worktree;
  while (rest[0]?.startsWith('-')) {
    if (rest[0] === '-C' && rest[1]) {
      repo = at(ctx, rest[1]);
      rest = rest.slice(2);
    } else if (rest[0] === '--no-pager' || rest[0] === '-P') {
      rest = rest.slice(1);
    } else {
      return deny(MESSAGES.vcs);
    }
  }
  const [sub, ...subArgs] = rest;
  if (!sub) return deny(MESSAGES.vcs);
  const known = [ctx.worktree, ctx.flowDir, ctx.privateDir, ctx.toolDir].some((root) => inside(repo, root));
  if (!known) return deny(MESSAGES.outside);
  if (GIT_READ.has(sub)) return allow;
  if (sub === 'branch' && subArgs.every((a) => GIT_BRANCH_READ.has(a) || !a.startsWith('-')) && subArgs.every((a) => a.startsWith('-'))) return allow;
  if (sub === 'stash' && subArgs[0] === 'list') return allow;
  if (sub === 'worktree' && subArgs[0] === 'list') return allow;
  // Putting back a generated file the chunk did not mean to change (a Kanel model, a schema).
  if (sub === 'restore' && ctx.mode === 'write' && inside(repo, ctx.worktree) && !subArgs.some((a) => a.startsWith('-s') || a.startsWith('--source') || a === '--staged' || a === '-S'))
    return subArgs.filter((a) => !a.startsWith('-')).every((p) => writable(ctx, p).allow) ? allow : deny(MESSAGES.outside);
  return deny(MESSAGES.vcs);
};

const checkGh = (args: string[]): Decision => {
  const [group, verb] = args;
  if ((group === 'pr' && ['view', 'diff', 'list', 'checks'].includes(verb ?? '')) || (group === 'issue' && ['view', 'list'].includes(verb ?? ''))) return allow;
  if (group === 'run' && ['view', 'list'].includes(verb ?? '')) return allow;
  if (group === 'api') {
    const writes = args.some((a, i) => ['-f', '-F', '--field', '--raw-field', '--input'].includes(a) || ((a === '-X' || a === '--method') && args[i + 1]?.toUpperCase() !== 'GET'));
    if (!writes && !args.some((a) => a === 'graphql')) return allow;
  }
  return deny(MESSAGES.vcs);
};

const checkYarn = (ctx: PolicyContext, args: string[]): Decision => {
  if (args[0] !== 'workspace') return deny(MESSAGES.unknown(['yarn', ...args].join(' ')));
  const [, ws, script, ...rest] = args;
  if (ctx.mode !== 'write') return deny('A spec session leaves the code as it is: it reads, it does not build or test.');
  if (ws === '@xtm-hub/test_e2e' && (script === 'test' || script?.startsWith('test:') || script === 'playwright')) return deny(MESSAGES.e2e);
  if (ws === '@xtm-hub/backend' && script === 'tsx' && rest.length === 1 && (at(ctx, resolve(ctx.worktree, 'apps/backend', rest[0] as string)) === resolve(ctx.toolDir, 'print-schema.ts') || isCli(ctx, rest[0], 'print-schema.ts')))
    return allow;
  if (ws === '@xtm-hub/frontend' && script === 'next' && rest[0] === 'typegen') return allow;
  if (ws && script && WORKSPACE_SCRIPTS[ws]?.has(script)) return allow;
  if (ws && ['prettier', 'eslint'].includes(script ?? '')) return allow;
  return deny(MESSAGES.unknown(['yarn', ...args].join(' ')));
};

const checkCommand = (ctx: PolicyContext, words: string[]): Decision => {
  const [cmd, ...args] = words as [string, ...string[]];
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(cmd)) return deny(MESSAGES.shell);
  if (COMPOUND.has(cmd)) return deny(MESSAGES.shell);
  if (cmd === 'cd' || cmd === 'pushd' || cmd === 'popd') return deny(MESSAGES.cd);
  if (cmd === 'git') return checkGit(ctx, args);
  if (cmd === 'gh') return checkGh(args);
  if (cmd === 'yarn') return checkYarn(ctx, args);
  if (['curl', 'wget', 'ssh', 'scp', 'nc', 'open'].includes(cmd)) return deny(MESSAGES.network);
  if (['npx', 'npm', 'pnpm', 'bunx'].includes(cmd)) return deny(MESSAGES.unknown(cmd));
  if (cmd === 'node') {
    const [script, sub] = args;
    if (isCli(ctx, script, 'cli.mjs') && sub && CLI_READ.has(sub)) return allow;
    if (isCli(ctx, script, 'screenshot.mjs') && ctx.mode !== 'read') return allow;
    return deny(args[0] === '-e' || args[0] === '--eval' || args[0] === '-p' ? MESSAGES.shell : MESSAGES.unknown(words.join(' ')));
  }
  if (READERS.has(cmd)) return allow;
  if (cmd === 'sed') return args.some((a) => a === '-i' || a.startsWith('-i') || a === '--in-place') ? deny('Change files with the Edit tool, not sed -i.') : allow;
  if (cmd === 'awk') return args.some((a) => /system\s*\(|>|\|\s*"/.test(a)) ? deny(MESSAGES.shell) : allow;
  if (cmd === 'find') return args.some((a) => ['-exec', '-execdir', '-delete', '-ok', '-okdir', '-fprint', '-fprintf', '-fls'].includes(a)) ? deny(MESSAGES.shell) : allow;
  if (cmd === 'tee') return args.every((a) => a === '/dev/null' || a.startsWith('-')) ? allow : deny(MESSAGES.redirect);
  if (['rm', 'mkdir', 'touch', 'mv', 'cp'].includes(cmd)) {
    if (ctx.mode !== 'write') return deny('A spec session leaves the code as it is.');
    const paths = args.filter((a) => !a.startsWith('-'));
    if (!paths.length) return deny(MESSAGES.unknown(words.join(' ')));
    for (const p of paths) {
      const d = writable(ctx, p);
      if (!d.allow) return d;
      if (cmd === 'rm' && resolve(ctx.worktree, p) === ctx.worktree) return deny(MESSAGES.outside);
    }
    return allow;
  }
  if (cmd === 'sleep') return deny('Do not wait: nothing runs in the background of a delivery session.');
  return deny(MESSAGES.unknown(cmd));
};

// ---------------------------------------------------------------- tools

export const decide = (ctx: PolicyContext, tool: string, input: Record<string, unknown>): Decision => {
  if (READ_ONLY_TOOLS.includes(tool)) return allow;
  switch (tool) {
    case 'Bash': {
      const command = String(input.command ?? '');
      if (input.run_in_background) return deny('Nothing runs in the background of a delivery session: run the command in the foreground.');
      const parsed = parseCommand(command);
      if (parsed.error) return deny(parsed.error);
      if (!parsed.commands.length) return deny(MESSAGES.unknown(command));
      for (const words of parsed.commands) {
        const d = checkCommand(ctx, words);
        if (!d.allow) return d;
      }
      return allow;
    }
    case 'Edit':
    case 'Write':
    case 'MultiEdit':
    case 'NotebookEdit': {
      const path = String(input.file_path ?? input.notebook_path ?? '');
      if (!path) return deny(MESSAGES.outside);
      if (ctx.mode === 'read') return deny('This session reads and reports: it changes no file.');
      return writable(ctx, path);
    }
    case 'WebFetch':
    case 'WebSearch':
      return deny(MESSAGES.network);
    case 'Skill':
      return allow;
    default:
      if (tool.startsWith('mcp__')) return deny('No MCP tool in a delivery session: use Read, Grep and Glob.');
      return deny(`${tool} is not available to a delivery session.`);
  }
};
