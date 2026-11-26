import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildReport,
  classifyChanges,
  findRemovedTitles,
  parseDiff,
  splitCases,
} from './report-lib.mjs';

const FILE = 'apps/frontend/src/lib/omit.test.ts';
const SOURCE = [
  "import { describe, expect, it } from 'vitest';", // 1
  "import { omit } from './omit';", // 2
  '', // 3
  "const NAME = 'Filigran';", // 4
  '', // 5
  "describe('omit', () => {", // 6
  "  it('removes keys', () => {", // 7
  "    expect(omit({ a: 1 }, ['a'])).toEqual({});", // 8
  '  });', // 9
  '', // 10
  '  // the table below covers both keys', // 11
  '  it.each([', // 12
  "    ['a', 1],", // 13
  "    ['b', 2],", // 14
  "  ])('handles %s', (key, value) => {", // 15
  '    expect(value).toBeGreaterThan(0);', // 16
  '  });', // 17
  '', // 18
  "  it('keeps others', () => {", // 19
  "    expect(`${NAME} (kept)`).toContain(')');", // 20
  '  });', // 21
  '});', // 22
  '', // 23
];
const omitTest = (title, line, status = 'passed') => ({
  name: `omit › ${title}`,
  suite: ['omit'],
  title,
  status,
  line,
  failureMessages: [],
});
const TESTS = [
  omitTest('removes keys', 7),
  omitTest('handles a', 15),
  omitTest('handles b', 15),
  omitTest('keeps others', 19),
];

const diffChanging = (lines, removed = []) =>
  [
    `diff --git a/${FILE} b/${FILE}`,
    'index 1111111..2222222 100644',
    `--- a/${FILE}`,
    `+++ b/${FILE}`,
    ...lines.flatMap((line, index) => [
      `@@ -${line} +${line} @@`,
      `-${removed[index] ?? 'old content'}`,
      `+${SOURCE[line - 1]}`,
    ]),
    '',
  ].join('\n');

const changedNames = (lines) =>
  classifyChanges(SOURCE, TESTS, new Set(lines)).changedTests.map((test) => test.name);

describe('classifyChanges', () => {
  it('should mark only the test whose body changed', () => {
    assert.deepEqual(changedNames([8]), ['omit › removes keys']);
  });

  it('should mark every case of an it.each when its table changed', () => {
    assert.deepEqual(changedNames([13]), ['omit › handles a', 'omit › handles b']);
  });

  it('should keep the closing line of a test inside that test', () => {
    assert.deepEqual(changedNames([21]), ['omit › keeps others']);
  });

  it('should not be fooled by a parenthesis inside a template literal', () => {
    assert.deepEqual(changedNames([20]), ['omit › keeps others']);
  });

  for (const [label, line] of [
    ['an import', 1],
    ['a shared constant', 4],
    ['the describe header', 6],
    ['the closing line of the describe', 22],
  ]) {
    it(`should flag shared code and mark no test when ${label} changed`, () => {
      const result = classifyChanges(SOURCE, TESTS, new Set([line]));
      assert.deepEqual(
        { changed: result.changedTests.length, shared: result.sharedChanged },
        { changed: 0, shared: true }
      );
    });
  }

  for (const [label, line] of [
    ['a blank line', 10],
    ['a comment', 11],
  ]) {
    it(`should ignore ${label}`, () => {
      const result = classifyChanges(SOURCE, TESTS, new Set([line]));
      assert.deepEqual(
        { changed: result.changedTests.length, shared: result.sharedChanged },
        { changed: 0, shared: false }
      );
    });
  }
});

