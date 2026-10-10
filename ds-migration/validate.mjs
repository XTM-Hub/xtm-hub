#!/usr/bin/env node
// Deterministic checks on design system migration items, run by ds-migration/run.sh.
// Reads the contract in the spec frontmatter.
// Usage:
//   node ds-migration/validate.mjs <spec-file> [--base <rev>]
//     one item, after its Claude session and before its commit. Without --base it checks the
//     uncommitted changes (what run.sh is about to commit); with --base, everything since <rev>.
//   node ds-migration/validate.mjs --imports-only <spec-file>...
//     items already done, after a merge of the base branch: no legacy import of their symbols is
//     back and their legacy files are still gone.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });

// Minimal frontmatter reader: `key: value` and `key: [a, b]` lines between the first two `---`.
const parseFrontmatter = (text) => {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const unquote = (s) => s.trim().replace(/^["']|["']$/g, '');
  return Object.fromEntries(
    match[1]
      .split('\n')
      .map((line) => line.replace(/\s+#.*$/, ''))
      .filter((line) => /^[a-z_]+:/.test(line))
      .map((line) => {
        const [, key, raw] = line.match(/^([a-z_]+):\s*(.*)$/);
        const value = raw.startsWith('[')
          ? raw.slice(1, -1).split(',').map(unquote).filter(Boolean)
          : unquote(raw);
        return [key, value];
      }),
  );
};
const readSpec = (path) => parseFrontmatter(readFileSync(path, 'utf8'));
const asList = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const importsFrom = (source) =>
  new RegExp(`import\\s+(?:type\\s+)?\\{([^}]*)\\}\\s*from\\s*['"]${source}['"]`, 'g');
const LEGACY_IMPORT = importsFrom('@filigran/ui(?:/[a-z-]+)?');
const names = (clause) =>
  clause
    .split(',')
    .map((s) => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0])
    .filter(Boolean);

const sourceFiles = () => {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (['node_modules', '__generated__'].includes(name)) continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name)) files.push(path);
    }
  };
  ['apps/frontend/src', 'apps/frontend/app'].forEach(walk);
  return files.map((path) => ({ path, source: readFileSync(path, 'utf8') }));
};

// Legacy files still present, and imports from @filigran/ui of the given symbols.
const legacyLeftovers = (files, legacy, legacyFiles) => {
  const errors = legacyFiles.filter((path) => existsSync(path)).map((path) => `Legacy file still present: ${path}`);
  for (const { path, source } of files) {
    if (path.includes('/filigran-ui/')) continue;
    for (const [, clause] of source.matchAll(LEGACY_IMPORT)) {
      for (const name of names(clause)) {
        if (legacy.includes(name)) errors.push(`Legacy ${name} still imported from @filigran/ui in ${path}`);
      }
    }
  }
  return errors;
};

const finish = (errors, success) => {
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log(success);
};

const args = process.argv.slice(2);

if (args[0] === '--imports-only') {
  const specPaths = args.slice(1);
  const files = sourceFiles();
  const errors = specPaths.flatMap((path) => {
    const spec = readSpec(path);
    return legacyLeftovers(files, asList(spec.legacy_symbols), asList(spec.legacy_files_to_delete));
  });
  finish(errors, `No legacy usage is back for the ${specPaths.length} migrated items`);
} else {
  const [specPath, flag, baseRev] = args;
  if (!specPath || (flag && (flag !== '--base' || !baseRev))) {
    console.error('Usage: node ds-migration/validate.mjs <spec-file> [--base <rev>] | --imports-only <spec-file>...');
    process.exit(2);
  }
  const spec = readSpec(specPath);
  const errors = [];
  if (!spec.kind || !spec.target_module) errors.push('Spec frontmatter needs at least `kind` and `target_module`');

  // 1. Scope. Shared config, the legacy theme and dependencies only move in the cleanup item.
  const SHARED = [
    'package.json',
    'yarn.lock',
    'apps/frontend/package.json',
    'apps/frontend/tsconfig.json',
    'apps/frontend/vitest.config.ts',
    'apps/frontend/eslint.config.mjs',
    'apps/frontend/next.config.mjs',
    'apps/frontend/styles/globals.css',
    'apps/frontend/src/components/filigran-ui/theme.css',
  ];
  const GENERATED = ['apps/frontend/schema.graphql', 'apps/frontend/graphql/generated.ts'];
  // e2e locators follow the accessible names a migration changes; the e2e migrations and seeds
  // outside tests/ are copies of the backend's.
  const IN_SCOPE = ['apps/frontend/', 'apps/e2e/tests/', 'ds-migration/specs/'];
  // The status file belongs to run.sh, not to the item.
  const RUNNER_FILES = ['ds-migration/sprint-status.yaml'];
  const workingTree = git('status', '--porcelain', '--no-renames', '--untracked-files=all')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3));
  const committed = baseRev ? git('diff', '--name-only', '--no-renames', `${baseRev}...HEAD`).split('\n') : [];
  const changed = [...new Set([...committed, ...workingTree])].filter((p) => p && !RUNNER_FILES.includes(p));
  if (!changed.length) errors.push('No change to validate');
  for (const path of changed) {
    if (!IN_SCOPE.some((prefix) => path.startsWith(prefix)) || path.startsWith('apps/e2e/tests/__screenshots__/')) {
      errors.push(`Out of scope: ${path}`);
    } else if (GENERATED.includes(path)) {
      errors.push(`Generated file changed: ${path}`);
    } else if (SHARED.includes(path) && spec.kind !== 'cleanup') {
      errors.push(`Shared file changed outside the cleanup item: ${path}`);
    }
  }

  // 2. Legacy files are gone and no import of a migrated symbol from @filigran/ui is left.
  const files = sourceFiles();
  errors.push(...legacyLeftovers(files, asList(spec.legacy_symbols), asList(spec.legacy_files_to_delete)));

  // 3. Every target symbol of the spec is imported from its target module.
  const targetImport = importsFrom(`${escape(spec.target_module ?? '')}(?:/[A-Za-z-]+)?`);
  const used = new Set();
  for (const { source } of files) {
    for (const [, clause] of source.matchAll(targetImport)) names(clause).forEach((name) => used.add(name));
  }
  for (const name of asList(spec.target_symbols)) {
    if (!used.has(name)) errors.push(`${name} is never imported from ${spec.target_module}`);
  }

  finish(errors, `Design system migration checks passed for ${spec.key ?? specPath}`);
}
