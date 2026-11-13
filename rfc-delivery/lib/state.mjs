// The two files of an RFC's tracking folder in the private repository, BMAD style:
//   chunks.yaml      the plan (BMAD's stories.yaml): written by the start-rfc skill, reviewed by the
//                    team in the private pull request, never written by run.sh.
//   rfc-status.yaml  the state (BMAD's sprint-status.yaml): written by run.sh only.
// Pure functions over parsed data, plus load/save helpers that keep the YAML comments.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, parseDocument } from 'yaml';

export const CHUNK_STATUSES = ['backlog', 'ready-for-dev', 'in-progress', 'review', 'done', 'merged', 'blocked', 'external'];
export const SLICE_STATUSES = ['backlog', 'in-progress', 'done'];
export const RFC_STATUSES = ['planning', 'in-progress', 'review', 'done'];
// A chunk whose code is on its branch and green: the stack may build on it.
export const SETTLED = new Set(['done', 'merged']);
// A chunk id is its slice key plus a name: `ms-001` alone is the slice's own key in the status file.
export const CHUNK_ID = /^ms-\d+[a-z]?(-[a-z0-9]+)+$/;
export const COMMIT_TYPES = ['feat', 'fix', 'chore', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'revert'];

export const sliceKey = (sliceId) => sliceId.toLowerCase();
// Header fields the delivery writes as it goes: a re-plan keeps their values.
export const STATE_FIELDS = ['rfc_issue', 'branch', 'pull_request', 'private_pull_request', 'rfc_status'];
const none = (v) => v === undefined || v === null || v === '' || v === 'none';

// ---------------------------------------------------------------- files

export const paths = (dir) => ({
  plan: join(dir, 'chunks.yaml'),
  status: join(dir, 'rfc-status.yaml'),
  spec: (id) => join(dir, 'chunks', `${id}.md`),
});

export const loadPlan = (dir) => {
  const plan = parseYaml(readFileSync(paths(dir).plan, 'utf8')) ?? {};
  plan.chunks = plan.chunks ?? [];
  return plan;
};

export const loadStatusDoc = (dir) => parseDocument(readFileSync(paths(dir).status, 'utf8'));
export const loadStatus = (dir) => loadStatusDoc(dir).toJS() ?? {};
export const saveStatusDoc = (dir, doc) => writeFileSync(paths(dir).status, doc.toString({ lineWidth: 0 }));

// The frontmatter of a chunk spec, or null when the spec does not exist yet.
export const specFrontmatter = (dir, id) => {
  const file = paths(dir).spec(id);
  if (!existsSync(file)) return null;
  const match = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? (parseYaml(match[1]) ?? {}) : {};
};

// ---------------------------------------------------------------- derived views

export const ourChunks = (plan, status) =>
  plan.chunks.filter((c) => (c.repository ?? status.repository) === status.repository);

const chunkStatus = (status, id) => status.development_status?.[id] ?? 'backlog';

// A slice is done when every chunk of it is settled; in progress once one of them started.
export const sliceStatus = (plan, status, sliceId) => {
  const chunks = plan.chunks.filter((c) => c.slice === sliceId);
  const states = chunks.map((c) => chunkStatus(status, c.id));
  if (states.length && states.every((s) => SETTLED.has(s) || s === 'external')) return 'done';
  if (states.some((s) => s !== 'backlog')) return 'in-progress';
  return 'backlog';
};

// The status file generated from a plan: every slice and chunk, in plan order. Existing statuses
// and chunk facts are kept, so a plan revised in the private pull request can be merged in again.
export const generateStatus = (plan, header, previous = {}) => {
  const development_status = {};
  const chunks = {};
  const prevStatus = previous.development_status ?? {};
  const prevChunks = previous.chunks ?? {};
  let lastSlice = null;
  for (const c of plan.chunks) {
    if (c.slice !== lastSlice) {
      development_status[sliceKey(c.slice)] = 'backlog';
      lastSlice = c.slice;
    }
    const external = (c.repository ?? header.repository) !== header.repository;
    development_status[c.id] = prevStatus[c.id] ?? (external ? 'external' : 'backlog');
    chunks[c.id] = { issue: 'none', branch: 'none', pull_request: 'none', ...(prevChunks[c.id] ?? {}) };
  }
  // A re-plan passes the whole header again: it must not reset what the delivery already created
  // (issues, branches, pull requests) nor send a running delivery back to planning.
  const kept = {};
  for (const [k, v] of Object.entries(header)) {
    if (STATE_FIELDS.includes(k) && previous[k] !== undefined && !none(previous[k])) continue;
    kept[k] = v;
  }
  const out = { ...previous, ...kept, development_status, chunks };
  for (const s of new Set(plan.chunks.map((c) => c.slice))) development_status[sliceKey(s)] = sliceStatus(plan, out, s);
  return out;
};