describe('parseDiff', () => {
  it('should list a deleted test file without changed lines', () => {
    const diff = [
      'diff --git a/apps/x/gone.test.ts b/apps/x/gone.test.ts',
      'deleted file mode 100644',
      '--- a/apps/x/gone.test.ts',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      "-it('gone', () => {",
      '-});',
      '',
    ].join('\n');

    const result = parseDiff(diff);

    assert.deepEqual(
      { deleted: result.deletedFiles, changed: [...result.changedLines.keys()] },
      { deleted: ['apps/x/gone.test.ts'], changed: [] }
    );
  });

  it('should not credit a removed test to the line it was removed after', () => {
    const diff = [
      `diff --git a/${FILE} b/${FILE}`,
      `--- a/${FILE}`,
      `+++ b/${FILE}`,
      '@@ -10,3 +9,0 @@',
      "-  it('gone', () => {",
      '-  });',
      '-',
      '',
    ].join('\n');

    assert.deepEqual([...parseDiff(diff).changedLines.get(FILE)], []);
  });

  it('should credit any other removal to the line it was removed after', () => {
    const diff = [
      `diff --git a/${FILE} b/${FILE}`,
      `--- a/${FILE}`,
      `+++ b/${FILE}`,
      '@@ -9 +8,0 @@',
      '-    expect(true).toBe(true);',
      '',
    ].join('\n');

    assert.deepEqual([...parseDiff(diff).changedLines.get(FILE)], [8]);
  });
});

describe('findRemovedTitles', () => {
  it('should return the titles that no longer appear in the file', () => {
    const removed = [
      "  it('old title', () => {",
      "  it('keeps others', () => {",
      "  ])('gone %s', (key) => {",
    ];

    assert.deepEqual(findRemovedTitles(removed, SOURCE.join('\n')), ['old title', 'gone %s']);
  });
});

describe('splitCases', () => {
  it('should keep the shared start and end as the title and the differing part as each case', () => {
    const titles = [
      "should redirect when the url is 'missing' and stop",
      "should redirect when the url is 'file scheme' and stop",
    ];

    assert.deepEqual(splitCases(titles), {
      title: 'should redirect when the url is … and stop',
      cases: ["'missing'", "'file scheme'"],
    });
  });

  it('should not split titles that are all the same', () => {
    assert.equal(splitCases(['same title', 'same title']), null);
  });
});

