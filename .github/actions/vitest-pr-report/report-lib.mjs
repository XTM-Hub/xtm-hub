const MAX_FAILURE_LINES = 12;
const TEST_CALL = /^\s*(?:it|test)(?:\.\w+)*\s*[(`]/;
const TEST_TITLE = [
  /^\s*(?:it|test)(?:\.\w+)*\(\s*(['"`])((?:\\.|(?!\1).)*)\1/,
  /^\s*\]?\)\(\s*(['"`])((?:\\.|(?!\1).)*)\1/,
];

const STATUS_ICON = { passed: '✅', failed: '❌' };
const statusIcon = (status) => STATUS_ICON[status] ?? '⏭️';
export const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');
const formatCount = (count) => count.toLocaleString('en-US');
const pluralize = (count, noun) =>
  `${formatCount(count)} ${noun}${count === 1 ? '' : 's'}`;
const isBlankOrComment = (line) => /^\s*(\/\/.*|\/\*.*|\*.*)?$/.test(line ?? '');

export const parseDiff = (diff) => {
  const changedLines = new Map();
  const removedLines = new Map();
  const deletedFiles = [];
  let oldPath = null;
  let newPath = null;
  let inHeader = false;
  let hunk = null;

  const closeHunk = () => {
    if (hunk && hunk.count === 0 && newPath && !hunk.removed.some((line) => TEST_CALL.test(line))) {
      changedLines.get(newPath).add(Math.max(hunk.start, 1));
    }
    hunk = null;
  };

  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) {
      closeHunk();
      inHeader = true;
      oldPath = null;
      newPath = null;
      continue;
    }
    if (inHeader && line.startsWith('--- ')) {
      oldPath = line === '--- /dev/null' ? null : line.slice(6);
      continue;
    }
    if (inHeader && line.startsWith('+++ ')) {
      newPath = line === '+++ /dev/null' ? null : line.slice(6);
      if (newPath) {
        changedLines.set(newPath, new Set());
      } else if (oldPath) {
        deletedFiles.push(oldPath);
      }
      continue;
    }
    const header = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (header) {
      closeHunk();
      inHeader = false;
      hunk = {
        start: Number(header[1]),
        count: header[2] === undefined ? 1 : Number(header[2]),
        removed: [],
      };
      if (newPath) {
        for (let offset = 0; offset < hunk.count; offset++) {
          changedLines.get(newPath).add(hunk.start + offset);
        }
      }
      continue;
    }
    if (hunk && line.startsWith('-')) {
      const content = line.slice(1);
      hunk.removed.push(content);
      const key = newPath ?? oldPath;
      if (key) {
        removedLines.set(key, [...(removedLines.get(key) ?? []), content]);
      }
    }
  }
  closeHunk();
  return { changedLines, removedLines, deletedFiles };
};

const CLOSING = { '(': ')', '[': ']', '{': '}' };
const skipQuoted = (source, index) => {
  const quote = source[index];
  let cursor = index + 1;
  while (cursor < source.length && source[cursor] !== quote && source[cursor] !== '\n') {
    cursor += source[cursor] === '\\' ? 2 : 1;
  }
  return cursor + 1;
};
const skipTemplate = (source, index) => {
  let cursor = index + 1;
  while (cursor < source.length && source[cursor] !== '`') {
    if (source[cursor] === '\\') {
      cursor += 2;
    } else if (source[cursor] === '$' && source[cursor + 1] === '{') {
      cursor = skipGroup(source, cursor + 1);
    } else {
      cursor++;
    }
  }
  return cursor + 1;
};
const skipGroup = (source, index) => {
  const closing = CLOSING[source[index]];
  let cursor = index + 1;
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === closing) {
      return cursor + 1;
    }
    if (char === "'" || char === '"') {
      cursor = skipQuoted(source, cursor);
    } else if (char === '`') {
      cursor = skipTemplate(source, cursor);
    } else if (char === '/' && source[cursor + 1] === '/') {
      const end = source.indexOf('\n', cursor);
      cursor = end === -1 ? source.length : end;
    } else if (char === '/' && source[cursor + 1] === '*') {
      const end = source.indexOf('*/', cursor + 2);
      cursor = end === -1 ? source.length : end + 2;
    } else if (CLOSING[char]) {
      cursor = skipGroup(source, cursor);
    } else {
      cursor++;
    }
  }
  return source.length;
};

