import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, parseCommand, type Mode, type PolicyContext } from '../src/policy.ts';

const ctx = (mode: Mode): PolicyContext => ({
  mode,
  worktree: '/w/xtm-rfc-xhub-1',
  toolDir: '/w/xtm/rfc-delivery',
  dir: '/w/private/rfc-delivery/RFC-XHUB-1',
  flowDir: '/w/flow',
  privateDir: '/w/private',
});

const bash = (mode: Mode, command: string) => decide(ctx(mode), 'Bash', { command });
const allowed = (mode: Mode, command: string) => assert.equal(bash(mode, command).allow, true, `should allow in ${mode}: ${command}`);
const denied = (mode: Mode, command: string, pattern?: RegExp) => {
  const d = bash(mode, command);
  assert.equal(d.allow, false, `should deny in ${mode}: ${command}`);
  if (pattern && !d.allow) assert.match(d.message, pattern);
};

test('parseCommand splits simple commands and keeps quoted words whole', () => {
  assert.deepEqual(parseCommand(`git log --format='%s (x)' | head -3 && echo "a b"`).commands, [
    ['git', 'log', '--format=%s (x)'],
    ['head', '-3'],
    ['echo', 'a b'],
  ]);
  assert.deepEqual(parseCommand('yarn workspace @xtm-hub/backend test 2>&1 | tail -40').commands, [
    ['yarn', 'workspace', '@xtm-hub/backend', 'test'],
    ['tail', '-40'],
  ]);
  assert.deepEqual(parseCommand("grep -n 'foo$' a.ts").commands, [['grep', '-n', 'foo$', 'a.ts']]);
});

test('parseCommand refuses what it cannot check word by word', () => {
  for (const line of ['echo $(git push)', 'echo `id`', 'ls $HOME', 'cat "${X}"', 'sleep 1 &', '(cd apps && ls)', 'cat <<EOF', 'echo x > notes.md']) {
    assert.ok(parseCommand(line).error, line);
  }
});

test('reading and searching are allowed in every mode', () => {
  for (const mode of ['read', 'spec', 'write'] as const) {
    allowed(mode, 'git diff origin/main...HEAD -- apps/backend');
    allowed(mode, 'git -C /w/flow show abc123:rfcs/x/rfc.md');
    allowed(mode, 'git log --oneline -5 | head -3');
    allowed(mode, 'node /w/xtm/rfc-delivery/cli.mjs chunk /w/private/rfc-delivery/RFC-XHUB-1 ms-001-a');
    allowed(mode, 'grep -rn "saveSearch" apps/backend/src | head -20');
    allowed(mode, 'gh pr view 12 --comments');
    allowed(mode, 'find apps/backend/src -name "*.graphql"');
  }
});

test('version control and GitHub writes belong to the orchestrator', () => {
  for (const mode of ['read', 'spec', 'write'] as const) {
    denied(mode, 'git commit -m x', /orchestrator owns version control/);
    denied(mode, 'git push origin HEAD');
    denied(mode, 'git checkout -b other');
    denied(mode, 'git stash');
    denied(mode, 'git branch new-branch');
    denied(mode, 'git status && git commit -am x');
    denied(mode, 'gh pr create --title x');
    denied(mode, 'gh pr comment 1 --body x');
    denied(mode, 'gh api repos/o/r/issues -f title=x');
    denied(mode, 'gh api graphql -f query=x');
    denied(mode, 'git -C /tmp/elsewhere log');
  }
});

test('shell constructs are refused with a message that says what to do instead', () => {
  denied('write', 'for f in a b; do cat $f; done', /parallel/);
  denied('write', 'D=/tmp; ls $D', /parallel/);
  denied('write', 'node -e "console.log(1)"', /One plain command/);
  denied('write', 'cd apps/backend && yarn test', /worktree root/);
  denied('write', 'curl https://example.com', /web access/);
  denied('write', "sed -i 's/a/b/' x.ts", /Edit tool/);
  denied('write', 'find . -name x -delete');
  denied('write', 'xargs rm');
});

test('the repository scripts run in write mode only, never the e2e suite', () => {
  allowed('write', 'yarn workspace @xtm-hub/backend test src/modules/saved-search');
  allowed('write', 'yarn workspace @xtm-hub/backend generate-pg-to-ts');
  allowed('write', 'yarn workspace @xtm-hub/frontend next typegen');
  allowed('write', 'yarn workspace @xtm-hub/backend tsx /w/xtm/rfc-delivery/print-schema.ts');
  allowed('write', 'yarn workspace @xtm-hub/test_e2e lint');
  denied('write', 'yarn workspace @xtm-hub/test_e2e test', /e2e suite/);
  denied('write', 'yarn workspace @xtm-hub/backend start-tsx');
  denied('write', 'yarn add left-pad');
  denied('spec', 'yarn workspace @xtm-hub/backend test', /spec session/);
});

test('git restore puts back a file of the worktree in write mode only', () => {
  allowed('write', 'git restore apps/backend/src/model/kanel/public/VotingRound.ts');
  denied('write', 'git restore --source=HEAD~3 apps/x.ts');
  denied('spec', 'git restore apps/x.ts');
});

test('file writes: the code in the worktree, the spec in the tracking folder, never the tracking files', () => {
  const write = (mode: Mode, file_path: string) => decide(ctx(mode), 'Write', { file_path, content: '' }).allow;
  assert.equal(write('write', '/w/xtm-rfc-xhub-1/apps/backend/src/x.ts'), true);
  assert.equal(write('write', 'apps/frontend/x.tsx'), true);
  assert.equal(write('write', '/w/xtm-rfc-xhub-1/.git/config'), false);
  assert.equal(write('write', '/w/xtm/apps/backend/src/x.ts'), false, 'the trusted checkout');
  assert.equal(write('spec', '/w/xtm-rfc-xhub-1/apps/backend/src/x.ts'), false);
  assert.equal(write('spec', '/w/private/rfc-delivery/RFC-XHUB-1/chunks/ms-001-a.md'), true);
  assert.equal(write('write', '/w/private/rfc-delivery/RFC-XHUB-1/rfc-status.yaml'), false);
  assert.equal(write('write', '/w/private/rfc-delivery/RFC-XHUB-1/chunks.yaml'), false);
  assert.equal(write('read', '/w/private/rfc-delivery/RFC-XHUB-1/chunks/ms-001-a.md'), false);
  allowed('write', 'rm apps/backend/src/old.ts');
  denied('write', 'rm -rf /w/xtm/apps');
  denied('spec', 'mkdir apps/x');
});

test('web, MCP and unknown tools are refused', () => {
  assert.equal(decide(ctx('write'), 'WebFetch', { url: 'https://example.com' }).allow, false);
  assert.equal(decide(ctx('write'), 'mcp__slack__post', {}).allow, false);
  assert.equal(decide(ctx('write'), 'Bash', { command: 'yarn workspace @xtm-hub/backend test', run_in_background: true }).allow, false);
});
