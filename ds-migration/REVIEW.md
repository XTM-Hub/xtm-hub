---
name: ds-migration-epic-review
description: Finishes the human review of a design system migration epic once ds-migration/run.sh stopped at its gate. Walks a human through the automated review findings and the choices to validate, fixes what they approve, records the decisions in the specs, publishes, and validates the epic. Launched by `ds-migration/run.sh review`.
---

# Design system migration: finish an epic review

A human is at the keyboard, and may be new to this migration. The invocation names the epic, the pull
request and the folder of the run logs. Help them review the epic, decide, and close it. Answer in
the human's language.

The human decides. Ask before every choice that changes behaviour or look, before every commit
series, and before every push. Never run the main loop (`ds-migration/run.sh` without a subcommand):
the human relaunches it at the end. `ds-migration/WORKFLOW.md` still rules the code: the design
system is right, its own styling is never a defect, and nothing recreates the legacy look.

## 0. Orient the human

In five lines or fewer: the migration moves one component per commit on branch `issue/3507`, PR
#3715. `ds-migration/run.sh` stops at the end of each epic, posts a report and an automated review on
the PR, and waits for a human. This session goes through that review with them, then they relaunch
the script for the next epic.

## 1. Load the context

Read only, in parallel where possible.

- `ds-migration/sprint-status.yaml`: the epic's items and their status, the next epic.
- The gate comment on the pull request: the last comment titled `## <epic> is ready for review`
  (`gh pr view <pr> --comments`). It lists the items, the commits and the automated review findings.
- The commits of the epic: `git log --format='%h %s' origin/main..HEAD`, those whose subject ends
  with the issue of one of its items, fixes included.
- The spec of each item, `ds-migration/specs/<key>.md`: `## Decisions`, `## To validate`,
  `## Deferred findings`.
- Comments on the epic's issues and on the pull request since the gate: a reviewer may already have
  answered something.

## 2. Check each finding

For every finding of the automated review, open the code it cites and confirm it still holds: the
branch may have moved since the gate. Classify it:

- **Mechanical**: one correct fix, no design choice (an override to drop, a helper to share, a
  focusable trigger to fix).
- **Decision**: two or more defensible answers (a severity rule, a threshold, a variant).
- **Stale or wrong**: the code does not show it. Say why.

Do the same for the `To validate` lines of the epic's specs: most stay as traced, but flag those that
break a decision rule or contradict another spec.

## 3. Triage with the human

Show one table, most severe first:

| # | Severity | Finding | Evidence | Proposed action |
| --- | --- | --- | --- | --- |

Then ask, finding by finding, whether to **fix now**, **defer** (traced, left for later) or
**reject** (with the reason). For a decision, give the options with what each changes on screen,
your recommendation first, and ask one decision at a time. Recommend fixing now anything the next
epic would copy: an inconsistent rule, a missing shared helper.

## 4. Fix what the human approved

One finding at a time, one commit per finding.

1. Implement it, through a `frontend-code-writer` subagent for anything beyond a few lines, with the
   finding, the decision and the files. Shared helpers go where the codebase keeps them.
2. Record the decision where the next sessions read it: under `## Decisions` in the spec of the item
   the finding belongs to, and in every other spec of the epic it changes. Remove or rewrite the
   `To validate` line it settles. A deferred finding goes under `## Deferred findings`.
3. Verify: `yarn workspace @xtm-hub/frontend lint`, `format:check`, `i18n:check`, `check-ts` and the
   tests of the folders touched; `yarn workspace @xtm-hub/test_e2e lint` and `format:check` if a
   locator changed. Never run the e2e suite: its hooks drop the database schema.
4. Commit, signed, with no trailer: `fix(frontend): <what changed> (#<issue of the item>)`, body
   saying why, following the `commit-splitter` agent's message rules. Stage only that finding's files
   and the specs it updated.

When every approved finding is in:

- Run the whole suite, `yarn workspace @xtm-hub/frontend test`, and
  `node ds-migration/validate.mjs --imports-only` on the specs of every `done` item.
- If the frontend of this checkout answers on `http://localhost:3012`, capture the items whose screens
  changed, `node ds-migration/screenshot.mjs ds-migration/specs/<key>.md after`, and show the human
  the before and after images of `.git/ds-migration/screens/<key>/`.

## 5. Validate the epic and publish

With the human's go:

1. Set `<epic>: done` in `ds-migration/sprint-status.yaml` and commit it:
   `chore(frontend): validate <epic> of the design system migration (#3507)`.
2. Run `ds-migration/run.sh publish` in the background and follow its output: it copies each spec
   into its issue, pushes, waits for the pull request's required checks (around 25 minutes) and puts
   the board back in order. If the checks fail, read the failing job, fix it with the human, commit,
   and run it again.
3. Post one comment on the pull request, `## <epic> review`: what was fixed (with the commits), what
   was deferred, what was rejected and why, and the `To validate` lines accepted as they are.

## 6. Hand back

Tell the human the epic is closed and what comes next: the next epic in the status file, how many
items, and the command that runs it, `caffeinate -i ds-migration/run.sh`, to launch from this
checkout with the stack running (`docker compose -f xtm-hub-dev/docker-compose.yml up`,
`yarn dev:api`). Remind them of `ds-migration/run.sh debug <key>` if an item blocks.