const findCallEnd = (sourceLines, startLine) => {
  const source = sourceLines.join('\n');
  const lineOffset = sourceLines.slice(0, startLine - 1).join('\n').length + (startLine > 1 ? 1 : 0);
  let cursor = lineOffset + /^\s*(?:it|test)(?:\.\w+)*/.exec(sourceLines[startLine - 1])[0].length;
  let consumed = cursor;
  for (;;) {
    while (/\s/.test(source[cursor] ?? '')) {
      cursor++;
    }
    if (source[cursor] === '(') {
      cursor = skipGroup(source, cursor);
    } else if (source[cursor] === '`') {
      cursor = skipTemplate(source, cursor);
    } else {
      break;
    }
    consumed = cursor;
  }
  return source.slice(0, consumed).split('\n').length;
};

export const findTestRanges = (sourceLines, titleLines) => {
  const sorted = [...new Set(titleLines.filter(Boolean))].sort((a, b) => a - b);
  const ranges = new Map();
  sorted.forEach((titleLine, index) => {
    const lowerBound = index === 0 ? 1 : sorted[index - 1] + 1;
    let start = titleLine;
    while (start > lowerBound && !TEST_CALL.test(sourceLines[start - 1])) {
      start--;
    }
    if (!TEST_CALL.test(sourceLines[start - 1] ?? '')) {
      ranges.set(titleLine, { start: titleLine, end: titleLine });
      return;
    }
    ranges.set(titleLine, { start, end: Math.max(findCallEnd(sourceLines, start), titleLine) });
  });
  return ranges;
};

export const classifyChanges = (sourceLines, tests, changedLines) => {
  const ranges = findTestRanges(
    sourceLines,
    tests.map((test) => test.line)
  );
  const changedTitleLines = new Set();
  let sharedChanged = false;
  for (const line of changedLines) {
    if (isBlankOrComment(sourceLines[line - 1])) {
      continue;
    }
    const owners = [...ranges].filter(([, range]) => line >= range.start && line <= range.end);
    if (owners.length === 0) {
      sharedChanged = true;
    }
    for (const [titleLine] of owners) {
      changedTitleLines.add(titleLine);
    }
  }
  return {
    changedTests: tests.filter((test) => changedTitleLines.has(test.line)),
    sharedChanged,
  };
};

export const findRemovedTitles = (removedLines, currentSource) => {
  const titles = removedLines.flatMap((line) => {
    for (const pattern of TEST_TITLE) {
      const match = pattern.exec(line);
      if (match) {
        return [match[2]];
      }
    }
    return [];
  });
  return [...new Set(titles)].filter(
    (title) => !["'", '"', '`'].some((quote) => (currentSource ?? '').includes(`${quote}${title}${quote}`))
  );
};

const listFailures = (testFiles) =>
  testFiles.flatMap((testFile) => {
    const failures = testFile.tests
      .filter((test) => test.status === 'failed')
      .map((test) => ({ file: testFile.path, name: test.name, message: test.failureMessages.join('\n') }));
    if (testFile.status === 'failed' && failures.length === 0) {
      failures.push({ file: testFile.path, name: 'Test file failed to run', message: testFile.message ?? '' });
    }
    return failures;
  });

