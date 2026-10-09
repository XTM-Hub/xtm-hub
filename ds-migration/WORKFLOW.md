# Design system migration: one item, unattended

You run inside `ds-migration/run.sh`, with no human present. The invocation names ONE item of
`ds-migration/sprint-status.yaml` (its key, issue number, epic and kind) and ONE mode. Work on that
item and nothing else, then return the structured result. Never ask a question. Where a skill says
to ask the user, apply the decision rules below instead.

Each item takes two sessions. **Spec mode** analyses and writes the spec, code untouched. The script
then captures the screens the spec declares, in the light and dark themes, on the current code.
**Build mode** implements the spec and compares the rendering with those captures.

Run every shell command from the repository root, with paths relative to it. Delete a file with
`rm apps/frontend/<path>`. A refused command means changing the command, not working around it:
read files with Read and search with Grep or Glob rather than shell loops. Subagents always run in
the foreground: you get each one's report before you continue.

The script owns version control and the status file. Never run `git commit`, `git push`, `git stash`
or `git checkout`, and never edit `ds-migration/sprint-status.yaml`. The script validates your work,
commits it with the message you return, pushes, and waits for the pull request's checks. It only
starts an item once the items it depends on are done.

## Repository skills and agents

Use them by name; do not restate or override them.

| Step | Skill or agent | Why |
| --- | --- | --- |
| Analyse, spec | `change-delivery`, `.claude/rules/frontend.md`, `.claude/rules/graphql.md`, `.claude/rules/testing.md`, `.claude/rules/e2e.md` | Scope posture and the frontend stack, UI, i18n, data-layer and e2e rules |
| Analyse, spec | Design system consumer skill (`node_modules/@filigran/design-system/skills/consumer/design-system-usage/SKILL.md`) and the target's usage contract | How the package must be used; the shipped files win over memory |
| Implement | `frontend-code-writer` agent | Applies `coding-conventions`, `testing-validation`, `change-delivery` and a `performance-security-review` self-check |
| Implement, backend | `backend-code-writer` agent, with `knex-migration` or `elasticsearch-migration` | Not expected in this epic: `validate.mjs` rejects changes outside `apps/frontend/`. A spec that needs the backend is `NEEDS_HUMAN` |
| Compare | `ds-migration/screenshot.mjs`, then Read on the images | The rendering before and after, in both themes; the CI checks no pixel |
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

**The design system is right.** Its radius, colours, typography, shadows, focus rings and inner
spacing replace the legacy look on purpose. Never recreate the legacy look with extra classes, inline
styles or overridden tokens on a design system component.

**The swap, and nothing more.** A `ds` item replaces the component and keeps what each call site does.
It does not move the code around it closer to the design system: a slot, a shared pattern or an
accessibility improvement the legacy did not have goes under `## Deferred findings` for a later epic.
The legacy components next to it stay as they are until their own item.

- **Which component or variant**: pick the one whose role matches the legacy usage (main action,
  secondary action, destructive, link, icon only), not the one that looks most like the old rendering.
  When two fit the role equally, pick one and add a line under `## To validate`. Never block on it.
- **Visual difference** between the before and after screenshots: a change that comes from the design
  system's own styling is expected, keep it and trace nothing. A defect around the component is to
  fix: broken layout (overflow, misalignment, wrapping, collapsed width), a missing element, state or
  label, a size that no longer fits its container, cut text, or a theme where it becomes unreadable.
- **Portalled panels**: a combobox, select or menu panel opened from a surface above layer 0 (a sheet
  is `layer-2`) takes that surface's `layer-N` class through its content class prop
  (`contentClassName`, or `className` on the `*Content` part): the portal resolves layer 0 otherwise.
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

## Screenshots

`node ds-migration/screenshot.mjs <spec> before|after` opens this checkout's frontend, logged in as
the development admin, and captures each screen of the spec's `## Screens` block in both themes. It
prints, per screen and theme, the path of the before and after images: open them with Read. The
images stay under the git directory and are never committed. A screen fails on an HTTP error, a
page error, a redirect to the login page or a selector that matches nothing.

A screen is `{"name", "path", "steps"?, "clip"?}`: `path` is the URL path with its locale when the
route has one, `steps` a list of `{"click": selector}`, `{"hover": selector}` or
`{"waitFor": selector}` to reach a hidden state (an open dialog, menu, tooltip or snackbar), `clip`
a selector to crop to. Selectors are Playwright's, role-based first: `role=button[name="Save"]`.

## Spec mode

1. **Analyse.** Read the sources, the legacy component and every call site (Grep the imports). List
   each distinct legacy usage, the wrappers in `src/components/ui/`, the tests, the translations and
   the accessibility attributes involved. List the e2e locators that find those elements by role,
   label, placeholder or text (Grep `apps/e2e/tests/`): a design system component can change an
   accessible name, for example a required label whose `*` moves out of the label. When `ds-migration/specs/<key>.md` exists (a retry after a
   block), start from it and the answers on the issue.
2. **Spec.** Write `ds-migration/specs/<key>.md` from `ds-migration/spec-template.md`. The frontmatter
   is the contract the script checks: keep it exact. Every legacy usage gets a row in the props
   mapping, and every ambiguous choice of the decision rules a line under `## To validate`.
3. **Screens.** Declare one to three screens where the component renders, covering its distinct
   usages and states, the most visible first. The `cleanup` item declares none. Run
   `node ds-migration/screenshot.mjs ds-migration/specs/<key>.md before`, open the images and fix the
   screens until each one shows the component. A component no route renders is `NEEDS_HUMAN`.
4. **Return** `DONE`, or `NEEDS_HUMAN` with the `question`. Change no file outside
   `ds-migration/specs/`: the script rejects the item otherwise. The script then replaces the issue
   body with the spec and captures the screens.

