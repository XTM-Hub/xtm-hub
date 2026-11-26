import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIELDS, extractIssueNumbers, plannedEtaWarning, planUpdate, previousTag } from './project-dates-lib.mjs';

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

test('plannedEtaWarning lists the issues in a ready to display message', () => {
  const body = plannedEtaWarning({
    repository: 'XTM-Hub/xtm-hub',
    pullRequest: { number: '5', url: 'https://example.test/pr/5', author: 'dev' },
    issues: [{ number: '12', title: 'Add dates', url: 'https://example.test/12' }],
  });
  assert.equal(body.type, 'planned_eta_missing');
  assert.match(body.message, /#12 Add dates/);
  assert.equal(body.issues.length, 1);
});
