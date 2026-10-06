# Design system migration: one item, unattended

You run inside `ds-migration/run.sh`, with no human present. The invocation names ONE item of
`ds-migration/sprint-status.yaml`: its key, issue number, epic and kind. Migrate that item and nothing
else, then return the structured result. Never ask a question. Where a skill says to ask the user,
apply the decision rules below instead.

The script owns version control and the status file. Never run `git commit`, `git push`, `git stash`
or `git checkout`, and never edit `ds-migration/sprint-status.yaml`. The script validates your work,
commits it with the message you return, pushes, and waits for the pull request's checks. It only
starts an item once the items it depends on are done.

## Repository skills and agents

Use them by name; do not restate or override them.

| Step | Skill or agent | Why |
| --- | --- | --- |
| Analyse, spec | `change-delivery`, `.claude/rules/frontend.md`, `.claude/rules/graphql.md`, `.claude/rules/testing.md` | Scope posture and the frontend stack, UI, i18n and data-layer rules |
| Analyse, spec | Design system consumer skill (`node_modules/@filigran/design-system/skills/consumer/design-system-usage/SKILL.md`) and the target's usage contract | How the package must be used; the shipped files win over memory |
| Implement | `frontend-code-writer` agent | Applies `coding-conventions`, `testing-validation`, `change-delivery` and a `performance-security-review` self-check |
| Implement, backend | `backend-code-writer` agent, with `knex-migration` or `elasticsearch-migration` | Not expected in this epic: `validate.mjs` rejects changes outside `apps/frontend/`. A spec that needs the backend is `NEEDS_HUMAN` |
| Review | `code-review` | The brutally honest pass; it also checks `coding-conventions`, `testing-validation`, the path rules and the agents |
| Review | `performance-security-review` | Devil's advocate on rendering, bundle size, unsafe HTML and future failures |
| Review | `testing-validation` | Existing tests protected, suite kept lean, new behaviour covered |
| Commit message | `commit-splitter` agent's message rules, `AGENTS.md` | Conventional commit, intent over file names, imperative mood |
| Instruction drift | `hub-review` | When the code contradicts `.claude/` or `AGENTS.md`, record it under Deferred findings; never edit those files here |

## Sources of truth

- The issue: `gh issue view <issue> --comments`, and its epic #3507. A human answer to a block is there.
- The design system package: the consumer skill above, `skills/consumer/usage-contracts/<Name>.md`,
  `dist/llms.txt` and the props in `dist/index.d.ts`.
- The reference migration: pull request #3614 (`gh pr diff 3614`). Imitate its approach.
- `.claude/rules/design-system.md`, `AGENTS.md`, and every spec in `ds-migration/specs/`, for
  decisions already taken. Reuse them: two components must not answer the same question differently.

## Decision rules

The goal is to cut `filigran-ui`, without the design team. Custom components are acceptable; what
matters is that every choice a designer should see is traced.

- **Visual or design choice** (variant, spacing, colour, which DS component fits): take the option
  closest to the current rendering, apply it, and add one line under `## To validate` in the spec.
  Never block on it.
- **`NEEDS_HUMAN`** only when continuing would break behaviour or data, when the design system cannot
  express a required behaviour, when the item needs a component that is not migrated yet and not
  listed as a dependency (name it in `question`), or when the change needs the backend.

## Kinds of item

- `ds` (`epic-1-primitives`, `epic-2-composites`): replace the legacy component with the design system
  one at every call site, then delete the legacy file from `src/components/filigran-ui/` and update the
  other legacy files that used it, as #3614 did.
- `candidate` (`epic-3-candidates`): the design system has no equivalent. Rebuild the component in its
  own folder, `apps/frontend/src/components/ui/<kebab-name>/`, with the package's layout (`<Name>.tsx`,
  `<Name>.meta.ts`, `<Name>.test.tsx`, `index.ts`), on design system primitives and tokens only, so it
  can be proposed upstream as is. Move every call site to it, then delete the legacy file. The spec's
  `kind: candidate` is what lists it as a design system candidate in the PR report.
- `cleanup` (`epic-4-cleanup`): remove `src/components/filigran-ui/`, its theme, the `@filigran/ui`
  aliases in `tsconfig.json` and `vitest.config.ts`, the dependencies only it used, and add a
  `no-restricted-imports` rule on `@filigran/ui`. Its dependencies guarantee epics 1 to 3 are done.
