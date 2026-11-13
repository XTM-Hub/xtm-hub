#!/usr/bin/env node
// The deterministic half of rfc-delivery: reads Flow RFCs, keeps the tracking files of the private
// repository, and plans the loop. run.sh and the skills call it; it never runs git writes, gh or
// claude. Every command prints plain text, or JSON with --json.
//
//   node rfc-delivery/cli.mjs locate <RFC-ID> --flow <filigran-flow checkout>   where the RFC is
//   node rfc-delivery/cli.mjs parse <rfc.md | branch:path --flow <dir>>         the RFC as JSON
//   node rfc-delivery/cli.mjs readiness <rfc.md> [--repository owner/name]      PASS | CONCERNS | FAIL
//   node rfc-delivery/cli.mjs check-flow <filigran-flow checkout>               parse every RFC on every branch
//   node rfc-delivery/cli.mjs generate <dir> [--header json]                    rfc-status.yaml from chunks.yaml
//   node rfc-delivery/cli.mjs validate <dir> [--rfc rfc.md]                     exit 1 on an error
//   node rfc-delivery/cli.mjs next <dir> [--waiting a,b]                        "<action> <chunk|-> <detail|->"
//   node rfc-delivery/cli.mjs list <dir>                                        "<slice> <chunk> <status>" per chunk
//   node rfc-delivery/cli.mjs get <dir> <path.to.field>                         one value of rfc-status.yaml
//   node rfc-delivery/cli.mjs set <dir> <chunk|rfc_status|header path> <value>  writes rfc-status.yaml
//   node rfc-delivery/cli.mjs chunk <dir> <chunk>                               the plan entry and its facts, JSON
//   node rfc-delivery/cli.mjs title <dir> <chunk>                               its pull request title
//   node rfc-delivery/cli.mjs base <dir> <chunk>                                the branch it stacks on
//   node rfc-delivery/cli.mjs above <dir> <chunk>                               the chunks stacked above it
//   node rfc-delivery/cli.mjs check-spec <dir> <chunk>                          the chunk spec's contract
//   node rfc-delivery/cli.mjs pr-body <dir> | private-pr-body <dir>
//
// <dir> is the RFC's folder in the private repository: <private>/rfc-delivery/<RFC-ID>/.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseRfc, readiness } from './lib/rfc.mjs';
import * as st from './lib/state.mjs';
import { Document } from 'yaml';

const STATUS_HEADER = `# Delivery status of one RFC, BMAD sprint-status style. Written by rfc-delivery/run.sh only:
# the plan is chunks.yaml, reviewed by the team in the tracking pull request.
#
# rfc_status:  planning (the plan waits for the team) | in-progress | review (RFC review posted) | done
# Slice (ms-NNN): backlog | in-progress | done, derived from its chunks
# Chunk:
#   backlog        not started
#   ready-for-dev  its spec is written (with spec_checkpoint, it waits for approved_by in the spec)
#   in-progress    a session is working on it
#   review         committed and pushed, its pull request's required checks are running
#   done           checks pass; its pull request waits for the team, stacked on the one below
#   merged         a human merged its pull request into the RFC branch
#   blocked        needs a human: the question is on the tracking pull request
#   external       another repository delivers it; set to done or merged by hand
`;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};
const json = args.includes('--json') && args.splice(args.indexOf('--json'), 1);
const out = (value) => {
  if (json || (typeof value === 'object' && value !== null)) console.log(JSON.stringify(value, null, 2));
  else if (value !== undefined) console.log(value);
};
const fail = (message, code = 1) => {
  console.error(message);
  process.exit(code);
};