// ---------------------------------------------------------------- validation

// Everything that would make the loop do the wrong thing. With the RFC, also its coverage: every
// slice of the RFC in some chunk, every acceptance criterion a chunk claims exists.
export const validate = (plan, status, rfc = null) => {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const order = new Map(plan.chunks.map((c, i) => [c.id, i]));
  if (!plan.rfc) errors.push('chunks.yaml: rfc is missing');
  if (status.rfc && plan.rfc && status.rfc !== plan.rfc) errors.push(`chunks.yaml is for ${plan.rfc}, rfc-status.yaml for ${status.rfc}`);
  if (plan.chunks.length === 0) errors.push('chunks.yaml: no chunk');
  for (const c of plan.chunks) {
    const where = `chunk ${c.id ?? '?'}`;
    if (!c.id || !CHUNK_ID.test(c.id)) errors.push(`${where}: id must look like ms-001-short-name (lowercase, starts with its slice)`);
    if (ids.has(c.id)) errors.push(`${where}: duplicate id`);
    ids.add(c.id);
    if (!/^MS-\d+$/.test(c.slice ?? '')) errors.push(`${where}: slice must be an MS-NNN id of the RFC`);
    else if (c.id && !c.id.startsWith(sliceKey(c.slice))) errors.push(`${where}: id must start with ${sliceKey(c.slice)}`);
    if (!c.title) errors.push(`${where}: title is missing`);
    if (c.type && !COMMIT_TYPES.includes(c.type)) errors.push(`${where}: type ${c.type} is not a conventional commit type`);
    if (c.scope && !/^[a-z0-9._/-]+$/.test(c.scope)) errors.push(`${where}: scope must be lowercase`);
    for (const d of c.depends_on ?? []) {
      if (!order.has(d)) errors.push(`${where}: depends on unknown chunk ${d}`);
      else if (order.get(d) > order.get(c.id)) errors.push(`${where}: depends on ${d}, which comes later in the stack`);
    }
    if (!(c.acceptance ?? []).length && !c.no_acceptance_reason)
      warnings.push(`${where}: claims no acceptance criterion (set no_acceptance_reason for a purely technical chunk)`);
  }
  // Slice order: the chunks of one slice are contiguous, so the stack reads slice by slice.
  const seen = new Set();
  let last = null;
  for (const c of plan.chunks) {
    if (c.slice !== last && seen.has(c.slice)) errors.push(`the chunks of ${c.slice} are not contiguous in chunks.yaml`);
    seen.add(c.slice);
    last = c.slice;
  }
  for (const [key, value] of Object.entries(status.development_status ?? {})) {
    const isSlice = /^ms-\d+$/.test(key);
    if (isSlice ? !SLICE_STATUSES.includes(value) : !CHUNK_STATUSES.includes(value))
      errors.push(`rfc-status.yaml: ${key} has an unknown status ${value}`);
    if (!isSlice && !ids.has(key)) errors.push(`rfc-status.yaml: ${key} is not in chunks.yaml`);
  }
  if (status.public_title !== undefined && !/^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\([a-z0-9._/-]+\))?!?: .+[^)]$/.test(status.public_title))
    errors.push(`rfc-status.yaml: public_title "${status.public_title}" must read like a pull request title without its issue, e.g. "feat(library): save searches"`);
  if (status.rfc_status && !RFC_STATUSES.includes(status.rfc_status)) errors.push(`rfc-status.yaml: unknown rfc_status ${status.rfc_status}`);
  if (rfc) {
    const slices = new Set(rfc.slices.map((s) => s.id));
    const acs = new Set(rfc.acceptance.map((a) => a.id));
    for (const c of plan.chunks) {
      if (c.slice && !slices.has(c.slice)) errors.push(`chunk ${c.id}: ${c.slice} is not a slice of ${rfc.id}`);
      for (const ac of c.acceptance ?? []) if (!acs.has(ac)) errors.push(`chunk ${c.id}: ${ac} is not an acceptance criterion of ${rfc.id}`);
    }
    const planned = new Set(plan.chunks.map((c) => c.slice));
    const skipped = new Map(Object.entries(plan.skipped_slices ?? {}));
    for (const s of rfc.slices) {
      if (!planned.has(s.id) && !skipped.has(s.id)) errors.push(`${s.id} of the RFC is in no chunk and not in skipped_slices`);
    }
    const claimed = new Set(plan.chunks.flatMap((c) => c.acceptance ?? []));
    const unclaimed = rfc.acceptance.map((a) => a.id).filter((id) => !claimed.has(id));
    if (unclaimed.length) warnings.push(`acceptance criteria no chunk claims: ${unclaimed.join(', ')} (fine when their slice is skipped or delivered elsewhere)`);
  }
  return { errors, warnings };
};

