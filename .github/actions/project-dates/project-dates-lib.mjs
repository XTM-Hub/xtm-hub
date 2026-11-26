// Pure rules of the task tracking dates (Planned ETA, Dev start date, Adjusted ETA, Prod date).
// No network access here: project-dates.mjs reads the project, calls these functions and applies the result.

export const FIELDS = {
  start: 'Dev start date',
  planned: 'Planned ETA',
  adjusted: 'Adjusted ETA',
  prod: 'Prod date',
};

export const DONE_STATUS = 'Done';
const READY_TO_DEPLOY = 'ready to deploy';
// The same statuses pr-issue-automation.yml never modifies.
const FROZEN_STATUSES = ['done', 'cancelled', 'archived'];

/** Issue numbers a pull request refers to, ignoring everything under its "Release notes" heading. */
export function extractIssueNumbers({ title = '', body = '' }) {
  let inReleaseNotes = false;
  const kept = [];
  for (const line of (body || '').split('\n')) {
    if (/^#{1,6}\s*release\s*notes?\b/i.test(line)) inReleaseNotes = true;
    else if (/^#{1,6}\s/.test(line)) inReleaseNotes = false;
    if (!inReleaseNotes) kept.push(line);
  }

  const numbers = new Set();
  for (const text of [kept.join('\n'), title || '']) {
    for (const match of text.matchAll(/#(\d+)/g)) numbers.add(match[1]);
  }
  return [...numbers];
}

export function today(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * What to write on a project item for an event.
 *
 * - start: Dev start date, only when still empty. When this run just started the task and Planned ETA is empty,
 *   it also reports `planned_eta_missing`, once per task since the start date is never written twice.
 * - merge: Adjusted ETA, overwritten, so the latest merge wins.
 * - release: Prod date (only when empty) and the Done status, only for a task waiting in "Ready to Deploy".
 *
 * `item` is `{ status, dates }`, `dates` being the date field values by field name.
 */
export function planUpdate(event, item, day) {
  const status = (item.status || '').toLowerCase();
  const dates = item.dates || {};
  const plan = { set: [], status: null, warnings: [], skipped: null };

  if (FROZEN_STATUSES.includes(status)) {
    plan.skipped = `status is "${item.status}"`;
    return plan;
  }

  if (event === 'start') {
    if (dates[FIELDS.start]) {
      plan.skipped = `${FIELDS.start} is already ${dates[FIELDS.start]}`;
      return plan;
    }
    plan.set.push({ field: FIELDS.start, date: day });
    if (!dates[FIELDS.planned]) plan.warnings.push('planned_eta_missing');
  } else if (event === 'merge') {
    plan.set.push({ field: FIELDS.adjusted, date: day });
  } else if (event === 'release') {
    if (status !== READY_TO_DEPLOY) {
      plan.skipped = `status is "${item.status || 'empty'}", not "Ready to Deploy"`;
      return plan;
    }
    if (!dates[FIELDS.prod]) plan.set.push({ field: FIELDS.prod, date: day });
    plan.status = DONE_STATUS;
  } else {
    throw new Error(`Unknown event "${event}"`);
  }
  return plan;
}

/** The tag released just before `current`, from tags sorted newest first. Null for the first release. */
export function previousTag(tagsNewestFirst, current) {
  const index = tagsNewestFirst.indexOf(current);
  if (index === -1) return null;
  return tagsNewestFirst[index + 1] ?? null;
}

export const ALERT_TYPES = [
  'planned_eta_missing', // development started on tasks without a Planned ETA
  'project_field_not_found', // a project field this script writes was renamed or removed
  'status_not_found', // the Done status is not an option of the project any more
  'update_failed', // the GitHub API refused to read or write a task
  'previous_tag_missing', // a release without a previous release tag: no Prod date written
  'script_failed', // the script itself crashed
];

/**
 * Body posted to the n8n webhook for one alert. n8n owns what happens next (Teams, routing, formatting), so the body
 * carries everything it may need: what happened, on which tasks, and where to look. `message` is ready to display.
 */
export function buildAlert({ type, message, issues = [], event, repository, runUrl, pullRequest = null, release = null, now = new Date() }) {
  if (!ALERT_TYPES.includes(type)) throw new Error(`Unknown alert type "${type}"`);
  return {
    source: 'xtm-hub/project-dates',
    type,
    severity: 'warning',
    event,
    repository,
    occurred_at: now.toISOString(),
    run_url: runUrl || null,
    pull_request: pullRequest,
    release,
    issues,
    message,
  };
}
