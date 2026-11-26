---
name: ds-migration-debug
description: Investigates a design system migration item that is blocked or stopped ds-migration/run.sh, with its context loaded, then helps the human understand what happened and decide what to do. Launched by `ds-migration/run.sh debug <key>`.
---

# Design system migration: debug one item

A human is at the keyboard. The invocation names one item of `ds-migration/sprint-status.yaml`, its
issue, its status and the folder of the run logs. Load the context, explain what happened in plain
words, and propose what to do next. Answer in the human's language.

Change nothing before the human chooses. Never push, never force, never touch another item, and never
run `ds-migration/run.sh` unless asked. The decision rules of `ds-migration/WORKFLOW.md` still apply:
the design system is right, and its own styling is never a defect.

## 1. Load the context

Read only, and in parallel where possible.

- The item's line, its dependencies and its dependents in the status file. The pull request number is
  in the header.
- The spec, `ds-migration/specs/<key>.md`, when it exists.
- The issue and its comments: `gh issue view <issue> --comments`. The block reason, the question and
  any human answer are there.
- The item's comments on the pull request: `gh pr view <pr> --comments`.
- The run logs that exist:

  | File | What it holds |
  | --- | --- |
  | `<key>-spec.json`, `<key>.json` | Spec and build sessions: `.structured_output` (status, summary, question), `.result` (the session's last message), `.total_cost_usd`, `.session_id` (the human can reopen it with `claude --resume <id>`) |
  | `<key>-spec.jsonl`, `<key>.jsonl` | The same sessions event by event: every message, tool call and tool result, subagents included. Search it rather than reading it whole |
  | `<key>-spec.stderr`, `<key>.stderr` | Crashes and timeouts |
  | `<key>-before.log` | The before screenshots taken by the script |
  | `<key>-validate.log` | The script's validation, in this order: lint, format, i18n, types, tests, `validate.mjs`, after screenshots. The last command that ran is the one that failed |
  | `<key>-ci.log` | The failing CI jobs |
  | `screens/<key>/before/`, `screens/<key>/after/` | The screenshots, light and dark: open the pairs with Read |
  | `run.log` | The sequence of the run: grep the key |
  | `preflight.log`, `app.log` | The browser and the frontend of this checkout |

- The code. `git stash list | grep "ds-migration <key>"`: a stash named `ds-migration <key>` holds
  the work put aside by the block, one named `ds-migration <key> interrupted` the work of a run that
  crashed. When the checks failed after the commit, the code is on the branch:
  `git log --oneline origin/main..HEAD | grep "(#<issue>)"`.

## 2. Restore the code

When a stash holds the item's work and `git status` is clean outside `ds-migration/`, say so and ask
before applying it. Use `git stash apply <ref>`, never `pop`: the stash stays until the item is done.
Then show what the session had changed with `git diff --stat`.

## 3. Analyse

Find the cause and its evidence. Reproduce what can be: run the failing command again
(`yarn workspace @xtm-hub/frontend lint|format:check|i18n:check|check-ts|test`,
`node ds-migration/validate.mjs <spec>`, `node ds-migration/screenshot.mjs <spec> after`), read the
code it points at, open the screenshots.

| Cause | Signs |
| --- | --- |
| A decision only a human can take | `NEEDS_HUMAN` with a `question` |
| Verification does not converge | `FAILED`, and the same command fails in the session result and in `<key>-validate.log` |
| Visual defect | An after screenshot shows broken layout, a missing element or an unreadable theme. A change of the design system's own styling is not one |
| Review does not converge | The session result reports findings fixed then found again |
| Missing dependency | The question or the code needs a component that is not migrated yet |
| Out of scope | `validate.mjs`: `Out of scope`, `Shared file`, `Generated file` |
| Environment | No structured output, a timeout in the stderr, the app or the backend unreachable, `preflight.log` |
| Permissions | A tool result in the `.jsonl` says `Permission to use … has been denied`: the allowlist in `run.sh` lacks the command, or the session used a form it refuses (`cd`, `git -C`, an absolute path) |
| CI | The item is committed and `<key>-ci.log` shows the failing job. When the CI fix session returned `FLAKY`, the script already reran the failed jobs once and they failed again: a second flake, or a real failure the session misread |

## 4. Report

Short, in this order:

1. **What happened**: the step that stopped, in one or two sentences.
2. **Why**: the cause, with the evidence: file and line, log excerpt, screenshot.
3. **What to do**: the options, the recommended one first, each with what it costs.
   - **Decide, then let the agent redo it.** Write the decision on the issue or under `## Decisions`
     in the spec, and put the code back aside if you applied it. Then `ds-migration/run.sh resume <key>`
     retries the item from the code it put aside, or `ds-migration/run.sh` retries it afresh (from its
     build when its spec is done).
   - **Finish it by hand** here, then commit it the way the script does (section 5). The script pushes
     it and waits for the checks on its next run.
   - **Leave it blocked.** A question with no answer on its issue is left aside by the next runs, and
     only its dependents wait; any other failure is retried by every run until it passes.
   - **Fix the environment** (stack, Chromium, port, network), then run again.

Then wait for the human's choice.

## 5. Act on the choice

- **Put the code back aside**, under the name `run.sh resume` looks for:
  `git stash push --include-untracked -m "ds-migration <key>" -- . ':(exclude)ds-migration'`.
- **Finish by hand**: once every command of the spec's Verification section passes, set the item to
  `review` in the status file, stage everything outside `ds-migration/` plus the spec and the status
  file, and commit with the subject of `ds-migration/WORKFLOW.md` (Build mode, step 5), no trailer.
  For an item whose checks failed after its commit, commit the fix as
  `fix(frontend): <what> (#<issue>)` and set the item to `review`.
- In both cases, `ds-migration/run.sh` picks the item up on its next run, waits for the checks,
  comments on the pull request and removes the `needs more info` label from the issue.
- Drop the item's stashes only once it is `done`, and only with the human's go.
