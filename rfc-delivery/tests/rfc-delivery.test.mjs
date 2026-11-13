// node --test rfc-delivery/tests/
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseRfc, readiness, splitRow } from '../lib/rfc.mjs';
import * as st from '../lib/state.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, 'fixtures', 'RFC-XHUB-9999');
const cli = join(here, '..', 'cli.mjs');
const rfc = parseRfc(readFileSync(join(fixture, 'rfc.md'), 'utf8'));
const HEADER = { rfc: 'RFC-XHUB-9999', repository: 'XTM-Hub/xtm-hub', branch: 'issue/100', rfc_status: 'in-progress' };

// A copy of the fixture folder with a generated status file, for the CLI.
const workspace = (header = HEADER) => {
  const dir = mkdtempSync(join(tmpdir(), 'rfc-delivery-'));
  cpSync(fixture, dir, { recursive: true });
  execFileSync('node', [cli, 'generate', dir, '--header', JSON.stringify(header)], { stdio: 'pipe' });
  return dir;
};
const run = (...a) => execFileSync('node', [cli, ...a], { encoding: 'utf8' }).trim();

test('splitRow keeps escaped pipes and pipes inside code', () => {
  assert.deepEqual(splitRow('| a | `b | c` | d \\| e |'), ['a', '`b | c`', 'd | e']);
});

test('parseRfc reads acceptance criteria, slices with their phase, tests and open items', () => {
  assert.equal(rfc.id, 'RFC-XHUB-9999');
  assert.deepEqual(rfc.acceptance.map((a) => a.id), ['AC-001', 'AC-002', 'AC-003', 'AC-004']);
  assert.match(rfc.acceptance[2].text, /a\|b/);
  assert.deepEqual(rfc.slices.map((s) => s.id), ['MS-001', 'MS-002', 'MS-003'], 'the slice in a code fence is ignored');
  assert.equal(rfc.slices[0].phase, 'P1 — the feature');
  assert.equal(rfc.slices[2].phase, 'P2 — documentation');
  assert.equal(rfc.slices[0].technical, true);
  assert.equal(rfc.slices[1].technical, false);
  assert.deepEqual(rfc.slices[0].acceptance, ['AC-001', 'AC-003']);
  assert.deepEqual(rfc.tests.map((t) => t.verifies), [['AC-001', 'AC-003'], ['AC-002']]);
  assert.deepEqual(rfc.openItems.map((o) => o.id), ['RISK-001', 'OQ-001']);
  assert.equal(rfc.traceability.length, 2);
});

test('parseRfc refuses a document that is not an RFC', () => {
  assert.throws(() => parseRfc('no frontmatter'), /frontmatter/);
  assert.throws(() => parseRfc('---\ntype: prd\n---\n# PRD'), /not rfc/);
});

test('readiness: concerns for a draft, an untested AC, another repository and an open question', () => {
  const r = readiness(rfc, { repository: 'XTM-Hub/xtm-hub' });
  assert.equal(r.gate, 'CONCERNS');
  assert.ok(r.concerns.some((c) => c.includes('AC-004')));
  assert.ok(r.concerns.some((c) => c.includes('xtm-hub-docs')));
  assert.ok(r.concerns.some((c) => c.includes('OQ-001')));
  assert.ok(r.concerns.some((c) => c.includes('draft')));
});

test('readiness fails when the RFC does not change this repository', () => {
  const r = readiness(rfc, { repository: 'XTM-Hub/other' });
  assert.equal(r.gate, 'FAIL');
});

test('generateStatus lists slices then their chunks, marks other repositories external, keeps state', () => {
  const plan = st.loadPlan(fixture);
  const status = st.generateStatus(plan, HEADER);
  assert.deepEqual(Object.keys(status.development_status), [
    'ms-001', 'ms-001-saved-search-model', 'ms-001-saved-search-limit',
    'ms-002', 'ms-002-library-saved-searches', 'ms-003', 'ms-003-docs',
  ]);
  assert.equal(status.development_status['ms-003-docs'], 'external');
  status.development_status['ms-001-saved-search-model'] = 'done';
  status.chunks['ms-001-saved-search-model'].pull_request = 12;
  const again = st.generateStatus(plan, HEADER, status);
  assert.equal(again.development_status['ms-001-saved-search-model'], 'done');
  assert.equal(again.development_status['ms-001'], 'in-progress');
  assert.equal(again.chunks['ms-001-saved-search-model'].pull_request, 12);
});

