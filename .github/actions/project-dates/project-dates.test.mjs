import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALERT_TYPES, FIELDS, buildAlert, extractIssueNumbers, planUpdate, previousTag } from './project-dates-lib.mjs';

const day = '2026-11-26';

test('extractIssueNumbers reads the title and the body but not the release notes', () => {
  const body = 'Related #12\n\n## Release notes\nFixes #99 for users\n\n## Other\nSee #13';
  assert.deepEqual(extractIssueNumbers({ title: 'feat: dates (#14)', body }).sort(), ['12', '13', '14']);
  assert.deepEqual(extractIssueNumbers({}), []);
});

test('start writes the Dev start date and warns when the Planned ETA is empty', () => {
  const plan = planUpdate('start', { status: 'Development', dates: {} }, day);
  assert.deepEqual(plan.set, [{ field: FIELDS.start, date: day }]);
  assert.deepEqual(plan.warnings, ['planned_eta_missing']);
});

test('start does not warn when the Planned ETA is set', () => {
  const plan = planUpdate('start', { status: 'Development', dates: { [FIELDS.planned]: '2026-12-01' } }, day);
  assert.deepEqual(plan.set, [{ field: FIELDS.start, date: day }]);
  assert.deepEqual(plan.warnings, []);
});

test('start never overwrites a Dev start date, and warns only once', () => {
  const plan = planUpdate('start', { status: 'Code review', dates: { [FIELDS.start]: '2026-11-20' } }, day);
  assert.deepEqual(plan.set, []);
  assert.deepEqual(plan.warnings, []);
  assert.match(plan.skipped, /already 2026-11-20/);
});

test('merge overwrites the Adjusted ETA so the latest merge wins', () => {
  const plan = planUpdate('merge', { status: 'Code review', dates: { [FIELDS.adjusted]: '2026-11-01' } }, day);
  assert.deepEqual(plan.set, [{ field: FIELDS.adjusted, date: day }]);
});

test('release sets the Prod date and Done for a task in Ready to Deploy', () => {
  const plan = planUpdate('release', { status: 'Ready to Deploy', dates: {} }, day);
  assert.deepEqual(plan.set, [{ field: FIELDS.prod, date: day }]);
  assert.equal(plan.status, 'Done');
});

test('release keeps an existing Prod date but still moves the task to Done', () => {
  const plan = planUpdate('release', { status: 'Ready to Deploy', dates: { [FIELDS.prod]: '2026-11-10' } }, day);
  assert.deepEqual(plan.set, []);
  assert.equal(plan.status, 'Done');
});

test('release ignores a task that is not in Ready to Deploy', () => {
  const plan = planUpdate('release', { status: 'Code review', dates: {} }, day);
  assert.deepEqual(plan.set, []);
  assert.equal(plan.status, null);
  assert.ok(plan.skipped);
});

test('done, cancelled and archived tasks are never modified', () => {
  for (const status of ['Done', 'Cancelled', 'Archived']) {
    for (const event of ['start', 'merge', 'release']) {
      const plan = planUpdate(event, { status, dates: {} }, day);
      assert.deepEqual(plan.set, [], `${event} on ${status}`);
      assert.equal(plan.status, null);
    }
  }
});

test('an unknown event is rejected', () => {
  assert.throws(() => planUpdate('other', { status: 'Development', dates: {} }, day), /Unknown event/);
});

test('previousTag returns the release just before the current one', () => {
  const tags = ['v3.261126.0', 'v3.261124.0', 'v3.261120.0'];
  assert.equal(previousTag(tags, 'v3.261126.0'), 'v3.261124.0');
  assert.equal(previousTag(tags, 'v3.261120.0'), null);
  assert.equal(previousTag(tags, 'v9.0.0'), null);
});

test('buildAlert carries everything n8n needs to handle the alert', () => {
  const body = buildAlert({
    type: 'planned_eta_missing',
    message: 'Development started without a Planned ETA: #12 Add dates.',
    issues: [{ number: '12', title: 'Add dates', url: 'https://example.test/12' }],
    event: 'start',
    repository: 'XTM-Hub/xtm-hub',
    runUrl: 'https://example.test/run/1',
    pullRequest: { number: '5', url: 'https://example.test/pr/5', author: 'dev' },
    now: new Date('2026-11-26T10:00:00Z'),
  });
  assert.deepEqual(body, {
    source: 'xtm-hub/project-dates',
    type: 'planned_eta_missing',
    severity: 'warning',
    event: 'start',
    repository: 'XTM-Hub/xtm-hub',
    occurred_at: '2026-11-26T10:00:00.000Z',
    run_url: 'https://example.test/run/1',
    pull_request: { number: '5', url: 'https://example.test/pr/5', author: 'dev' },
    release: null,
    issues: [{ number: '12', title: 'Add dates', url: 'https://example.test/12' }],
    message: 'Development started without a Planned ETA: #12 Add dates.',
  });
});

test('buildAlert leaves optional context empty and rejects an unknown type', () => {
  const body = buildAlert({ type: 'previous_tag_missing', message: 'No previous tag', event: 'release', repository: 'r' });
  assert.equal(body.run_url, null);
  assert.equal(body.pull_request, null);
  assert.deepEqual(body.issues, []);
  assert.throws(() => buildAlert({ type: 'other', message: 'x' }), /Unknown alert type/);
  assert.ok(ALERT_TYPES.includes('update_failed'));
});
