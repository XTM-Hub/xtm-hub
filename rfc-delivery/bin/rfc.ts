#!/usr/bin/env node
// Delivers one Filigran Flow RFC as a stack of pull requests, one chunk at a time, unattended,
// in a worktree of its own (see rfc-delivery/README.md).
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { loadConfig, RFC_ID } from '../src/config.ts';
import { Delivery } from '../src/delivery.ts';
import { createLogger, Stop } from '../src/log.ts';

const USAGE = `Usage: yarn rfc <RFC-ID> [command] [options]

  (no command)          build the next chunks until the RFC review, a block or a held spec
                        --once: one chunk  --no-wait: no CI wait  --dry-run: print the next action
  status                chunks per status, the worktree, the next action
  issues [--yes]        create the RFC issue and one sub-issue per chunk
  start                 the RFC branch, its draft pull request, the tracking pull request, the worktree
  restack [<chunk>]     carry a fix of a lower chunk up the stack
  resume [<chunk>]      retry a blocked chunk from the code it put aside
  publish               after a change by hand in the worktree: push the chunks, rewrite the bodies
  debug <chunk>         interactive session on a blocked chunk
  feedback <chunk>      interactive session on the team's review of a chunk pull request
  review                interactive session to finish the RFC review and close it
                        (debug, feedback, review: without a terminal, print the session's brief)

Environment: RFC_PRIVATE_DIR (../xtm-hub-private), RFC_FLOW_DIR (../filigran-flow), RFC_WORKTREE
(../<checkout>-<rfc-id>), RFC_MODEL, RFC_BUDGET_USD (per session), RFC_SESSION_TIMEOUT (5400 s),
RFC_CHECKS_TIMEOUT (5400 s), RFC_CHECKS_INTERVAL (30 s), RFC_APP_PORT (3012), RFC_API_PORT (4002),
RFC_NO_SCREENS, RFC_SERVICES (localhost:5434,localhost:9002), RFC_PROBES (';'-separated commands).`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    once: { type: 'boolean', default: false },
    'no-wait': { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    yes: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

const [rfc, command = 'run', arg] = positionals;
if (values.help || !rfc || !RFC_ID.test(rfc)) {
  process.stdout.write(`${USAGE}\n`);
  process.exit(values.help ? 0 : 1);
}

let cfg: ReturnType<typeof loadConfig>;
let delivery: Delivery;
try {
  cfg = loadConfig(rfc);
  delivery = new Delivery(cfg, createLogger(cfg.logDir));
} catch (error) {
  process.stderr.write(`${error instanceof Stop ? '' : 'FAILED: '}${(error as Error).message}\n`);
  process.exit(1);
}
const log = delivery.log;
const options = { once: values.once, noWait: values['no-wait'], dryRun: values['dry-run'] };

const stop = (signal: string) => {
  log(`${signal}: stopping; run yarn rfc ${rfc} again to resume`);
  delivery.abort.abort(new Error(signal));
  delivery.app.stop();
  process.exit(130);
};
process.once('SIGINT', () => stop('interrupted'));
process.once('SIGTERM', () => stop('terminated'));

const confirm = async (lines: string[]): Promise<boolean> => {
  process.stdout.write(`Issues to create in ${delivery.tracking.status().repository}:\n${lines.map((l) => `  ${l}`).join('\n')}\n`);
  if (values.yes) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Create them? [y/N] ');
  rl.close();
  return answer.trim().toLowerCase() === 'y';
};

const need = (what: string): string => {
  if (!arg) throw new Stop(`usage: yarn rfc ${rfc} ${command} <${what}>`);
  return arg;
};

try {
  const facts = (id: string) => delivery.tracking.facts(id);
  const s = delivery.tracking.status();
  switch (command) {
    case 'run':
      await delivery.loop(options);
      break;
    case 'status':
      process.stdout.write(`${delivery.statusReport()}\n`);
      break;
    case 'issues':
      await delivery.createIssues(confirm);
      break;
    case 'start':
      await delivery.start();
      break;
    case 'restack':
      await delivery.restack(arg);
      break;
    case 'resume':
      await delivery.resume(arg, options);
      break;
    case 'publish':
      await delivery.publish();
      break;
    case 'debug': {
      const id = need('chunk');
      process.exitCode = await delivery.interactive(join(cfg.toolDir, 'DEBUG.md'), `The chunk is ${id} (status ${delivery.tracking.statusOf(id)}, PR #${facts(id).pull_request ?? 'none'}).`);
      break;
    }
    case 'feedback': {
      const id = need('chunk');
      process.exitCode = await delivery.interactive(
        join(cfg.toolDir, 'FEEDBACK.md'),
        `The chunk is ${id}, its pull request ${s.repository}#${facts(id).pull_request}, its branch ${facts(id).branch}.`,
      );
      break;
    }
    case 'review':
      process.exitCode = await delivery.interactive(
        join(cfg.repoRoot, '.claude/skills/review-rfc/SKILL.md'),
        `The RFC pull request is ${s.repository}#${s.pull_request}, the tracking one ${s.private_repository}#${s.private_pull_request}.`,
      );
      break;
    default:
      throw new Stop(`unknown command ${command}\n\n${USAGE}`);
  }
} catch (error) {
  if (error instanceof Stop) {
    log(`STOP: ${error.message}`);
  } else {
    log(`FAILED: ${(error as Error).stack ?? String(error)}`);
  }
  delivery.app.stop();
  process.exit(1);
}
delivery.app.stop();
