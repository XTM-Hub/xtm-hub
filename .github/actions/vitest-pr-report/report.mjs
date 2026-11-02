import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { buildReport } from './report-lib.mjs';

const { values: args } = parseArgs({
  options: {
    id: { type: 'string' },
    title: { type: 'string' },
    'app-dir': { type: 'string' },
    reports: { type: 'string' },
    base: { type: 'string' },
    'summary-file': { type: 'string' },
    'comment-file': { type: 'string' },
    'max-failures': { type: 'string' },
    'max-length': { type: 'string' },
  },
});
const appDir = args['app-dir'].replace(/\/$/, '');

const toRepoPath = (absolutePath) => {
  const index = absolutePath.lastIndexOf(`/${appDir}/`);
  return index === -1 ? absolutePath : absolutePath.slice(index + 1);
};

const readTestFiles = () => {
  if (!existsSync(args.reports)) {
    return [];
  }
  return readdirSync(args.reports)
    .filter((file) => file.endsWith('.json'))
    .flatMap(
      (file) =>
        JSON.parse(readFileSync(path.join(args.reports, file), 'utf8'))
          .testResults
    )
    .map((testFile) => ({
      path: toRepoPath(testFile.name),
      status: testFile.status,
      message: testFile.message,
      tests: testFile.assertionResults.map((test) => ({
        name: [...test.ancestorTitles, test.title].join(' › '),
        suite: test.ancestorTitles,
        title: test.title,
        status: test.status,
        line: test.location?.line,
        failureMessages: test.failureMessages ?? [],
      })),
    }));
};

const diff = execFileSync(
  'git',
  [
    'diff',
    '--unified=0',
    '--no-color',
    args.base,
    'HEAD',
    '--',
    `:(glob)${appDir}/**/*.test.*`,
    `:(glob)${appDir}/**/*.spec.*`,
  ],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
);

const { summary, comment } = buildReport({
  id: args.id,
  title: args.title,
  testFiles: readTestFiles(),
  diff,
  readSource: (file) => (existsSync(file) ? readFileSync(file, 'utf8') : null),
  maxFailures: Number(args['max-failures'] ?? Infinity),
  maxLength: Number(args['max-length'] ?? Infinity),
});
appendFileSync(args['summary-file'], summary);
writeFileSync(args['comment-file'], comment);
