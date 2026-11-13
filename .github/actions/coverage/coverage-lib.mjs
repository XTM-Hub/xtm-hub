// Coverage of an app from the Istanbul `coverage-final.json` reports of its Vitest shards. Lines are counted like the
// "% Lines" column of Vitest's own report: a line is coverable when a statement starts on it, and covered when one of
// those statements ran. A file without any coverable line (types, re-exports, assets) does not count.

// Repository-relative path of a file from the absolute path a shard recorded (e.g. /app/apps/frontend/src/a.ts or
// /home/runner/work/xtm-hub/xtm-hub/apps/frontend/src/a.ts gives apps/frontend/src/a.ts). Undefined outside appDir.
export const toRepoPath = (absolutePath, appDir) => {
  const normalized = absolutePath.replaceAll('\\', '/');
  const index = normalized.lastIndexOf(`/${appDir}/`);
  if (index !== -1) {
    return normalized.slice(index + 1);
  }
  return normalized.startsWith(`${appDir}/`) ? normalized : undefined;
};

const addCounts = (target, source) => {
  for (const [key, count] of Object.entries(source ?? {})) {
    if (Array.isArray(count)) {
      const current = target[key] ?? [];
      target[key] = count.map((value, index) => (current[index] ?? 0) + value);
    } else {
      target[key] = (target[key] ?? 0) + count;
    }
  }
};

// Every shard instruments the same sources, so merging the shards adds up the hit counts of each statement, function
// and branch of a file, as istanbul-lib-coverage does.
export const mergeCoverageMaps = (coverageMaps, appDir) => {
  const merged = new Map();
  for (const coverageMap of coverageMaps) {
    for (const [absolutePath, file] of Object.entries(coverageMap)) {
      const repoPath = toRepoPath(file.path ?? absolutePath, appDir);
      if (!repoPath) {
        continue;
      }
      const current = merged.get(repoPath);
      if (!current) {
        merged.set(repoPath, {
          statementMap: file.statementMap ?? {},
          fnMap: file.fnMap ?? {},
          branchMap: file.branchMap ?? {},
          s: { ...file.s },
          f: { ...file.f },
          b: Object.fromEntries(
            Object.entries(file.b ?? {}).map(([key, counts]) => [
              key,
              [...counts],
            ]),
          ),
        });
        continue;
      }
      addCounts(current.s, file.s);
      addCounts(current.f, file.f);
      addCounts(current.b, file.b);
    }
  }
  return merged;
};

// Lines each file gains or changes, from `git diff --unified=0` (new-side line numbers, like Codecov's patch).
export const parseChangedLines = (diff) => {
  const changed = new Map();
  let lines;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const target = line.slice(4);
      lines = target === '/dev/null' ? undefined : new Set();
      if (lines) {
        changed.set(target.replace(/^b\//, ''), lines);
      }
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunk && lines) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      for (let number = start; number < start + count; number += 1) {
        lines.add(number);
      }
    }
  }
  return changed;
};

// Hit count of each coverable line of a file: the highest count of the statements starting on it.
export const lineHits = (file) => {
  const hits = new Map();
  for (const [id, location] of Object.entries(file.statementMap)) {
    const line = location.start.line;
    hits.set(line, Math.max(hits.get(line) ?? 0, file.s[id] ?? 0));
  }
  return hits;
};

export const percent = ({ covered, total }) =>
  total === 0 ? undefined : (covered / total) * 100;

export const formatPercent = (value) =>
  value === undefined ? '—' : `${value.toFixed(2)}%`;

// Overall coverage of the app and coverage of the lines the pull request changes, with the changed lines it leaves
// uncovered.
export const evaluateApp = ({ files, changedLines, target }) => {
  const overall = { covered: 0, total: 0 };
  const patch = { covered: 0, total: 0 };
  const uncovered = [];
  for (const [path, file] of [...files].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const hits = lineHits(file);
    for (const count of hits.values()) {
      overall.total += 1;
      if (count > 0) {
        overall.covered += 1;
      }
    }
    const changed = changedLines.get(path);
    if (!changed) {
      continue;
    }
    const missed = [];
    for (const line of [...changed].sort((a, b) => a - b)) {
      if (!hits.has(line)) {
        continue;
      }
      patch.total += 1;
      if (hits.get(line) > 0) {
        patch.covered += 1;
      } else {
        missed.push(line);
      }
    }
    if (missed.length > 0) {
      uncovered.push({ path, lines: missed });
    }
  }
  const overallPercent = percent(overall);
  const patchPercent = percent(patch);
  return {
    overall: {
      ...overall,
      percent: overallPercent,
      failed: overallPercent === undefined || overallPercent < target,
    },
    // No coverable changed line: nothing to cover, like Codecov's "Coverage not affected".
    patch: {
      ...patch,
      percent: patchPercent,
      failed: patchPercent !== undefined && patchPercent < target,
    },
    uncovered,
  };
};

// Consecutive line numbers as ranges: [3, 4, 5, 9] gives "3-5, 9".
export const formatLines = (lines) => {
  const ranges = [];
  for (const line of lines) {
    const last = ranges.at(-1);
    if (last && line === last[1] + 1) {
      last[1] = line;
    } else {
      ranges.push([line, line]);
    }
  }
  return ranges
    .map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`))
    .join(', ');
};

const cell = ({ percent: value, covered, total, failed }, emptyText) =>
  value === undefined
    ? emptyText
    : `${failed ? '❌' : '✅'} ${formatPercent(value)} (${covered}/${total} lines)`;

export const overallCell = (result) => cell(result.overall, '❌ no coverage');

export const patchCell = (result) =>
  result.overall.total === 0
    ? '—'
    : cell(result.patch, '✅ no coverable line changed');

// Markdown list of the changed lines left uncovered, capped to keep the comment readable.
export const uncoveredList = (result, maxFiles) => {
  if (result.uncovered.length === 0) {
    return [];
  }
  const shown = result.uncovered.slice(0, maxFiles);
  const lines = shown.map(
    ({ path, lines: missed }) => `- \`${path}\`: ${formatLines(missed)}`,
  );
  const hidden = result.uncovered.length - shown.length;
  if (hidden > 0) {
    lines.push(`- …and ${hidden} more file${hidden === 1 ? '' : 's'}`);
  }
  return [
    '<details><summary>Changed lines not covered</summary>',
    '',
    ...lines,
    '',
    '</details>',
  ];
};
