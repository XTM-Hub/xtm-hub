import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluateApp,
  formatLines,
  lineHits,
  mergeCoverageMaps,
  overallCell,
  parseChangedLines,
  patchCell,
  toRepoPath,
  uncoveredList,
} from './coverage-lib.mjs';

const location = (startLine, endLine = startLine) => ({
  start: { line: startLine, column: 0 },
  end: { line: endLine, column: 10 },
});

// Istanbul file coverage with one statement per entry of `statements`: [start line, end line, hit count].
const fileCoverage = (path, statements) => ({
  path,
  statementMap: Object.fromEntries(
    statements.map(([start, end], index) => [index, location(start, end)]),
  ),
  s: Object.fromEntries(statements.map(([, , count], index) => [index, count])),
  fnMap: {
    0: { name: 'run', decl: location(1), loc: location(1, 9), line: 1 },
  },
  f: { 0: statements.some(([, , count]) => count > 0) ? 1 : 0 },
  branchMap: {
    0: {
      type: 'if',
      loc: location(2),
      locations: [location(2), location(2)],
      line: 2,
    },
  },
  b: { 0: [1, 0] },
});

const coverageMap = (...files) =>
  Object.fromEntries(files.map((file) => [file.path, file]));

describe('toRepoPath', () => {
  it('keeps the path from the app directory on', () => {
    assert.equal(
      toRepoPath('/app/apps/frontend/src/a.ts', 'apps/frontend'),
      'apps/frontend/src/a.ts',
    );
    assert.equal(
      toRepoPath(
        '/home/runner/work/xtm-hub/xtm-hub/apps/backend/src/b.ts',
        'apps/backend',
      ),
      'apps/backend/src/b.ts',
    );
    assert.equal(
      toRepoPath('apps/frontend/src/a.ts', 'apps/frontend'),
      'apps/frontend/src/a.ts',
    );
  });

  it('leaves out the files of another app', () => {
    assert.equal(
      toRepoPath('/app/apps/backend/src/b.ts', 'apps/frontend'),
      undefined,
    );
  });
});

describe('mergeCoverageMaps', () => {
  it('adds up the counts of every shard', () => {
    const merged = mergeCoverageMaps(
      [
        coverageMap(
          fileCoverage('/app/apps/frontend/src/a.ts', [
            [1, 1, 0],
            [2, 3, 2],
          ]),
        ),
        coverageMap(
          fileCoverage('/app/apps/frontend/src/a.ts', [
            [1, 1, 1],
            [2, 3, 0],
          ]),
        ),
      ],
      'apps/frontend',
    );

    const file = merged.get('apps/frontend/src/a.ts');
    assert.deepEqual(file.s, { 0: 1, 1: 2 });
    assert.deepEqual(file.f, { 0: 2 });
    assert.deepEqual(file.b, { 0: [2, 0] });
  });

  it('does not change the shard reports', () => {
    const shard = coverageMap(
      fileCoverage('/app/apps/frontend/src/a.ts', [[1, 1, 1]]),
    );
    mergeCoverageMaps([shard, shard], 'apps/frontend');

    assert.deepEqual(shard['/app/apps/frontend/src/a.ts'].s, { 0: 1 });
    assert.deepEqual(shard['/app/apps/frontend/src/a.ts'].b, { 0: [1, 0] });
  });

  it('keeps only the files of the app', () => {
    const merged = mergeCoverageMaps(
      [
        coverageMap(
          fileCoverage('/app/apps/frontend/src/a.ts', [[1, 1, 1]]),
          fileCoverage('/app/apps/backend/b.ts', [[1, 1, 1]]),
        ),
      ],
      'apps/frontend',
    );

    assert.deepEqual([...merged.keys()], ['apps/frontend/src/a.ts']);
  });
});

describe('lineHits', () => {
  it('counts a line once, with the best statement starting on it', () => {
    const hits = lineHits(
      fileCoverage('a.ts', [
        [1, 1, 0],
        [1, 1, 3],
        [2, 5, 0],
      ]),
    );

    assert.deepEqual(
      [...hits],
      [
        [1, 3],
        [2, 0],
      ],
    );
  });
});

