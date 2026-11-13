---
name: rfc-delivery-debug
description: Investigates a chunk of an RFC delivery that is blocked or stopped rfc-delivery/run.sh, with its context loaded, then helps the human understand what happened and decide what to do. Launched by `rfc-delivery/run.sh <RFC-ID> debug <chunk>`.
---

# RFC delivery: debug one chunk

A human is at the keyboard. The invocation names one chunk, its status, its pull request, the
tracking folder in the private repository, the RFC and the folder of the run logs. Load the
context, explain what happened in plain words, and propose what to do next. Answer in the human's
language.

Change nothing before the human chooses. Never push, never force, never touch another chunk, never
edit `rfc-status.yaml` but as section 5 says, and never run `rfc-delivery/run.sh` unless asked. The
decision rules of `rfc-delivery/WORKFLOW.md` still apply: the RFC is right, the chunk and nothing
more.

## 1. Load the context

Read only, in parallel where possible.

- The chunk: `node rfc-delivery/cli.mjs chunk <dir> <chunk>` (its plan entry, issue, branch, pull
  request), `node rfc-delivery/cli.mjs list <dir>` (the stack around it).
- Its spec, `<dir>/chunks/<chunk>.md`, when it exists, and the RFC's criteria it claims.
- The tracking pull request's comments (`gh pr view <private_pull_request> --repo
  <private_repository> --comments`): the block, the question, and any human answer since.
- The chunk's public pull request and its comments, when it has one.
- The run logs that exist:

  | File | What it holds |
  | --- | --- |
  | `<chunk>-spec.json`, `<chunk>-build-mode.json`, `<chunk>-ci-fix-mode.json`… | Each session: `.structured_output` (status, summary, question), `.result`, `.total_cost_usd`, `.session_id` (reopen with `claude --resume <id>`) |
  | the same names in `.jsonl` | Every message and tool call, subagents included. Search it rather than reading it whole |
  | `.stderr` | Crashes and timeouts |
  | `<chunk>-check-spec.log` | The spec contract check after Spec mode |
  | `<chunk>-validate.log` | The script's validation: backend `test:ci`, frontend lint, format, i18n, types, tests, e2e lint, `check-spec`, after screenshots. The last command that ran failed |
  | `<chunk>-ci.log` | The failing CI jobs |
  | `run.log` | The sequence of the run: grep the chunk |

- The code. `git stash list | grep "rfc-delivery <chunk>"`: the work the block put aside, or
  `… interrupted` for a run that crashed. When the checks failed after the commit, the code is on
  the chunk's branch: `git log --oneline <base>..<branch>`. A `<dir>/chunks/<chunk>.patch` is an
  attempt saved at an intent gap.

## 2. Restore the code

When a stash holds the chunk's work and `git status` is clean, check out the chunk's branch, say so
and ask before applying it. Use `git stash apply <ref>`, never `pop`. Show `git diff --stat`.

## 3. Analyse

Find the cause and its evidence; reproduce what can be (the failing command, the screenshots).

| Cause | Signs |
| --- | --- |
| Intent gap or a decision only a human can take | `NEEDS_HUMAN` with a `question`; a `.patch` beside the spec |
| The RFC does not match the code | The question or the spec cites a table, a contract or a component the code does not have: the RFC may need an amendment (`/flow:amend` in filigran-flow) |
| Verification does not converge | `FAILED`, the same command failing in the session and in `<chunk>-validate.log` |
| Review does not converge | Findings fixed then found again; `review_loop_iteration` at its cap |
| Spec contract | `<chunk>-check-spec.log` |
| Environment | No structured output, a timeout, the backend or the database unreachable |
| Permissions | `Permission to use … has been denied` in the `.jsonl`: the allowlist in `run.sh` lacks the command |
| CI | `<chunk>-ci.log`; a `FLAKY` verdict that failed again after the rerun |

## 4. Report

Short, in this order: **what happened** (the step that stopped), **why** (the cause, with file and
line or log excerpt), **what to do** (the options, the recommended one first):

- **Answer, then let the agent redo it.** The answer goes in the tracking pull request, or under
  `## Decisions` in the spec. Put the code back aside if you applied it. Then
  `rfc-delivery/run.sh <RFC-ID> resume <chunk>` retries from the code put aside, or
  `rfc-delivery/run.sh <RFC-ID>` afresh.
- **Amend the plan or the RFC.** A chunk too big or badly cut: edit `chunks.yaml` in the tracking
  pull request (`node rfc-delivery/cli.mjs generate <dir>` then merges the statuses back). An RFC that
  is wrong: amend it in filigran-flow, and record the new commit in `rfc-status.yaml`'s
  `source.sha` with the human.
- **Finish it by hand** here, then commit the way the script does (section 5).
- **Fix the environment**, then run again.

Then wait for the human's choice.

## 5. Act on the choice

- **Put the code back aside**: `git stash push --include-untracked -m "rfc-delivery <chunk>"`.
- **Finish by hand**: once every command of the spec's Verification section passes, commit on the
  chunk's branch, signed, with `node rfc-delivery/cli.mjs title <dir> <chunk>` as the subject (a fix
  after a failed check: `fix(<scope>): <what> (#<issue>)`), no trailer. Then
  `node rfc-delivery/cli.mjs set <dir> <chunk> review`. The next `rfc-delivery/run.sh <RFC-ID>` pushes,
  opens or updates the pull request, waits for the checks and marks it ready.
- Drop the chunk's stashes only once it is `done`, and only with the human's go.