const gitIn = (dir) => (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', maxBuffer: 64e6 });

// The RFC's text: a file, or `<branch>:<path>` read with git from a Flow checkout.
const readRfc = (spec, flow) => {
  if (existsSync(spec)) return readFileSync(spec, 'utf8');
  if (flow && spec.includes(':')) return gitIn(flow)('show', spec);
  return fail(`no such RFC: ${spec}`);
};

// Every rfcs/<id>/rfc.md on the remote branches of a Flow checkout, with the branch that holds it.
// An RFC on several branches is reported on each: main first, then the most recent commit.
const flowRfcs = (flow) => {
  const git = gitIn(flow);
  const branches = git('for-each-ref', '--sort=-committerdate', '--format=%(refname:short)', 'refs/remotes')
    .split('\n')
    .filter((b) => b && !b.endsWith('/HEAD') && b.includes('/'));
  branches.sort((a, b) => (a.endsWith('/main') ? -1 : b.endsWith('/main') ? 1 : 0));
  const found = [];
  for (const branch of branches) {
    for (const path of git('ls-tree', '-r', '--name-only', branch, 'rfcs').split('\n')) {
      const m = path.match(/^rfcs\/(RFC-[A-Z]+-\d+)-[^/]+\/rfc\.md$/);
      if (m) found.push({ id: m[1], branch, path });
    }
  }
  return found;
};

const [command, ...rest] = args;
const dir = rest[0];

switch (command) {
  case 'locate': {
    const flow = flag('flow') ?? fail('--flow <filigran-flow checkout> is required');
    const id = rest[0] ?? fail('usage: locate <RFC-ID> --flow <dir>');
    const hits = flowRfcs(flow).filter((r) => r.id === id);
    if (!hits.length) fail(`${id} is on no branch of ${flow} (git fetch first?)`);
    const git = gitIn(flow);
    const remote = git('remote', 'get-url', hits[0].branch.split('/')[0]).trim();
    const repository = remote.replace(/^.*[:/]([^/]+\/[^/]+?)(\.git)?$/, '$1');
    const located = hits.map((h) => ({
      ...h,
      repository,
      sha: git('rev-parse', h.branch).trim(),
      last_change: git('log', '-1', '--format=%cI', h.branch, '--', h.path).trim(),
    }));
    out(located);
    break;
  }
  case 'parse': {
    out(parseRfc(readRfc(rest[0] ?? fail('usage: parse <rfc>'), flag('flow'))));
    break;
  }
  case 'readiness': {
    const repository = flag('repository') ?? 'XTM-Hub/xtm-hub';
    const result = readiness(parseRfc(readRfc(rest[0] ?? fail('usage: readiness <rfc>'), flag('flow'))), { repository });
    out(result);
    if (result.gate === 'FAIL') process.exit(2);
    break;
  }
  case 'check-flow': {
    const flow = rest[0] ?? fail('usage: check-flow <filigran-flow checkout>');
    const seen = new Set();
    let bad = 0;
    for (const r of flowRfcs(flow)) {
      if (seen.has(r.path)) continue;
      seen.add(r.path);
      const text = gitIn(flow)('show', `${r.branch}:${r.path}`);
      const count = (re) => (text.match(re) ?? []).length;
      try {
        const rfc = parseRfc(text);
        const want = { AC: count(/^\| AC-\d+/gm), MS: count(/^\| MS-\d+/gm), TST: count(/^\| TST-\d+/gm) };
        const got = { AC: rfc.acceptance.length, MS: rfc.slices.length, TST: rfc.tests.length };
        const ok = Object.keys(want).every((k) => want[k] === got[k]);
        if (!ok) bad++;
        console.log(`${ok ? 'ok      ' : 'MISMATCH'} ${rfc.id} AC ${got.AC}/${want.AC} MS ${got.MS}/${want.MS} TST ${got.TST}/${want.TST}`);
      } catch (error) {
        bad++;
        console.log(`ERROR    ${r.path} on ${r.branch}: ${error.message}`);
      }
    }
    if (seen.size === 0) fail(`no RFC on any branch of ${flow}`);
    console.log(`${seen.size} RFCs, ${bad} failing`);
    process.exit(bad ? 1 : 0);
  }
  case 'generate': {
    const plan = st.loadPlan(dir);
    const header = JSON.parse(flag('header') ?? '{}');
    const file = st.paths(dir).status;
    const previous = existsSync(file) ? st.loadStatus(dir) : {};
    const status = st.generateStatus(plan, { rfc: plan.rfc, ...header }, previous);
    const doc = existsSync(file) ? st.loadStatusDoc(dir) : null;
    if (doc) {
      for (const [k, v] of Object.entries(status)) doc.set(k, v);
      st.saveStatusDoc(dir, doc);
    } else {
      writeFileSync(file, `${STATUS_HEADER}\n${new Document(status).toString({ lineWidth: 0 })}`);
    }
    const { errors, warnings } = st.validate(plan, st.loadStatus(dir));
    for (const w of warnings) console.error(`warning: ${w}`);
    if (errors.length) fail(errors.map((e) => `error: ${e}`).join('\n'));
    out(file);
    break;
  }
  case 'validate': {
    const rfcPath = flag('rfc');
    const rfc = rfcPath ? parseRfc(readRfc(rfcPath, flag('flow'))) : null;
    const { errors, warnings } = st.validate(st.loadPlan(dir), st.loadStatus(dir), rfc);
    for (const w of warnings) console.log(`warning: ${w}`);
    for (const e of errors) console.log(`error: ${e}`);
    if (!errors.length) console.log('valid');
    process.exit(errors.length ? 1 : 0);
  }
  case 'next': {
    const waiting = (flag('waiting') ?? '').split(',').filter(Boolean);
    const plan = st.loadPlan(dir);
    const status = st.loadStatus(dir);
    const specApproved = (id) => {
      const fm = st.specFrontmatter(dir, id);
      return Boolean(fm && fm.approved_by && fm.approved_by !== 'none');
    };
    const n = st.next(plan, status, { waiting, specApproved });
    out(json ? n : `${n.action} ${n.chunk ?? '-'} ${n.detail ?? '-'}`);
    break;
  }
  case 'list': {
    const plan = st.loadPlan(dir);
    const status = st.loadStatus(dir);
    for (const c of plan.chunks) console.log(`${c.slice} ${c.id} ${status.development_status?.[c.id] ?? 'backlog'}`);
    break;
  }
  case 'get': {
    const value = (rest[1] ?? fail('usage: get <dir> <path>')).split('.').reduce((o, k) => o?.[k], st.loadStatus(dir));
    out(value === undefined || value === null ? '' : value);
    break;
  }
  case 'set': {
    const [, key, value] = rest;
    if (!key || value === undefined) fail('usage: set <dir> <chunk|field.path> <value>');
    const plan = st.loadPlan(dir);
    const doc = st.loadStatusDoc(dir);
    const isChunk = plan.chunks.some((c) => c.id === key);
    if (isChunk) {
      if (!st.CHUNK_STATUSES.includes(value)) fail(`unknown chunk status ${value}`);
      doc.setIn(['development_status', key], value);
      const status = doc.toJS();
      for (const s of new Set(plan.chunks.map((c) => c.slice)))
        doc.setIn(['development_status', st.sliceKey(s)], st.sliceStatus(plan, status, s));
    } else {
      if (key === 'rfc_status' && !st.RFC_STATUSES.includes(value)) fail(`unknown rfc_status ${value}`);
      const coerced = /^\d+$/.test(value) ? Number(value) : value === 'true' ? true : value === 'false' ? false : value;
      doc.setIn(key.split('.'), coerced);
    }
    st.saveStatusDoc(dir, doc);
    break;
  }
  case 'chunk': {
    const plan = st.loadPlan(dir);
    const status = st.loadStatus(dir);
    const c = plan.chunks.find((x) => x.id === rest[1]) ?? fail(`unknown chunk ${rest[1]}`);
    const index = st.ourChunks(plan, status).findIndex((x) => x.id === c.id);
    out({ ...c, position: index + 1, of: st.ourChunks(plan, status).length, status: status.development_status?.[c.id] ?? 'backlog', ...(status.chunks?.[c.id] ?? {}) });
    break;
  }
  case 'title': {
    const plan = st.loadPlan(dir);
    const c = plan.chunks.find((x) => x.id === rest[1]) ?? fail(`unknown chunk ${rest[1]}`);
    out(st.chunkTitle(c, st.loadStatus(dir).chunks?.[c.id]?.issue));
    break;
  }
  case 'base': {
    out(st.stackBase(st.loadPlan(dir), st.loadStatus(dir), rest[1]));
    break;
  }
  case 'above': {
    out(st.above(st.loadPlan(dir), st.loadStatus(dir), rest[1]).map((c) => c.id).join(' '));
    break;
  }
  case 'check-spec': {
    const plan = st.loadPlan(dir);
    const c = plan.chunks.find((x) => x.id === rest[1]) ?? fail(`unknown chunk ${rest[1]}`);
    const file = st.paths(dir).spec(c.id);
    if (!existsSync(file)) fail(`no spec: ${file}`);
    const { errors, warnings } = st.checkSpec(readFileSync(file, 'utf8'), c, st.loadStatus(dir));
    for (const w of warnings) console.log(`warning: ${w}`);
    for (const e of errors) console.log(`error: ${e}`);
    if (!errors.length) console.log('valid');
    process.exit(errors.length ? 1 : 0);
  }
  case 'pr-body': {
    out(st.publicPrBody(st.loadPlan(dir), st.loadStatus(dir)));
    break;
  }
  case 'private-pr-body': {
    const sections = (id) => {
      const file = st.paths(dir).spec(id);
      return existsSync(file) ? st.bulletsBySection(readFileSync(file, 'utf8')) : {};
    };
    out(st.privatePrBody(st.loadPlan(dir), st.loadStatus(dir), sections));
    break;
  }
  default:
    fail(`unknown command ${command ?? ''}: see the header of rfc-delivery/cli.mjs`);
}