describe('parseChangedLines', () => {
  it('reads the new line numbers of every hunk', () => {
    const diff = [
      'diff --git a/apps/frontend/src/a.ts b/apps/frontend/src/a.ts',
      '--- a/apps/frontend/src/a.ts',
      '+++ b/apps/frontend/src/a.ts',
      '@@ -3 +3 @@ const a = 1;',
      '-old',
      '+new',
      '@@ -10,0 +11,3 @@',
      '+one',
      '+two',
      '+three',
      '@@ -20,2 +23,0 @@',
      '-removed',
      '-removed',
      'diff --git a/apps/frontend/src/new.ts b/apps/frontend/src/new.ts',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/apps/frontend/src/new.ts',
      '@@ -0,0 +1,2 @@',
      '+a',
      '+b',
      'diff --git a/apps/frontend/src/gone.ts b/apps/frontend/src/gone.ts',
      'deleted file mode 100644',
      '--- a/apps/frontend/src/gone.ts',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      '-a',
      '-b',
    ].join('\n');

    assert.deepEqual(
      Object.fromEntries(
        [...parseChangedLines(diff)].map(([path, lines]) => [path, [...lines]]),
      ),
      {
        'apps/frontend/src/a.ts': [3, 11, 12, 13],
        'apps/frontend/src/new.ts': [1, 2],
      },
    );
  });
});

describe('evaluateApp', () => {
  const files = new Map([
    [
      'apps/frontend/src/a.ts',
      fileCoverage('a', [
        [1, 1, 1],
        [2, 2, 1],
        [3, 3, 0],
        [4, 4, 0],
        [5, 5, 1],
      ]),
    ],
    [
      'apps/frontend/src/b.ts',
      fileCoverage('b', [
        [1, 1, 1],
        [2, 2, 1],
        [3, 3, 1],
        [4, 4, 1],
        [5, 5, 1],
      ]),
    ],
  ]);

  it('measures the app and the changed lines that are coverable', () => {
    const result = evaluateApp({
      files,
      // Line 6 has no statement and b.test.ts is not measured: neither counts.
      changedLines: new Map([
        ['apps/frontend/src/a.ts', new Set([1, 3, 4, 6])],
        ['apps/frontend/src/b.test.ts', new Set([1, 2])],
      ]),
      target: 80,
    });

    assert.deepEqual(result.overall, {
      covered: 8,
      total: 10,
      percent: 80,
      failed: false,
    });
    assert.deepEqual(result.patch, {
      covered: 1,
      total: 3,
      percent: (1 / 3) * 100,
      failed: true,
    });
    assert.deepEqual(result.uncovered, [
      { path: 'apps/frontend/src/a.ts', lines: [3, 4] },
    ]);
  });

  it('passes when no coverable line changed', () => {
    const result = evaluateApp({
      files,
      changedLines: new Map([['apps/frontend/README.md', new Set([1])]]),
      target: 80,
    });

    assert.equal(result.patch.percent, undefined);
    assert.equal(result.patch.failed, false);
    assert.equal(patchCell(result), '✅ no coverable line changed');
  });

  it('fails under the target overall', () => {
    const result = evaluateApp({ files, changedLines: new Map(), target: 85 });

    assert.equal(result.overall.failed, true);
    assert.equal(overallCell(result), '❌ 80.00% (8/10 lines)');
  });

  it('fails without any coverage', () => {
    const result = evaluateApp({
      files: new Map(),
      changedLines: new Map(),
      target: 80,
    });

    assert.equal(result.overall.failed, true);
    assert.equal(overallCell(result), '❌ no coverage');
    assert.equal(patchCell(result), '—');
  });
});

describe('formatLines', () => {
  it('groups consecutive lines', () => {
    assert.equal(formatLines([3, 4, 5, 9, 11, 12]), '3-5, 9, 11-12');
  });
});

describe('uncoveredList', () => {
  it('caps the number of files listed', () => {
    const result = {
      uncovered: [
        { path: 'a.ts', lines: [1] },
        { path: 'b.ts', lines: [2, 3] },
        { path: 'c.ts', lines: [4] },
      ],
    };

    assert.deepEqual(uncoveredList(result, 2), [
      '<details><summary>Changed lines not covered</summary>',
      '',
      '- `a.ts`: 1',
      '- `b.ts`: 2-3',
      '- …and 1 more file',
      '',
      '</details>',
    ]);
  });

  it('is empty when every changed line is covered', () => {
    assert.deepEqual(uncoveredList({ uncovered: [] }, 2), []);
  });
});
