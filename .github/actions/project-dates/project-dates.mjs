// Writes the task tracking dates on the project items of the issues a pull request or a release carries.
//   node project-dates.mjs --event start|merge --issues 12,34 [--pr-number 5 --pr-url ... --pr-author ...]
//   node project-dates.mjs --event release --tag v3.261126.0 --previous-tag v3.261124.0
// `--dry-run` reads everything and writes nothing. Failures on one issue never stop the others.
import { parseArgs } from 'node:util';
import { FIELDS, extractIssueNumbers, plannedEtaWarning, planUpdate, today } from './project-dates-lib.mjs';

const { values: args } = parseArgs({
  options: {
    event: { type: 'string' },
    issues: { type: 'string', default: '' },
    tag: { type: 'string', default: '' },
    'previous-tag': { type: 'string', default: '' },
    'pr-number': { type: 'string', default: '' },
    'pr-url': { type: 'string', default: '' },
    'pr-author': { type: 'string', default: '' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const token = process.env.GH_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const [owner, repo] = (repository || '').split('/');
const organization = process.env.ORGANIZATION || owner;
const projectNumber = parseInt(process.env.PROJECT_NUMBER || '1', 10);
const apiUrl = process.env.GITHUB_API_URL || 'https://api.github.com';
const webhookUrl = process.env.PLANNED_ETA_WEBHOOK_URL || '';
const dryRun = args['dry-run'];

if (!token || !repository || !['start', 'merge', 'release'].includes(args.event)) {
  console.error('Usage: GH_TOKEN and GITHUB_REPOSITORY are required, --event is start, merge or release');
  process.exit(1);
}

const warn = (message) => console.log(`::warning::${message}`);

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${url} failed with ${response.status}`);
  return response.json();
}

async function graphql(query, variables) {
  const body = await request(`${apiUrl}/graphql`, { method: 'POST', body: JSON.stringify({ query, variables }) });
  if (body.errors) throw new Error(body.errors.map((e) => e.message).join('; '));
  return body.data;
}

const rest = (path) => request(`${apiUrl}${path}`);

async function loadProject() {
  const data = await graphql(
    `query($org: String!, $number: Int!) {
      organization(login: $org) {
        projectV2(number: $number) {
          id
          fields(first: 50) {
            nodes {
              ... on ProjectV2Field { id name dataType }
              ... on ProjectV2SingleSelectField { id name options { id name } }
            }
          }
        }
      }
    }`,
    { org: organization, number: projectNumber },
  );
  const project = data.organization.projectV2;
  const fields = new Map(project.fields.nodes.filter((field) => field?.name).map((field) => [field.name, field]));
  return { id: project.id, fields };
}

async function loadItem(issueNumber) {
  const data = await graphql(
    `query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) {
          title
          url
          projectItems(first: 10) {
            nodes {
              id
              project { number }
              fieldValues(first: 50) {
                nodes {
                  __typename
                  ... on ProjectV2ItemFieldSingleSelectValue { field { ... on ProjectV2SingleSelectField { name } } name }
                  ... on ProjectV2ItemFieldDateValue { field { ... on ProjectV2Field { name } } date }
                }
              }
            }
          }
        }
      }
    }`,
    { owner, repo, number: issueNumber },
  );
  const issue = data.repository.issue;
  const projectItem = issue?.projectItems.nodes.find((node) => node.project.number === projectNumber);
  if (!projectItem) return null;

  const dates = {};
  let status = '';
  for (const value of projectItem.fieldValues.nodes) {
    if (value.__typename === 'ProjectV2ItemFieldSingleSelectValue' && value.field?.name === 'Status') status = value.name;
    if (value.__typename === 'ProjectV2ItemFieldDateValue' && value.field?.name) dates[value.field.name] = value.date;
  }
  return { id: projectItem.id, title: issue.title, url: issue.url, status, dates };
}

async function writeField(project, itemId, field, value) {
  await graphql(
    `mutation($project: ID!, $item: ID!, $field: ID!, $value: ProjectV2FieldValue!) {
      updateProjectV2ItemFieldValue(input: { projectId: $project, itemId: $item, fieldId: $field, value: $value }) {
        projectV2Item { id }
      }
    }`,
    { project: project.id, item: itemId, field: field.id, value },
  );
}

/** Issue numbers of the pull requests merged between two release tags. */
async function issuesOfRelease(tag, previousTag) {
  const shas = [];
  for (let page = 1; ; page++) {
    const compare = await rest(`/repos/${repository}/compare/${previousTag}...${tag}?per_page=100&page=${page}`);
    shas.push(...compare.commits.map((commit) => commit.sha));
    if (compare.commits.length < 100) break;
  }

  const pullRequests = new Map();
  for (const sha of shas) {
    for (const pr of await rest(`/repos/${repository}/commits/${sha}/pulls`)) {
      if (pr.merged_at) pullRequests.set(pr.number, pr);
    }
  }
  console.log(`${tag}: ${shas.length} commit(s), ${pullRequests.size} merged pull request(s) since ${previousTag}`);
  return [...new Set([...pullRequests.values()].flatMap((pr) => extractIssueNumbers(pr)))];
}

async function main() {
  let issueNumbers = args.issues.split(',').filter(Boolean);
  if (args.event === 'release') {
    if (!args.tag || !args['previous-tag']) {
      warn('No previous release tag, the Prod date is not set for the first release');
      return;
    }
    issueNumbers = await issuesOfRelease(args.tag, args['previous-tag']);
  }
  if (issueNumbers.length === 0) {
    console.log('No issue to update');
    return;
  }

  const project = await loadProject();
  const day = today();
  const missingPlannedEta = [];

  for (const issueNumber of issueNumbers) {
    try {
      const item = await loadItem(parseInt(issueNumber, 10));
      if (!item) {
        console.log(`#${issueNumber} is not in project #${projectNumber}, skipping`);
        continue;
      }

      const plan = planUpdate(args.event, item, day);
      if (plan.skipped) {
        console.log(`#${issueNumber} skipped: ${plan.skipped}`);
        continue;
      }

      for (const { field: name, date } of plan.set) {
        const field = project.fields.get(name);
        if (!field) {
          warn(`Project field "${name}" not found, #${issueNumber} not updated`);
          continue;
        }
        console.log(`#${issueNumber}: ${name} = ${date}`);
        if (!dryRun) await writeField(project, item.id, field, { date });
      }

      if (plan.status) {
        const field = project.fields.get('Status');
        const option = field?.options?.find((o) => o.name.toLowerCase() === plan.status.toLowerCase());
        if (!option) {
          warn(`Status "${plan.status}" not found, #${issueNumber} not updated`);
        } else {
          console.log(`#${issueNumber}: Status = ${plan.status}`);
          if (!dryRun) await writeField(project, item.id, field, { singleSelectOptionId: option.id });
        }
      }

      // Without the Planned ETA field in the project, an empty value says nothing.
      if (plan.warnings.includes('planned_eta_missing') && project.fields.has(FIELDS.planned)) {
        missingPlannedEta.push({ number: issueNumber, title: item.title, url: item.url });
      }
    } catch (error) {
      // A "#123" in a pull request can be a pull request or an issue of another repository.
      if (/Could not resolve to an Issue/.test(error.message)) console.log(`#${issueNumber} is not an issue of ${repository}, skipping`);
      else warn(`#${issueNumber} not updated: ${error.message}`);
    }
  }

  if (missingPlannedEta.length === 0) return;
  const issues = missingPlannedEta.map((issue) => `#${issue.number}`).join(', ');
  warn(`Planned ETA missing on ${issues}`);
  if (!webhookUrl) {
    console.log('PLANNED_ETA_WEBHOOK_URL is not set, no Teams warning sent');
    return;
  }
  if (dryRun) return;
  const payload = plannedEtaWarning({
    repository,
    pullRequest: { number: args['pr-number'], url: args['pr-url'], author: args['pr-author'] },
    issues: missingPlannedEta,
  });
  try {
    await request(webhookUrl, { method: 'POST', body: JSON.stringify(payload) });
    console.log('Teams warning sent through n8n');
  } catch (error) {
    // The notification never fails the workflow, and the URL may carry a secret: do not print it.
    warn(`Teams warning not sent: ${error.message.replace(webhookUrl, '[webhook]')}`);
  }
}

await main();