test('validate accepts the fixture plan against its RFC', () => {
  const plan = st.loadPlan(fixture);
  const { errors } = st.validate(plan, st.generateStatus(plan, HEADER), rfc);
  assert.deepEqual(errors, []);
});

test('validate catches what would derail the loop', () => {
  const plan = st.loadPlan(fixture);
  const bad = structuredClone(plan);
  bad.chunks[0].depends_on = ['ms-002-library-saved-searches'];
  bad.chunks.push({ ...bad.chunks[1] });
  bad.chunks.push({ id: 'ms-001-late', slice: 'MS-001', title: 'x', acceptance: ['AC-042'] });
  bad.chunks.push({ id: 'ms-777-ghost', slice: 'MS-777', title: 'y', type: 'feature' });
  bad.chunks = bad.chunks.filter((c) => c.slice !== 'MS-003');
  const { errors } = st.validate(bad, st.generateStatus(bad, HEADER), rfc);
  const has = (re) => assert.ok(errors.some((e) => re.test(e)), `expected an error matching ${re}:\n${errors.join('\n')}`);
  has(/comes later in the stack/);
  has(/duplicate id/);
  has(/MS-001 are not contiguous/);
  has(/AC-042 is not an acceptance criterion/);
  has(/MS-777 is not a slice/);
  has(/not a conventional commit type/);
  has(/MS-003 of the RFC is in no chunk/);
});

test('next walks the plan: approval, run, checks, spec checkpoint, gate, hold, end', () => {
  const plan = st.loadPlan(fixture);
  const s = st.generateStatus(plan, { ...HEADER, rfc_status: 'planning' });
  const set = (id, v) => { s.development_status[id] = v; };
  assert.equal(st.next(plan, s).action, 'approve');
  s.rfc_status = 'in-progress';
  assert.deepEqual(st.next(plan, s), { action: 'run', chunk: 'ms-001-saved-search-model' });
  set('ms-001-saved-search-model', 'review');
  assert.deepEqual(st.next(plan, s), { action: 'ci', chunk: 'ms-001-saved-search-model' });
  set('ms-001-saved-search-model', 'done');
  assert.equal(st.next(plan, s).chunk, 'ms-001-saved-search-limit');
  set('ms-001-saved-search-limit', 'blocked');
  assert.equal(st.next(plan, s, { waiting: ['ms-001-saved-search-limit'] }).action, 'wait');
  assert.equal(st.next(plan, s).action, 'run', 'a blocked chunk with an answer is retried');
  set('ms-001-saved-search-limit', 'merged');
  set('ms-002-library-saved-searches', 'ready-for-dev');
  assert.equal(st.next(plan, s).action, 'hold-spec');
  assert.equal(st.next(plan, s, { specApproved: () => true }).action, 'run');
  set('ms-002-library-saved-searches', 'done');
  assert.equal(st.next(plan, s).action, 'gate', 'the external chunk does not hold the gate');
  s.rfc_status = 'review';
  assert.equal(st.next(plan, s).action, 'hold');
  s.rfc_status = 'done';
  assert.equal(st.next(plan, s).action, 'end');
});

test('next reports a dependency that is not settled', () => {
  const plan = st.loadPlan(fixture);
  plan.chunks[2].depends_on = ['ms-003-docs'];
  const s = st.generateStatus(plan, HEADER);
  s.development_status['ms-001-saved-search-model'] = 'done';
  s.development_status['ms-001-saved-search-limit'] = 'done';
  assert.deepEqual(st.next(plan, s), { action: 'stuck', chunk: 'ms-002-library-saved-searches', detail: 'ms-003-docs' });
});