// ---------------------------------------------------------------- planning

// The next action of run.sh, as { action, chunk?, detail? }:
//   approve    the plan waits for the team's approval of the private pull request
//   ci         a pushed chunk waits for its required checks
//   run        build this chunk (spec, then build)
//   hold-spec  its spec waits for a human approval (spec_checkpoint)
//   wait       the chunk is blocked on a question nobody answered yet
//   stuck      a dependency is not settled (an external chunk, or a plan out of order)
//   gate       every chunk is settled: global RFC review
//   hold       the RFC review waits for a human
//   end        delivered
// `waiting` lists the blocked chunks whose question has no answer yet; `specApproved(id)` tells
// whether a human approved the spec of a chunk that asks for it.
export const next = (plan, status, { waiting = [], specApproved = () => false } = {}) => {
  const rfcStatus = status.rfc_status ?? 'planning';
  if (rfcStatus === 'planning') return { action: 'approve' };
  if (rfcStatus === 'done') return { action: 'end' };
  const mine = ourChunks(plan, status);
  const inReview = mine.find((c) => chunkStatus(status, c.id) === 'review');
  if (inReview) return { action: 'ci', chunk: inReview.id };
  for (const c of mine) {
    const s = chunkStatus(status, c.id);
    if (SETTLED.has(s)) continue;
    if (s === 'blocked' && waiting.includes(c.id)) return { action: 'wait', chunk: c.id };
    const pending = (c.depends_on ?? []).filter((d) => !SETTLED.has(chunkStatus(status, d)));
    if (pending.length) return { action: 'stuck', chunk: c.id, detail: pending.join(',') };
    if (s === 'ready-for-dev' && c.spec_checkpoint && !specApproved(c.id)) return { action: 'hold-spec', chunk: c.id };
    return { action: 'run', chunk: c.id };
  }
  return { action: rfcStatus === 'review' ? 'hold' : 'gate' };
};

// The branch a chunk stacks on: the nearest earlier chunk of this repository whose pull request
// is not merged yet, else the RFC branch.
export const stackBase = (plan, status, id) => {
  const mine = ourChunks(plan, status);
  const index = mine.findIndex((c) => c.id === id);
  if (index < 0) throw new Error(`unknown chunk ${id}`);
  for (let i = index - 1; i >= 0; i--) {
    const prev = mine[i];
    if (chunkStatus(status, prev.id) === 'merged') continue;
    const branch = status.chunks?.[prev.id]?.branch;
    if (!none(branch)) return branch;
  }
  return status.branch;
};

// The chunks above a given one in the stack, in order: those a fix on it must be carried into.
export const above = (plan, status, id) => {
  const mine = ourChunks(plan, status);
  const index = mine.findIndex((c) => c.id === id);
  return mine.slice(index + 1).filter((c) => !none(status.chunks?.[c.id]?.branch) && chunkStatus(status, c.id) !== 'merged');
};