const renderFailure = (failure) => {
  const message = stripAnsi(failure.message).trim().split('\n').slice(0, MAX_FAILURE_LINES).join('\n');
  return [
    `<details open><summary>❌ <code>${escapeHtml(failure.file)}</code> › ${escapeHtml(failure.name)}</summary>`,
    '',
    '```',
    message.replace(/```/g, "'''"),
    '```',
    '</details>',
    '',
  ].join('\n');
};

const escapeCell = (text) =>
  escapeHtml(text)
    .replace(/[\\`*_~[\]]/g, '\\$&')
    .replace(/\|/g, '&#124;')
    .replace(/\r?\n/g, ' ');

const commonPrefix = (texts) =>
  texts.reduce((prefix, text) => {
    let length = 0;
    while (length < prefix.length && prefix[length] === text[length]) {
      length++;
    }
    return prefix.slice(0, length);
  });
const reverse = (text) => [...text].reverse().join('');

export const splitCases = (titles) => {
  if (new Set(titles).size === 1) {
    return null;
  }
  const sharedStart = commonPrefix(titles);
  const prefix = sharedStart.slice(0, sharedStart.lastIndexOf(' ') + 1);
  const rests = titles.map((title) => title.slice(prefix.length));
  const sharedEnd = reverse(commonPrefix(rests.map(reverse)));
  const suffix = sharedEnd.includes(' ') ? sharedEnd.slice(sharedEnd.indexOf(' ')) : '';
  const cases = rests.map((rest) => rest.slice(0, rest.length - suffix.length).trim());
  if (cases.some((label) => label === '')) {
    return null;
  }
  const title =
    prefix || suffix
      ? [prefix.trim(), '…', suffix.trim()].filter(Boolean).join(' ')
      : `${titles.length} cases`;
  return { title, cases };
};

const groupCases = (tests) => {
  const groups = [];
  for (const test of tests) {
    const group = groups.at(-1);
    const sameCall =
      group &&
      test.line !== undefined &&
      group[0].line === test.line &&
      group[0].suite.join(' › ') === test.suite.join(' › ');
    if (sameCall) {
      group.push(test);
    } else {
      groups.push([test]);
    }
  }
  return groups;
};

const renderTestTable = (tests, changed) => {
  const row = (result, mark, title) =>
    `|${(changed ? [result, mark, title] : [result, title]).map((cell) => (cell ? ` ${cell} ` : ' ')).join('|')}|`;
  const rows = changed
    ? ['| Result | Changed | Test |', '| :-: | :-: | :-- |']
    : ['| Result | Test |', '| :-: | :-- |'];
  let currentSuite = null;
  for (const group of groupCases(tests)) {
    const suite = group[0].suite.join(' › ');
    if (suite !== currentSuite && (suite || currentSuite !== null)) {
      rows.push(row('', '', suite ? `**${escapeCell(suite)}**` : '**(top level)**'));
    }
    currentSuite = suite;
    const mark = (test) => (changed?.has(test) ? '✏️' : '');
    const split = group.length > 1 ? splitCases(group.map((test) => test.title)) : null;
    if (!split) {
      rows.push(...group.map((test) => row(statusIcon(test.status), mark(test), escapeCell(test.title))));
      continue;
    }
    const passed = group.filter((test) => test.status === 'passed').length;
    const failed = group.some((test) => test.status === 'failed');
    rows.push(
      row(
        `${failed ? '❌ ' : ''}${passed} / ${group.length}`,
        group.some((test) => changed?.has(test)) ? '✏️' : '',
        escapeCell(split.title)
      ),
      ...group.map((test, index) =>
        row(statusIcon(test.status), '', `&emsp;↳ <code>${escapeCell(split.cases[index])}</code>`)
      )
    );
  }
  return rows;
};

const renderTestFile = (testFile, { changedTests, sharedChanged }) => {
  const changed = new Set(changedTests);
  const failed = testFile.status === 'failed' || testFile.tests.some((test) => test.status === 'failed');
  const shown = testFile.tests.filter((test) => changed.has(test) || test.status === 'failed');
  const others = testFile.tests.filter((test) => !shown.includes(test));
  const lines = [
    `<details open><summary>${failed ? '❌' : '✅'} <code>${escapeHtml(testFile.path)}</code> · ${changed.size} changed of ${pluralize(testFile.tests.length, 'test')}${sharedChanged ? ' · ⚠️ shared code changed' : ''}</summary>`,
    '',
  ];
  if (shown.length > 0) {
    lines.push(...renderTestTable(shown, changed));
  }
  if (others.length > 0) {
    lines.push(
      '',
      `<details><summary>${pluralize(others.length, 'other test')}</summary>`,
      '',
      ...renderTestTable(others, null),
      '',
      '</details>'
    );
  }
  lines.push('', '</details>', '');
  return lines.join('\n');
};

const renderRemoved = (removedTitles, deletedFiles) => {
  const lines = ['#### 🗑️ Tests removed or renamed', '', '| Test file | Removed or renamed tests |', '| :-- | :-- |'];
  for (const file of deletedFiles) {
    lines.push(`| <code>${escapeCell(file)}</code> | _Test file deleted_ |`);
  }
  for (const [file, titles] of removedTitles) {
    lines.push(`| <code>${escapeCell(file)}</code> | ${titles.map(escapeCell).join('<br>')} |`);
  }
  return [...lines, ''].join('\n');
};

export const buildReport = ({
  id,
  title,
  testFiles,
  diff,
  readSource,
  maxFailures = Infinity,
  maxLength = Infinity,
}) => {
  const header = `<!-- vitest-report:${id} -->\n### ${title}\n`;
  if (testFiles.length === 0) {
    const body = `${header}\n⚠️ No test report was found: the test shards did not produce any result.\n`;
    return { summary: body, comment: body };
  }

  const { changedLines, removedLines, deletedFiles } = parseDiff(diff);
  const failures = listFailures(testFiles);
  const changedTestFiles = testFiles
    .filter((testFile) => changedLines.has(testFile.path))
    .sort((a, b) => a.path.localeCompare(b.path));
  const fileBlocks = changedTestFiles.map((testFile) => {
    const sourceLines = (readSource(testFile.path) ?? '').split('\n');
    return renderTestFile(
      testFile,
      classifyChanges(sourceLines, testFile.tests, changedLines.get(testFile.path))
    );
  });
  const removedTitles = [...removedLines]
    .filter(([file]) => !deletedFiles.includes(file))
    .map(([file, lines]) => [file, findRemovedTitles(lines, readSource(file))])
    .filter(([, titles]) => titles.length > 0);
  const hasRemoved = removedTitles.length > 0 || deletedFiles.length > 0;

  const assemble = (failureLimit, lengthLimit) => {
    const blocks = [header];
    if (failures.length > 0) {
      blocks.push('#### ❌ Failed tests\n', ...failures.slice(0, failureLimit).map(renderFailure));
      if (failures.length > failureLimit) {
        blocks.push(`_…and ${failures.length - failureLimit} more failed tests, see the job summary._\n`);
      }
    }
    blocks.push('#### 🔍 Tests in the test files this pull request changes\n');
    if (changedTestFiles.length === 0) {
      blocks.push('_This pull request changes no test file here._\n');
    } else {
      blocks.push(
        '_✏️ marks the tests whose own code this pull request adds or changes. ⚠️ shared code changed: code outside the tests (imports, mocks, hooks or describe blocks) changed, so every test of the file may be affected._\n',
        ...fileBlocks
      );
    }
    if (hasRemoved) {
      blocks.push(renderRemoved(removedTitles, deletedFiles));
    }

    const truncation = '_Report truncated, see the job summary._\n';
    let body = '';
    for (const block of blocks) {
      if (body.length + block.length + 1 + truncation.length > lengthLimit) {
        return `${body}\n${truncation}`;
      }
      body += `${block}\n`;
    }
    return body;
  };

  return {
    summary: assemble(Infinity, Infinity),
    comment: assemble(maxFailures, maxLength),
  };
};