test('stackBase: the RFC branch, then the branch below, skipping merged chunks', () => {
  const plan = st.loadPlan(fixture);
  const s = st.generateStatus(plan, HEADER);
  assert.equal(st.stackBase(plan, s, 'ms-001-saved-search-model'), 'issue/100');
  s.chunks['ms-001-saved-search-model'].branch = 'issue/101';
  assert.equal(st.stackBase(plan, s, 'ms-001-saved-search-limit'), 'issue/101');
  s.chunks['ms-001-saved-search-limit'].branch = 'issue/102';
  assert.equal(st.stackBase(plan, s, 'ms-002-library-saved-searches'), 'issue/102');
  s.development_status['ms-001-saved-search-limit'] = 'merged';
  assert.equal(st.stackBase(plan, s, 'ms-002-library-saved-searches'), 'issue/101');
  s.development_status['ms-001-saved-search-model'] = 'merged';
  assert.equal(st.stackBase(plan, s, 'ms-002-library-saved-searches'), 'issue/100');
  s.chunks['ms-002-library-saved-searches'].branch = 'issue/103';
  s.development_status['ms-001-saved-search-model'] = 'done';
  assert.deepEqual(st.above(plan, s, 'ms-001-saved-search-model').map((c) => c.id), ['ms-002-library-saved-searches']);
});

