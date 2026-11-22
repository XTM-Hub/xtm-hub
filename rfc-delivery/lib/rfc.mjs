// Reads a Filigran Flow RFC (template rfc@5.x): its frontmatter, acceptance criteria, delivery
// slices, tests, risks and traceability, as plain data. Pure functions, no I/O: the callers read
// the file, from a checkout or from `git show <branch>:<path>`.
import { parse as parseYaml } from 'yaml';

export const ID_PATTERNS = {
  ac: /^AC-\d+$/,
  slice: /^MS-\d+$/,
  test: /^TST-\d+$/,
  risk: /^(RISK|OQ)-\d+$/,
};

// Splits `---\n<yaml>\n---\n<body>`. An RFC without frontmatter is not an RFC.
export const splitFrontmatter = (text) => {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error('no YAML frontmatter');
  return { frontmatter: parseYaml(match[1]) ?? {}, body: match[2] };
};

// `## Heading` sections, in order. A `### Sub` heading stays inside its section's text.
export const sections = (body) => {
  const out = [];
  let current = null;
  let fence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const heading = !fence && line.match(/^## (.+?)\s*$/);
    if (heading) {
      current = { title: heading[1], lines: [] };
      out.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return out.map(({ title, lines }) => ({ title, text: lines.join('\n') }));
};

export const findSection = (all, pattern) => all.find((s) => pattern.test(s.title));

// Splits a table row on the pipes that are neither escaped nor inside backticks.
export const splitRow = (line) => {
  const cells = [];
  let cell = '';
  let code = false;
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '\\' && inner[i + 1] === '|') {
      cell += '|';
      i++;
    } else if (ch === '`') {
      code = !code;
      cell += ch;
    } else if (ch === '|' && !code) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
};

const isSeparator = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

// Every table of a text, each row keyed by its header, with the `### ` heading above it (a phase
// of the delivery plan, for instance) and its 1-based line in the text.
export const tables = (text) => {
  const lines = text.split(/\r?\n/);
  const out = [];
  let heading = null;
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const sub = line.match(/^###+ (.+?)\s*$/);
    if (sub) heading = sub[1];
    if (!line.trim().startsWith('|') || !isSeparator(lines[i + 1] ?? '')) continue;
    const header = splitRow(line);
    const rows = [];
    let j = i + 2;
    for (; j < lines.length && lines[j].trim().startsWith('|'); j++) {
      const cells = splitRow(lines[j]);
      const row = { _heading: heading, _line: j + 1 };
      header.forEach((name, k) => {
        row[name] = cells[k] ?? '';
      });
      row._cells = cells;
      rows.push(row);
    }
    out.push({ heading, header, rows });
    i = j - 1;
  }
  return out;
};

// The rows of a section's tables whose first cell is an id of the given kind.
const rowsOf = (section, pattern) =>
  section
    ? tables(section.text).flatMap((t) => t.rows.filter((r) => pattern.test(r._cells[0] ?? '')))
    : [];

const column = (row, ...names) => {
  for (const name of names) {
    const key = Object.keys(row).find((k) => k.toLowerCase() === name.toLowerCase());
    if (key && row[key] !== undefined) return row[key];
  }
  return '';
};

export const refs = (text, prefix) => [...new Set(String(text).match(new RegExp(`\\b${prefix}-\\d+\\b`, 'g')) ?? [])];

// The whole RFC as data. Throws on a file that is not an RFC.
export const parseRfc = (text) => {
  const { frontmatter, body } = splitFrontmatter(text);
  if (frontmatter.type && frontmatter.type !== 'rfc') throw new Error(`type is ${frontmatter.type}, not rfc`);
  const all = sections(body);
  const behavior = findSection(all, /^Behavior specification/i);
  const delivery = findSection(all, /^Delivery plan/i);
  const testing = findSection(all, /^Test and validation plan/i);
  const risks = findSection(all, /^Risks/i);
  const trace = findSection(all, /^Traceability/i);

  const acceptance = rowsOf(behavior, ID_PATTERNS.ac).map((r) => ({
    id: r._cells[0],
    text: column(r, 'Acceptance criterion') || r._cells[1] || '',
    covers: refsOfCovers(column(r, 'Covers') || r._cells[2] || ''),
  }));
  const invariants = behavior ? refs(behavior.text, 'INV') : [];
  const slices = rowsOf(delivery, ID_PATTERNS.slice).map((r) => {
    const all = r._cells.join(' | ');
    return {
      id: r._cells[0],
      phase: r._heading,
      title: column(r, 'Slice') || r._cells[1] || '',
      type: (column(r, 'Type') || r._cells[2] || '').trim(),
      technical: /^technical/i.test(column(r, 'Type') || r._cells[2] || ''),
      demo: column(r, 'Demo') || r._cells[3] || '',
      target: column(r, 'Target') || r._cells[4] || '',
      acceptance: refs(all, 'AC'),
      tests: refs(all, 'TST'),
    };
  });
  const tests = rowsOf(testing, ID_PATTERNS.test).map((r) => ({
    id: r._cells[0],
    level: column(r, 'Level') || r._cells[1] || '',
    verifies: refs(column(r, 'Verifies') || r._cells.slice(2).join(' '), 'AC'),
  }));
  const openItems = rowsOf(risks, ID_PATTERNS.risk).map((r) => ({
    id: r._cells[0],
    text: r._cells[1] ?? '',
    owner: r._cells[2] ?? '',
    mitigation: r._cells[3] ?? '',
  }));
  const traceability = trace
    ? tables(trace.text).flatMap((t) =>
        t.rows.map((r) => ({
          requirement: r._cells[0],
          acceptance: refs(r._cells.join(' '), 'AC'),
          tests: refs(r._cells.join(' '), 'TST'),
        })),
      )
    : [];
  const heading = body.match(/^# (.+)$/m)?.[1] ?? '';
  return {
    id: frontmatter.id ?? heading.split(/\s+[—-]\s+/)[0],
    title: frontmatter.title ?? heading.split(/\s+[—-]\s+/).slice(1).join(' — '),
    frontmatter,
    sections: all.map((s) => s.title),
    acceptance,
    invariants,
    slices,
    tests,
    openItems,
    traceability,
  };
};

const refsOfCovers = (text) => [...new Set(String(text).match(/\b[A-Z]+-\d+\/[A-Z]+-\d+\b|\bPRD-\d+\b|#\d+/g) ?? [])];

// The deterministic half of the readiness gate (BMAD's implementation readiness check): what makes
// an RFC unbuildable (fail) or worth discussing before the split (concerns). The interactive init
// adds its own judgment on top.
export const readiness = (rfc, { repository } = {}) => {
  const fail = [];
  const concerns = [];
  const fm = rfc.frontmatter;
  const repos = Array.isArray(fm.repos) ? fm.repos : [];
  if (rfc.acceptance.length === 0) fail.push('no acceptance criterion (AC-NNN) in "Behavior specification"');
  if (rfc.slices.length === 0) fail.push('no slice (MS-NNN) in "Delivery plan and commitment"');
  if (repository && !repos.includes(repository))
    fail.push(`repos does not list ${repository} (it lists: ${repos.join(', ') || 'nothing'})`);
  if (repository && repos.length > 1)
    concerns.push(`the RFC also changes ${repos.filter((r) => r !== repository).join(', ')}: those slices are out of this loop`);
  if (fm.status && fm.status !== 'approved') concerns.push(`status is ${fm.status}, not approved`);
  if (repository && !(fm.baseline && fm.baseline[repository]))
    concerns.push(`no baseline commit for ${repository}: the technical design may describe older code`);
  const tested = new Set(rfc.tests.flatMap((t) => t.verifies));
  const untested = rfc.acceptance.map((a) => a.id).filter((id) => !tested.has(id));
  if (untested.length) concerns.push(`acceptance criteria no test verifies: ${untested.join(', ')}`);
  const known = new Set(rfc.acceptance.map((a) => a.id));
  const dangling = [...new Set(rfc.slices.flatMap((s) => s.acceptance).filter((id) => !known.has(id)))];
  if (dangling.length) concerns.push(`slices cite unknown acceptance criteria: ${dangling.join(', ')}`);
  const open = rfc.openItems.filter((o) => o.id.startsWith('OQ-'));
  if (open.length) concerns.push(`open questions: ${open.map((o) => o.id).join(', ')}`);
  if (fm.security_sensitive) concerns.push('security_sensitive: every chunk gets the security review, and humans review the whole stack');
  return { gate: fail.length ? 'FAIL' : concerns.length ? 'CONCERNS' : 'PASS', fail, concerns };
};