- `adoption` (`epic-5-adoptions`): the app has no legacy equivalent. Adopt the component where the code
  already hand-rolls the same pattern and the swap keeps the current look. Where adopting would change
  the look, leave the code as is and list the candidate places under `## To validate`.

## Steps

1. **Analyse.** Read the sources, the legacy component and every call site (Grep the imports). List
   each distinct legacy usage, the wrappers in `src/components/ui/`, the tests, the translations and
   the accessibility attributes involved.
2. **Spec.** Write `ds-migration/specs/<key>.md` from `ds-migration/spec-template.md`. The frontmatter
   is the contract the script checks: keep it exact. Every legacy usage gets a row in the props
   mapping, and every design choice a line under `## To validate`.
3. **Update the issue.** Replace the issue body with `Part of #3507.`, a blank line, then the spec
   without its frontmatter: `gh issue edit <issue> --body-file <file>`.
4. **Implement.** Launch ONE `frontend-code-writer` subagent with this prompt, and wait for it:
   "Implement `ds-migration/specs/<key>.md`. It is your only source of truth: change nothing it does
   not list. Do not commit. Report what changed, the files touched and the validation you ran."
5. **Verify.** Run every command of the spec's Verification section. On failure, send the output to the
   same subagent to fix, at most twice. Still failing: return `FAILED` with the output.
6. **Review.** Launch three context-free subagents in the same message and wait for all of them. Each
   one reads the change itself with `git diff HEAD` and `git status --porcelain` (untracked files are
   read directly), and returns findings only: location, problem, evidence, no fix.
   - "Use the `code-review` skill on the uncommitted change, against `ds-migration/specs/<key>.md`.
     Unattended run: do not ask questions, review only this change."
   - "Use the `performance-security-review` skill on the uncommitted change."
   - "Use the `testing-validation` skill on the uncommitted change: tests removed or weakened,
     behaviour left uncovered, translations missing in en, fr or ja."
   Verify each finding against the code yourself. Real and in scope: send it to the implementation
   subagent to fix, then re-run step 5. Real but out of scope, or instruction drift for `hub-review`:
   add a line under `## Deferred findings` in the spec. Not real: drop it. At most two review rounds;
   a third means `FAILED`.
7. **Return** the structured result. Write `commit_subject` and `commit_body` with the `commit-splitter`
   agent's message rules: `feat(frontend): migrate <Name> to @filigran/design-system (#<issue>)` for
   kinds `ds` and `adoption`, `feat(frontend): rebuild <Name> on @filigran/design-system primitives
   (#<issue>)` for `candidate`, `chore(frontend): remove the legacy filigran-ui copy (#<issue>)` for
   `cleanup`. The body is three to six lines on what changed and why, with no trailer.

## CI fix mode

When the invocation says `CI fix`, the item is already committed and pushed, and the pull request's
required checks failed. Skip steps 1 to 3: the spec exists. Read the failing log the invocation names,
send the cause to a `frontend-code-writer` subagent with the spec, then run steps 5 and 6. Return
`DONE` with a `fix(frontend): ... (#<issue>)` subject, or `FAILED` when the cause is outside the item.

## Sync fix mode

When the invocation says `Sync fix mode`, the script has just merged the base branch, and the checks
it names fail: new code from `main` uses a component this branch already migrated (its legacy file is
gone here), or no longer builds against the migrated components. Read the failing output, then move
each affected usage with the props mapping of that component's spec in `ds-migration/specs/`.
Change nothing else: no new spec, no issue update, no refactor. Run `check-ts`, `lint` and
`node ds-migration/validate.mjs --imports-only` on the specs of the items already done, then return
`DONE` with the files fixed in `summary`, or `FAILED`. Leave `commit_subject` and `commit_body` empty:
the script writes its own.

## Epic review mode

When the invocation says `Epic review mode`, every item of the epic is done or blocked and a human is
about to review the epic. Change nothing. Use the `code-review` skill on the epic's commits as one
change (`git show <sha>` for each), against their specs. Focus on what per-item reviews cannot see:
the same question answered differently by two components, helpers written twice, a growing file,
call sites left on the legacy copy, and every `To validate` line that looks wrong. Return `findings`
as Markdown: a short verdict, then one bullet per finding with its location and evidence.

## Result

- `DONE`: verification and review passed. The working tree holds the change and the spec.
- `NEEDS_HUMAN`: continuing is unsafe. `question` holds it, with the options. Leave the spec on disk.
- `FAILED`: verification or review could not converge. `summary` says where it stopped.
