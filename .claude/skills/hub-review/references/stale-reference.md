# Stale-Reference Lens

**Goal:** Find backtick-quoted paths, `yarn` commands, `applyTo` / `paths` globs, symlink targets, and version
literals in the reviewed content that no longer resolve against the real repository, and nothing else. Do not judge whether the guidance itself is
still good advice — that is the code-usage-mismatch lens's job.

## Evidence rules

- Never flag a reference without checking it: read the file/dir with `view`/`glob`, or grep the relevant
  `package.json`.
- A `yarn workspace @xtm-hub/<name> <token>` reference is valid if `<token>` matches a script name **or** a
  `dependencies`/`devDependencies` key in that workspace's `package.json` (a direct binary invocation, e.g.
  `next typegen` is valid because `next` is a dependency, even with no `next` script).
- A bare `yarn <script>` reference (no `workspace` prefix) is valid if it matches a script in the root
  `package.json` or any workspace's `package.json`.
- A path reference is valid if it resolves either exactly as written from the repo root, or under `apps/backend/`,
  `apps/frontend/`, or `apps/e2e/` — instructions files write paths relative to the app they document (e.g.
  `.claude/rules/backend.md` saying `src/config.ts` means `apps/backend/src/config.ts`).
- An `applyTo` or `paths` glob (in a `.claude/rules/*.md` frontmatter) is valid if it matches at least one real file in
  the repo.
- Every `.claude/rules/*.md` file must carry **both** an `applyTo` string (Copilot) and a `paths` list (Claude
  Code) covering the same globs. One without the other silently cuts that tool off from the rule. Check the two
  agree, pattern for pattern.
- Every rule must also have its `.github/instructions/<area>.instructions.md` symlink, or Copilot never sees it.
  With `.github/skills` → `../.claude/skills`, those are the repository's committed symlinks: verify each
  resolves (`ls -l`, `readlink`). A broken or missing one fails silently.
- A version literal (Node, Yarn, a package version) is stale if it contradicts `.nvmrc`, the `packageManager` field
  in the root `package.json`, or the `catalog` block in `.yarnrc.yml` — check those files, don't assume from memory.

## Review sequence

1. Extract every backtick-quoted path, `yarn` command, `applyTo` glob, and version literal from the in-scope
   content.
2. Verify each per the evidence rules above.
3. For each unresolved reference, note exactly what you checked and what's missing (e.g. "no `next` script and no
   `next` dependency in `apps/frontend/package.json`") — a finding must show its evidence, not just assert staleness.
4. If the fix is unambiguous (the referenced file moved and you can find where, or the version literal has one
   correct replacement), propose it; otherwise leave `fix` empty and let escalation resolve it.

## Output

Each finding: `lens: stale-reference`, `location`, `finding` (the broken reference and why), `status`.