test('the public pull request body carries titles and links, never the spec', () => {
  const plan = st.loadPlan(fixture);
  const s = st.generateStatus(plan, { ...HEADER, rfc_issue: 100 });
  s.chunks['ms-001-saved-search-model'].issue = 101;
  const body = st.publicPrBody(plan, s);
  assert.match(body, /^Implements: RFC-XHUB-9999/);
  assert.match(body, /#101 store saved searches/);
  assert.match(body, /Closes #100\nCloses #101/);
  assert.doesNotMatch(body, /WHEN a user|GraphQL mutation/);
});

test('chunkTitle follows the pull request title convention', () => {
  const plan = st.loadPlan(fixture);
  const title = st.chunkTitle(plan.chunks[0], 101);
  assert.equal(title, 'feat(backend): store saved searches behind the saved_searches flag (#101)');
  assert.match(title, /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\([a-z0-9._/-]+\))?!?: .+ \(#[0-9]+\)$/);
});

test('bulletsBySection joins wrapped bullets', () => {
  const b = st.bulletsBySection('## To validate\n\n- one\n  continued\n- [x] two\n\n## Other\n- three\n');
  assert.deepEqual(b['To validate'], ['one continued', '[x] two']);
  assert.deepEqual(b.Other, ['three']);
});

test('cli: generate, set, next, base and validate on a copy of the fixture', () => {
  const dir = workspace();
  const status = readFileSync(join(dir, 'rfc-status.yaml'), 'utf8');
  assert.match(status, /^# Delivery status of one RFC/);
  assert.equal(run('next', dir), 'run ms-001-saved-search-model -');
  run('set', dir, 'ms-001-saved-search-model', 'review');
  run('set', dir, 'chunks.ms-001-saved-search-model.branch', 'issue/101');
  assert.equal(run('get', dir, 'development_status.ms-001'), 'in-progress');
  assert.equal(run('next', dir), 'ci ms-001-saved-search-model -');
  assert.equal(run('base', dir, 'ms-001-saved-search-limit'), 'issue/101');
  assert.match(readFileSync(join(dir, 'rfc-status.yaml'), 'utf8'), /^# Delivery status of one RFC/, 'comments survive a write');
  assert.equal(run('validate', dir, '--rfc', join(dir, 'rfc.md')).split('\n').at(-1), 'valid');
  assert.throws(() => run('set', dir, 'ms-001-saved-search-model', 'shipped'));
});

test('cli: next honours a spec approval written in the chunk spec', () => {
  const dir = workspace();
  for (const id of ['ms-001-saved-search-model', 'ms-001-saved-search-limit']) run('set', dir, id, 'done');
  run('set', dir, 'ms-002-library-saved-searches', 'ready-for-dev');
  const spec = join(dir, 'chunks', 'ms-002-library-saved-searches.md');
  execFileSync('mkdir', ['-p', dirname(spec)]);
  writeFileSync(spec, '---\nchunk: ms-002-library-saved-searches\napproved_by: none\n---\n# x\n');
  assert.equal(run('next', dir), 'hold-spec ms-002-library-saved-searches -');
  writeFileSync(spec, '---\nchunk: ms-002-library-saved-searches\napproved_by: "@po"\n---\n# x\n');
  assert.equal(run('next', dir), 'run ms-002-library-saved-searches -');
});

test('checkSpec: the template filled for the fixture passes, its gaps are named', () => {
  const plan = st.loadPlan(fixture);
  const status = { ...st.generateStatus(plan, HEADER), source: { sha: 'a'.repeat(40) } };
  const chunk = plan.chunks[0];
  const template = readFileSync(join(here, '..', 'chunk-template.md'), 'utf8')
    .replace(/^chunk: .*$/m, `chunk: ${chunk.id}`)
    .replace(/^rfc: .*$/m, 'rfc: RFC-XHUB-9999')
    .replace(/^rfc_sha: .*$/m, `rfc_sha: ${'a'.repeat(40)}`)
    .replace(/^baseline_revision: .*$/m, `baseline_revision: ${'b'.repeat(40)}`);
  const filled = template.replace('| AC-001 | WHEN', '| AC-003 | IF a name holds a pipe |\n| AC-001 | WHEN');
  assert.deepEqual(st.checkSpec(filled, chunk, status).errors, []);
  const broken = filled.replace('## Code Map', '## Map').replace(/^acceptance: .*$/m, 'acceptance: [AC-001]').replace('## Tasks', '## Tasks\n\nTBD');
  const { errors } = st.checkSpec(broken, chunk, status);
  assert.ok(errors.some((e) => e.includes('"## Code Map"')));
  assert.ok(errors.some((e) => e.includes('differs from chunks.yaml')));
  assert.ok(errors.some((e) => e.includes('placeholders')));
});

test('run.sh: --dry-run and status read the plan from the private folder', () => {
  const root = mkdtempSync(join(tmpdir(), 'rfc-private-'));
  const dir = join(root, 'rfc-delivery', 'RFC-XHUB-9999');
  cpSync(fixture, dir, { recursive: true });
  const header = { ...HEADER, rfc_status: 'planning', required_checks: 'run-api-unit-tests', base: 'main' };
  execFileSync('node', [cli, 'generate', dir, '--header', JSON.stringify(header)], { stdio: 'pipe' });
  const runSh = (...a) =>
    execFileSync('bash', [join(here, '..', 'run.sh'), 'RFC-XHUB-9999', ...a], {
      encoding: 'utf8',
      env: { ...process.env, RFC_PRIVATE_DIR: root, RFC_FLOW_DIR: root },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  assert.match(runSh('--dry-run'), /^next: approve - -$/m);
  run('set', dir, 'rfc_status', 'in-progress');
  assert.match(runSh('--dry-run'), /^next: run ms-001-saved-search-model -$/m);
  const status = runSh('status');
  assert.match(status, /3 backlog/);
  assert.match(status, /rfc_status: in-progress/);
});

test('validate: public_title must read like a pull request title', () => {
  const plan = st.loadPlan(fixture);
  const ok = st.generateStatus(plan, { ...HEADER, public_title: 'feat(library): save searches' });
  assert.deepEqual(st.validate(plan, ok).errors, []);
  const bad = st.generateStatus(plan, { ...HEADER, public_title: 'Saved searches (#12)' });
  assert.ok(st.validate(plan, bad).errors.some((e) => e.includes('public_title')));
});

test('validate refuses a chunk id that is only its slice key', () => {
  const plan = st.loadPlan(fixture);
  plan.chunks[0].id = 'ms-001';
  plan.chunks[1].depends_on = ['ms-001'];
  const { errors } = st.validate(plan, st.generateStatus(plan, HEADER), rfc);
  assert.ok(errors.some((e) => e.includes('chunk ms-001: id must look like')), errors.join('\n'));
});

test('generateStatus: a re-plan keeps the issues, branches, pull requests and the running status', () => {
  const plan = st.loadPlan(fixture);
  const running = st.generateStatus(plan, { ...HEADER, rfc_issue: 100, branch: 'issue/100', pull_request: 7, rfc_status: 'in-progress' });
  const replanned = st.generateStatus(
    plan,
    { ...HEADER, rfc_issue: 'none', branch: 'none', pull_request: 'none', rfc_status: 'planning', title: 'new title' },
    running,
  );
  assert.equal(replanned.rfc_issue, 100);
  assert.equal(replanned.branch, 'issue/100');
  assert.equal(replanned.pull_request, 7);
  assert.equal(replanned.rfc_status, 'in-progress');
  assert.equal(replanned.title, 'new title', 'configuration fields still follow the header');
});
