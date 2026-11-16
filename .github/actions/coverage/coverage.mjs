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
import {
  evaluateApp,
  mergeCoverageMaps,
  overallCell,
  parseChangedLines,
  patchCell,
  uncoveredList,
} from './coverage-lib.mjs';

const { values: args } = parseArgs({
  options: {
    apps: { type: 'string' },
    reports: { type: 'string' },
    base: { type: 'string' },
    head: { type: 'string' },
    // Commit shown in the report: the pull request head rather than the merge commit the shards tested.
    'display-sha': { type: 'string' },
    target: { type: 'string' },
    'summary-file': { type: 'string' },
    'blocks-dir': { type: 'string' },
    'max-files': { type: 'string', default: '20' },
  },
});
const target = Number(args.target);
const maxFiles = Number(args['max-files']);
const headSha = (
  args['display-sha'] ||
  execFileSync('git', ['rev-parse', args.head], { encoding: 'utf8' })
)
  .trim()
  .slice(0, 7);

const apps = args.apps
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [id, name, dir] = line.split(/\s+/);
    return { id, name, dir: dir.replace(/\/$/, '') };
  });

// One directory per shard artifact (coverage-<id>-shard-<n>), each holding the shard's coverage-final.json.
const readShardReports = (id) => {
  if (!existsSync(args.reports)) {
    return [];
  }
  return readdirSync(args.reports)
    .filter((entry) => entry.startsWith(`coverage-${id}-shard-`))
    .map((entry) => path.join(args.reports, entry, 'coverage-final.json'))
    .filter((file) => existsSync(file))
    .map((file) => JSON.parse(readFileSync(file, 'utf8')));
};

const note = `_Vitest line coverage: the pull request fails when less than ${target}% of the changed lines of an app are covered, or when the app is under ${target}% overall (❌)._`;
const columns = `| This pull request (\`${headSha}\`) | Changed lines |`;
const summaryRows = [];
let failed = false;

for (const app of apps) {
  const reports = readShardReports(app.id);
  const diff = execFileSync(
    'git',
    [
      '-c',
      'core.quotePath=false',
      'diff',
      '--unified=0',
      '--no-color',
      args.base,
      args.head,
      '--',
      app.dir,
    ],
    {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
    },
  );
  const result = evaluateApp({
    files: mergeCoverageMaps(reports, app.dir),
    changedLines: parseChangedLines(diff),
    target,
  });
  if (reports.length === 0) {
    console.log(
      `::error title=${app.name} coverage::No coverage report found for ${app.name}.`,
    );
  } else if (result.overall.failed) {
    console.log(
      `::error title=${app.name} coverage::${app.name} coverage is ${result.overall.percent?.toFixed(2)}%, below ${target}%.`,
    );
  }
  if (result.patch.failed) {
    console.log(
      `::error title=${app.name} changed lines::${result.patch.percent.toFixed(2)}% of the ${app.name} changed lines are covered, below ${target}%.`,
    );
  }
  failed ||= result.overall.failed || result.patch.failed;

  const cells = `| ${overallCell(result)} | ${patchCell(result)} |`;
  summaryRows.push(`| ${app.name} ${cells}`);
  const details = uncoveredList(result, maxFiles);
  writeFileSync(
    path.join(args['blocks-dir'], `${app.id}-block.md`),
    [
      '<!-- coverage:start -->',
      '#### 📊 Coverage',
      columns,
      '| --- | --- |',
      cells,
      '',
      ...(details.length > 0 ? [...details, ''] : []),
      note,
      '',
      '<!-- coverage:end -->',
      '',
    ].join('\n'),
  );
}

appendFileSync(
  args['summary-file'],
  [
    '### Coverage',
    '',
    `| App ${columns}`,
    '| --- | --- | --- |',
    ...summaryRows,
    '',
    note,
    '',
  ].join('\n'),
);
process.exit(failed ? 1 : 0);