// ---------------------------------------------------------------- names and texts

export const chunkTitle = (c, issue) => `${c.type ?? 'feat'}${c.scope ? `(${c.scope})` : ''}: ${c.title}${none(issue) ? '' : ` (#${issue})`}`;

const box = (s) => (SETTLED.has(s) ? 'x' : ' ');
const pr = (n) => (none(n) ? '' : ` · PR #${n}`);

// Body of the RFC pull request in the public repository. Titles only: the specs stay private.
export const publicPrBody = (plan, status) => {
  const lines = [];
  lines.push(`Implements: ${status.rfc}`);
  lines.push('');
  lines.push(
    `Delivers ${status.rfc} as a stack of pull requests, one per chunk of its delivery plan. Generated by \`rfc-delivery/run.sh\`; the specs and the review trail live in the private tracking pull request.`,
  );
  lines.push('');
  lines.push('Review the chunk pull requests from the bottom of the stack up, and merge them into this branch with a merge commit: a squash rewrites what the chunks above are built on.');
  let last = null;
  for (const c of plan.chunks) {
    if (c.slice !== last) {
      lines.push('', `### ${c.slice}: ${sliceStatus(plan, status, c.slice)}`, '');
      last = c.slice;
    }
    const s = chunkStatus(status, c.id);
    const facts = status.chunks?.[c.id] ?? {};
    lines.push(`- [${box(s)}] ${none(facts.issue) ? '' : `#${facts.issue} `}${c.title}: ${s}${pr(facts.pull_request)}`);
  }
  const blocked = plan.chunks.filter((c) => chunkStatus(status, c.id) === 'blocked');
  if (blocked.length) {
    lines.push('', '## Needs a human', '');
    for (const c of blocked) lines.push(`- [ ] \`${c.id}\`: \`rfc-delivery/run.sh debug ${c.id}\``);
  }
  lines.push('');
  const closes = [status.rfc_issue, ...plan.chunks.map((c) => status.chunks?.[c.id]?.issue)].filter((n) => !none(n));
  for (const n of closes) lines.push(`Closes #${n}`);
  return lines.join('\n');
};

// Body of the tracking pull request in the private repository: the plan, then what the reviews
// left to decide. `sections(id)` returns the bullets of a chunk spec's sections.
export const privatePrBody = (plan, status, sections = () => ({})) => {
  const lines = [];
  const src = status.source ?? {};
  lines.push(`Tracks the delivery of ${status.rfc}${status.title ? `, "${status.title}"` : ''}.`);
  lines.push('');
  lines.push(`- RFC: \`${src.path ?? '?'}\` on \`${src.branch ?? '?'}\` of ${src.repository ?? '?'}, read at \`${String(src.sha ?? '?').slice(0, 12)}\``);
  lines.push(`- Code: ${status.repository}, branch \`${status.branch}\`${none(status.pull_request) ? '' : `, PR ${status.repository}#${status.pull_request}`}`);
  lines.push(`- Status: **${status.rfc_status}**`);
  lines.push('');
  lines.push(
    status.rfc_status === 'planning'
      ? '**Review the split below.** Comment on `chunks.yaml`, then approve this pull request: the approval starts the loop (`rfc-delivery/run.sh`).'
      : 'The loop commits each chunk spec and every status change here. Merge this pull request with the final one.',
  );
  lines.push('', '| Chunk | Slice | Acceptance | Depends on | Status | PR |', '| --- | --- | --- | --- | --- | --- |');
  for (const c of plan.chunks) {
    const facts = status.chunks?.[c.id] ?? {};
    lines.push(
      `| \`${c.id}\`${none(facts.issue) ? '' : ` #${facts.issue}`} | ${c.slice} | ${(c.acceptance ?? []).join(', ') || '—'} | ${(c.depends_on ?? []).join(', ') || '—'} | ${chunkStatus(status, c.id)} | ${none(facts.pull_request) ? '' : `#${facts.pull_request}`} |`,
    );
  }
  for (const heading of ['To validate', 'Deferred findings']) {
    const block = [];
    for (const c of plan.chunks) {
      const bullets = sections(c.id)[heading] ?? [];
      if (!bullets.length) continue;
      block.push('', `### \`${c.id}\``, '');
      for (const b of bullets) block.push(b.startsWith('[x] ') ? `- [x] ${b.slice(4)}` : `- [ ] ${b}`);
    }
    if (block.length) lines.push('', `## ${heading}`, ...block);
  }
  return lines.join('\n');
};

// The bullets of every `## Heading` section of a markdown text, wrapped lines joined.
export const bulletsBySection = (text) => {
  const out = {};
  let heading = null;
  let item = null;
  const flush = () => {
    if (heading && item) (out[heading] ??= []).push(item);
    item = null;
  };
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^## (.+?)\s*$/);
    if (h) {
      flush();
      heading = h[1];
    } else if (/^- /.test(line)) {
      flush();
      item = line.slice(2).trim();
    } else if (item && /^\s+\S/.test(line)) {
      item += ` ${line.trim()}`;
    } else if (!line.trim()) {
      flush();
    }
  }
  flush();
  return out;
};

// ---------------------------------------------------------------- chunk spec contract

export const SPEC_SECTIONS = ['Intent', 'Acceptance criteria', 'Boundaries & Constraints', 'I/O & Edge-Case Matrix',
  'Code Map', 'Tasks', 'Screens', 'Verification', 'Decisions', 'To validate', 'Deferred findings'];

const sameSet = (a = [], b = []) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

// What the build session and the scripts rely on in a chunk spec. Returns { errors, warnings }.
export const checkSpec = (text, chunk, status) => {
  const errors = [];
  const warnings = [];
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { errors: ['no frontmatter'], warnings };
  let fm;
  try {
    fm = parseYaml(match[1]) ?? {};
  } catch (error) {
    return { errors: [`frontmatter is not YAML: ${error.message}`], warnings };
  }
  if (fm.chunk !== chunk.id) errors.push(`chunk is ${fm.chunk}, expected ${chunk.id}`);
  if (fm.rfc !== status.rfc) errors.push(`rfc is ${fm.rfc}, expected ${status.rfc}`);
  if (fm.slice !== chunk.slice) errors.push(`slice is ${fm.slice}, expected ${chunk.slice}`);
  if (status.source?.sha && fm.rfc_sha !== status.source.sha) errors.push(`rfc_sha is not the RFC commit of rfc-status.yaml (${status.source.sha})`);
  if (!/^[0-9a-f]{40}$/.test(String(fm.baseline_revision ?? ''))) errors.push('baseline_revision must be a full commit sha');
  if (!sameSet(fm.acceptance ?? [], chunk.acceptance ?? [])) errors.push(`acceptance ${JSON.stringify(fm.acceptance)} differs from chunks.yaml ${JSON.stringify(chunk.acceptance ?? [])}`);
  if (!sameSet(fm.tests ?? [], chunk.tests ?? [])) warnings.push(`tests ${JSON.stringify(fm.tests)} differ from chunks.yaml ${JSON.stringify(chunk.tests ?? [])}`);
  if (!('approved_by' in fm)) errors.push('approved_by is missing (none until a human approves)');
  const body = text.slice(match[0].length);
  if (!/<intent-contract>[\s\S]*<\/intent-contract>/.test(body)) errors.push('no <intent-contract> block');
  const headings = new Set([...body.matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]));
  for (const s of SPEC_SECTIONS) if (!headings.has(s)) errors.push(`missing section "## ${s}"`);
  for (const ac of chunk.acceptance ?? []) if (!new RegExp(`^\\|\\s*${ac}\\s*\\|`, 'm').test(body)) errors.push(`${ac} has no row under "## Acceptance criteria"`);
  if (/\{\{|\bTBD\b|\bTODO\b/.test(body)) errors.push('placeholders left (TBD, TODO or {{…}})');
  if (/<!--/.test(body)) warnings.push('template comments left');
  const screens = body.match(/^## Screens\n[\s\S]*?```json\n([\s\S]*?)\n```/m);
  if (screens) {
    try {
      if (!Array.isArray(JSON.parse(screens[1]))) errors.push('"## Screens" JSON is not an array');
    } catch {
      errors.push('"## Screens" JSON does not parse');
    }
  }
  return { errors, warnings };
};
