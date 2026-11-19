import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { Config } from '../src/config.ts';
import { answersSince, approvedByOther, checksState, issueKind, numberFromUrl } from '../src/github.ts';
import { createLogger } from '../src/log.ts';
import { progressLines } from '../src/sessions.ts';
import { Worktree } from '../src/worktree.ts';

test('checksState: every required check passed, one failed, or not yet', () => {
  const required = ['api', 'front'];
  assert.equal(checksState([{ name: 'api', bucket: 'pass' }, { name: 'front', bucket: 'skipping' }], required), 'pass');
  assert.equal(checksState([{ name: 'api', bucket: 'pass' }, { name: 'front', bucket: 'fail' }], required), 'fail');
  assert.equal(checksState([{ name: 'api', bucket: 'cancel' }], required), 'fail');
  assert.equal(checksState([{ name: 'api', bucket: 'pass' }], required), 'pending', 'a missing check is not a pass');
  assert.equal(checksState([{ name: 'api', bucket: 'pending' }, { name: 'front', bucket: 'pass' }], required), 'pending');
});

test('approvedByOther: the latest review of someone other than the author', () => {
  const r = (login: string, state: string, submittedAt: string) => ({ author: { login }, state, submittedAt });
  assert.equal(approvedByOther({ author: { login: 'a' }, reviews: [r('a', 'APPROVED', '1')] }), false, 'self-approval');
  assert.equal(approvedByOther({ author: { login: 'a' }, reviews: [r('b', 'APPROVED', '1')] }), true);
  assert.equal(approvedByOther({ author: { login: 'a' }, reviews: [r('b', 'APPROVED', '1'), r('b', 'CHANGES_REQUESTED', '2')] }), false);
  assert.equal(approvedByOther({ author: { login: 'a' }, reviews: [r('b', 'COMMENTED', '1'), r('c', 'APPROVED', '2')] }), true);
});

test('answersSince ignores the loop\'s own block notices and older comments', () => {
  const c = (created_at: string, body: string) => ({ created_at, body });
  const comments = [c('2026-01-01T00:00:00Z', 'old'), c('2026-02-01T00:00:00Z', '**RFC delivery blocked**: x'), c('2026-02-02T00:00:00Z', 'the answer')];
  assert.equal(answersSince(comments, '2026-01-15T00:00:00Z', '**RFC delivery blocked**'), 1);
});

test('issueKind follows .github/LABELS.md', () => {
  assert.deepEqual(issueKind('feat'), { label: 'feature', type: 'Feature' });
  assert.deepEqual(issueKind('fix'), { label: 'bug', type: 'Bug' });
  assert.deepEqual(issueKind('docs'), { label: 'documentation', type: 'Task' });
  assert.deepEqual(issueKind('chore'), { type: 'Task' });
  assert.equal(numberFromUrl('https://github.com/o/r/pull/42\n'), 42);
});

test('progressLines: tool calls, indented in subagents, and the main thread\'s text', () => {
  const message = (parent: string | null, content: unknown[]) => ({ type: 'assistant', parent_tool_use_id: parent, message: { content } }) as unknown as SDKMessage;
  assert.deepEqual(progressLines(message(null, [{ type: 'tool_use', name: 'Bash', input: { command: 'git   status' } }, { type: 'text', text: 'Done.' }])), ['  Bash git status', '  > Done.']);
  assert.deepEqual(progressLines(message('t1', [{ type: 'tool_use', name: 'Read', input: { file_path: '/a' } }, { type: 'text', text: 'hidden' }])), ['    Read /a']);
  assert.deepEqual(progressLines(message(null, [{ type: 'tool_use', name: 'StructuredOutput', input: {} }])), []);
});

test('Worktree: a stopped chunk\'s change is put aside on its own ref and brought back whole', async () => {
  const root = mkdtempSync(join(tmpdir(), 'rfc-worktree-'));
  const g = (...a: string[]) => execFileSync('git', ['-c', 'commit.gpgsign=false', ...a], { cwd: root, encoding: 'utf8' }).trim();
  g('init', '-q', '-b', 'main');
  writeFileSync(join(root, 'kept.ts'), 'kept\n');
  writeFileSync(join(root, 'gone.ts'), 'gone\n');
  g('add', '-A');
  g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init');
  const cfg = { rfc: 'RFC-XHUB-1', worktree: root, repoRoot: root, logDir: root } as unknown as Config;
  const wt = new Worktree(cfg, createLogger(mkdtempSync(join(tmpdir(), 'rfc-log-')), () => undefined));
  writeFileSync(join(root, 'kept.ts'), 'changed\n');
  unlinkSync(join(root, 'gone.ts'));
  writeFileSync(join(root, 'new.ts'), 'new\n');
  const ref = await wt.putAside('ms-001-a', 'NEEDS_HUMAN');
  assert.equal(ref, 'refs/rfc-delivery/RFC-XHUB-1/ms-001-a');
  assert.equal(await wt.clean(), true);
  assert.equal(g('stash', 'list'), '', 'the shared stash stays untouched');
  assert.equal(await wt.restore('ms-001-a'), true);
  assert.equal(readFileSync(join(root, 'kept.ts'), 'utf8'), 'changed\n');
  assert.equal(existsSync(join(root, 'gone.ts')), false);
  assert.equal(readFileSync(join(root, 'new.ts'), 'utf8'), 'new\n');
  assert.equal(await wt.putAsideRef('ms-001-a'), undefined, 'the ref is dropped once restored');
  assert.equal(await wt.restore('ms-001-a'), false);
  rmSync(root, { recursive: true, force: true });
});