## Build mode

The spec exists and the script has just captured its screens on the untouched code.

1. **Implement.** Launch ONE `frontend-code-writer` subagent with this prompt, and wait for it:
   "Implement `ds-migration/specs/<key>.md`. It is your only source of truth: change nothing it does
   not list. Do not commit. Report what changed, the files touched and the validation you ran."
   When the change alters an accessible name or role that an e2e locator uses, the spec lists that
   locator and the subagent updates it in `apps/e2e/tests/`, in the page object model when there is
   one, following `.claude/rules/e2e.md`. The component keeps the design system's name: never bend
   it back to the old one. Never run the e2e suite: its hooks drop the database schema, and CI runs
   it. `yarn workspace @xtm-hub/test_e2e lint` and `format:check` check the edited locators.
2. **Verify.** Run every command of the spec's Verification section. On failure, send the output to the
   same subagent to fix, at most twice. Still failing: return `FAILED` with the output.
3. **Compare.** Run `node ds-migration/screenshot.mjs ds-migration/specs/<key>.md after`, then open
   each before and after pair. Send every defect (decision rules above) to the implementation
   subagent, with the screen, the theme and what is wrong, then verify and compare again, at most
   twice. Still defective: return `FAILED`.
4. **Review.** Launch three context-free subagents in the same message and wait for all of them. Each
   one reads the change itself with `git diff HEAD` and `git status --porcelain` (untracked files are
   read directly), and returns findings only: location, problem, evidence, no fix.
   - "Use the `code-review` skill on the uncommitted change, against `ds-migration/specs/<key>.md`.
     Unattended run: do not ask questions, review only this change."
   - "Use the `performance-security-review` skill on the uncommitted change."
   - "Use the `testing-validation` skill on the uncommitted change: tests removed or weakened,
     behaviour left uncovered, translations missing in en, fr or ja."
   Verify each finding against the code yourself. Real and in scope: send it to the implementation
   subagent to fix, then re-run steps 2 and 3. Real but out of scope, or instruction drift for
   `hub-review`: add a line under `## Deferred findings` in the spec. Not real: drop it. At most two
   review rounds; a third means `FAILED`.
5. **Return** the structured result. Write `commit_subject` and `commit_body` with the `commit-splitter`
   agent's message rules: `feat(frontend): migrate <Name> to @filigran/design-system (#<issue>)` for
   kinds `ds` and `adoption`, `feat(frontend): rebuild <Name> on @filigran/design-system primitives
   (#<issue>)` for `candidate`, `chore(frontend): remove the legacy filigran-ui copy (#<issue>)` for
   `cleanup`. The body is three to six lines on what changed and why, with no trailer.

The script then validates again, the `after` screenshots included: a screen that no longer renders
blocks the item.

## CI fix mode

When the invocation says `CI fix mode`, the item is already committed and pushed, and the pull
request's required checks failed. The spec exists. Read the failing log the invocation names, send
the cause to a `frontend-code-writer` subagent with the spec, then run Build mode steps 2 to 4. An e2e
locator that still expects an accessible name this item changed is in scope: fix the locator in
`apps/e2e/tests/` and add it to the spec's Files in scope. Return `DONE` with a
`fix(frontend): ... (#<issue>)` subject, or `FAILED` when the cause is outside the item.

Before fixing anything, check whether the item can have caused the failure at all. Return `FLAKY`,
changing no file, when the log shows it cannot: a test Playwright reports as `flaky` (it passed on a
retry), a timeout on a page none of the item's files render, a failure of the runner, the network,
a Docker pull or a reporter, while every test passed. The summary's first line names the failing job
and the cause in one sentence: the script reruns the failed jobs once and quotes it on the pull
request.

## Validation fix mode

When the invocation says `Validation fix mode`, Build mode returned `DONE` but the script's own
validation failed: it runs the whole frontend suite, the e2e lint and the after screenshots, where
the session ran only the tests it touched. The change is still uncommitted. Read the failing log the
invocation names, find which step failed and why, send the cause to a `frontend-code-writer`
subagent with the spec, then run Build mode steps 2 to 4 and run the failing step again yourself. A
test that fails or leaks an unhandled error because of this change is in scope, even in a file the
spec does not list: add it to Files in scope. Return `DONE` with the commit subject and body of
Build mode, or `FAILED` when the cause is outside the item.

## Merge conflict mode

When the invocation says `Merge conflict mode`, the script is merging the base branch into the
migration branch and git stopped on conflicts in the files it names. Resolve each conflict so that
both sides survive: the base branch's change (a feature, a fix, a removal) applied on top of the
design system migration. Never bring back a legacy import or the legacy look: when the base branch's
change uses a component this branch already migrated, write it with the design system component,
following the props mapping of that component's spec in `ds-migration/specs/`. Remove every conflict
marker. Change no other file, and run no git command: the script stages and commits the merge. Run
`yarn workspace @xtm-hub/frontend check-ts` and `lint`, then return `DONE` with what each side
brought in `summary`, or `FAILED` when the two changes cannot be reconciled without a human.

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
call sites left on the legacy copy, a design system component restyled to look like the legacy one,
and every `To validate` line that looks wrong. Return `findings` as Markdown: a short verdict, then
one bullet per finding with its location and evidence.

## Result

- `DONE`: in Spec mode, the spec is written and its screens capture. In Build mode, verification,
  comparison and review passed, and the working tree holds the change and the spec.
- `NEEDS_HUMAN`: continuing is unsafe. `question` holds it, with the options. Leave the spec on disk.
- `FAILED`: verification or review could not converge. `summary` says where it stopped.