describe('buildReport', () => {
  const testFile = { path: FILE, status: 'passed', message: '', tests: TESTS };
  const report = (overrides) =>
    buildReport({
      id: 'frontend',
      title: 'Frontend unit tests',
      testFiles: [testFile],
      diff: diffChanging([8]),
      readSource: () => SOURCE.join('\n'),
      ...overrides,
    });

  it('should list the changed test file with its changed test marked', () => {
    const { comment } = report();

    assert.match(comment, /\| ✅ \| ✏️ \| removes keys \|/);
  });

  it('should name the suite once above its tests instead of on every test', () => {
    const { comment } = report({ diff: diffChanging([8, 13]) });

    assert.deepEqual(
      {
        suiteRows: comment.match(/\| \| \| \*\*omit\*\* \|/g).length,
        prefixedTitles: comment.match(/omit › /g),
      },
      { suiteRows: 1, prefixedTitles: null }
    );
  });

  it('should group the cases of an it.each under one row with their pass count', () => {
    const { comment } = report({ diff: diffChanging([13]) });

    assert.match(
      comment,
      /\| 2 \/ 2 \| ✏️ \| handles … \|\n\| ✅ \| \| &emsp;↳ <code>a<\/code> \|\n\| ✅ \| \| &emsp;↳ <code>b<\/code> \|/
    );
  });

  it('should flag the it.each row when one of its cases fails', () => {
    const failing = { ...testFile, tests: TESTS.map((test) => (test.title === 'handles b' ? { ...test, status: 'failed' } : test)) };

    const { comment } = report({ testFiles: [failing], diff: diffChanging([13]) });

    assert.match(comment, /\| ❌ 1 \/ 2 \| ✏️ \| handles … \|/);
  });

  it('should list the unchanged tests in their own table without the changed column', () => {
    const { comment } = report();

    assert.match(comment, /3 other tests<\/summary>\n\n\| Result \| Test \|[\s\S]*\| ✅ \| keeps others \|/);
  });

  it('should head the top-level tests that follow a describe so they do not read as part of it', () => {
    const mixed = {
      ...testFile,
      tests: [
        { ...TESTS[0], suite: [], title: 'top level first', name: 'top level first' },
        TESTS[0],
        { ...TESTS[0], suite: [], title: 'top level after', name: 'top level after' },
      ],
    };

    const { comment } = report({ testFiles: [mixed] });

    assert.match(
      comment,
      /\| Result \| Changed \| Test \|\n\| :-: \| :-: \| :-- \|\n\| ✅ \| ✏️ \| top level first \|\n\| \| \| \*\*omit\*\* \|\n\| ✅ \| ✏️ \| removes keys \|\n\| \| \| \*\*\(top level\)\*\* \|\n\| ✅ \| ✏️ \| top level after \|/
    );
  });

  it('should escape the markdown characters of a suite so its bold row stays intact', () => {
    const starred = { ...testFile, tests: [{ ...TESTS[0], suite: ['*_parse_*'] }] };

    const { comment } = report({ testFiles: [starred] });

    assert.match(comment, /\| \| \| \*\*\\\*\\_parse\\_\\\*\*\* \|/);
  });

  it('should escape a pipe in a test title so the table keeps its columns', () => {
    const piped = { ...testFile, tests: [{ ...TESTS[0], title: 'a | b', name: 'omit › a | b' }] };

    const { comment } = report({ testFiles: [piped] });

    assert.match(comment, /\| ✅ \| ✏️ \| a &#124; b \|/);
  });

  it('should warn on the file when shared code changed', () => {
    const { comment } = report({ diff: diffChanging([1]) });

    assert.match(comment, /0 changed of 4 tests · ⚠️ shared code changed/);
  });

  it('should list a renamed test as removed', () => {
    const { comment } = report({
      diff: diffChanging([7], ["  it('drops keys', () => {"]),
    });

    assert.match(comment, /#### 🗑️ Tests removed or renamed[\s\S]*\| <code>[^<]*omit\.test\.ts<\/code> \| drops keys \|/);
  });

  it('should say so when no test file changed', () => {
    const { comment } = report({ diff: '' });

    assert.match(comment, /_This pull request changes no test file here\._/);
  });

  describe('with many failures', () => {
    const failing = {
      ...testFile,
      tests: Array.from({ length: 40 }, (_, index) => ({
        name: `failing ${index}`,
        suite: [],
        title: `failing ${index}`,
        status: 'failed',
        line: 7,
        failureMessages: [`<details><summary>DOM</summary>\n${'x'.repeat(200)}\n</details>`],
      })),
    };
    const { summary, comment } = report({
      testFiles: [failing],
      maxFailures: 5,
      maxLength: 60000,
    });

    it('should keep every failure in the job summary', () => {
      assert.equal(summary.match(/<summary>❌ <code>[^<]*<\/code> › failing/g).length, 40);
    });

    it('should cap the failures of the comment and say how many are left', () => {
      assert.deepEqual(
        {
          shown: comment.match(/<summary>❌ <code>[^<]*<\/code> › failing/g).length,
          more: /_…and 35 more failed tests, see the job summary\._/.test(comment),
        },
        { shown: 5, more: true }
      );
    });

    it('should keep the changed test files in the comment', () => {
      assert.match(comment, /#### 🔍 Tests in the test files this pull request changes/);
    });
  });

  it('should cut the comment between whole blocks when it is too long', () => {
    const failing = {
      ...testFile,
      tests: Array.from({ length: 40 }, (_, index) => ({
        name: `failing ${index}`,
        suite: [],
        title: `failing ${index}`,
        status: 'failed',
        line: 7,
        failureMessages: ['x'.repeat(500)],
      })),
    };

    const { comment } = report({ testFiles: [failing], maxLength: 3000 });

    assert.deepEqual(
      {
        withinLimit: comment.length <= 3000,
        fencesClosed: comment.match(/^```/gm).length % 2 === 0,
        truncated: comment.endsWith('_Report truncated, see the job summary._\n'),
      },
      { withinLimit: true, fencesClosed: true, truncated: true }
    );
  });
});
