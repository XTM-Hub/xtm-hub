---
name: ds-migration-team-feedback
description: Triages the team's comments on the design system migration pull request, screenshots included, with a human. Finds the cause of each remark, sorts out what the migration broke from what the design system intends, fixes what the human approves, and answers on the pull request. Launched by `ds-migration/run.sh feedback`.
---

# Design system migration: team feedback

A human is at the keyboard. The invocation names the pull request, the JSON file of its comments
and the folder of the run logs. The script has already downloaded every image and video of those
comments. Go through them with the human, decide, fix what they approve, and answer the team. Talk
to the human in their language; write GitHub text in English, plain, without em dashes.

The human decides. Ask before every fix, before every commit series, before every push and before
posting anything on GitHub. Never run the main loop (`ds-migration/run.sh` without a subcommand).
`ds-migration/WORKFLOW.md` still rules the code: its Decision rules apply to every fix.

When the invocation says the run is active, **triage only**: change no file outside
`ds-migration/team-feedback.md`, commit nothing, push nothing. The script is committing on this branch.
Record the approved fixes as `fix pending`; a later session, with the run stopped, makes them.

## 0. Orient the human

In five lines or fewer: the team reviews the migration on PR #3715 and comments with screenshots.
This session goes through the comments not settled yet, finds what causes each one, and proposes
what to do. What gets fixed lands as one commit per finding on `issue/3507`. Every settled comment
gets an answer on the pull request.

## 1. Load the context

Read only, in parallel where possible.

- The comments file: one entry per comment, with `kind` (`comment`, `review`, `inline`), `id`,
  `author`, `url`, `body`, `images` and `videos` (local paths), and `path` and `line` for an inline
  comment.
- The ledger, `ds-migration/team-feedback.md`, when it exists: the comments already settled, one row
  each. Skip them, except a `fix pending` row (to fix now, unless triage only) and a comment someone
  answered since (a reply in its thread, or a later comment quoting it).
- `ds-migration/sprint-status.yaml`: the items, their issue and status.
- The specs, `ds-migration/specs/<key>.md`: `## Decisions`, `## To validate`, `## Deferred findings`
  and `## Screens`, for decisions already taken.
- `git log --format='%h %s' origin/main..HEAD`: which commit migrated what.

## 2. Understand each comment

Look before you judge.

1. Read every image of the comment with the Read tool. For a video, extract frames first,
   `ffmpeg -loglevel error -i <video> -vf fps=2 <video>-%02d.png`, and read a few around the moment
   the comment describes.
2. Find the screen and the component: search the visible texts in `apps/frontend/messages/en.json`,
   then their keys in `apps/frontend/src`. An inline comment names its file and line.
3. Find what the branch changed there: `git log --format='%h %s' origin/main..HEAD -- <file>` and
   `git diff origin/main...HEAD -- <file>`. The item whose commit changed it is the one the remark
   belongs to.
4. Compare with the rendering before the migration: `.git/ds-migration/screens/<key>/before/` when
   that item captured this screen, otherwise the code on `origin/main`. When the frontend of this
   checkout answers on `http://localhost:3012` and a spec's `## Screens` covers the screen,
   `node ds-migration/screenshot.mjs ds-migration/specs/<key>.md after` shows the current rendering.

Several comments often describe one cause (the same colours on three pages, the same background in
two dialogs): group them into one finding.

## 3. Classify

| Class | When | Usual action |
| --- | --- | --- |
| **Regression** | The migration broke it: layout, readability in one theme, a lost state, a wrong variant, a surface token that no longer matches its container, a leftover legacy class | Fix in this PR |
| **Design system look** | A design system component renders it that way on purpose (radius, colours, inner spacing, typography) | Answer with the reason. If the team still finds it wrong, it is feedback for the design system, not an override here |
| **Mixed legacy** | A design system component sits in a legacy one not migrated yet (a legacy sheet, dialog or card) and the two disagree | Comment on that later item's issue so its spec session handles it, and answer with its number |
| **Pre-existing** | The same on `origin/main` | Out of scope: a follow-up issue if the human wants it |
| **Decision** | Two or more defensible answers (a line clamp, a tag colour, a placeholder rule) | Options to the human |
| **Not reproduced** | The code and the screens do not show it | Say what you checked, ask the author |

## 4. Triage with the human

Show one table, regressions first:

| # | Comments | What they see | Cause and evidence | Class | Proposed action |
| --- | --- | --- | --- | --- | --- |

`Comments` links each comment by its author (`[@hervyt](<url>)`). Evidence is a file and line, a
commit, or a before screenshot. Then ask, finding by finding: **fix now**, **later item** (a comment
on its issue), **follow-up issue**, **answer only** (no change, with the reason) or **reject** (with
the reason). For a decision, give the options with what each changes on screen, your recommendation
first, one decision at a time. Recommend fixing now what the next items would copy.

## 5. Fix what the human approved

Skip this section in triage only. One finding at a time, one commit per finding.

1. Implement it, through a `frontend-code-writer` subagent for anything beyond a few lines, with the
   comments, their images, the cause and the decision. Fix the cause, never by recreating the legacy
   look on a design system component.
2. When the decision is a rule the next items must follow, write it under `## Decisions` in the spec
   of the item it belongs to. When it holds for every item, propose a line in the Decision rules of
   `ds-migration/WORKFLOW.md`, and add it only with the human's go.
3. Verify: `yarn workspace @xtm-hub/frontend lint`, `format:check`, `i18n:check`, `check-ts` and the
   tests of the folders touched; `yarn workspace @xtm-hub/test_e2e lint` and `format:check` if a
   locator changed. Never run the e2e suite: its hooks drop the database schema.
4. Commit, signed, with no trailer: `fix(frontend): <what changed> (#<issue of the item>)`, or
   `(#3507)` when the cause spans several items. The body says what the team saw and why it
   happened, following the `commit-splitter` agent's message rules. Stage only that finding's files
   and the specs it updated.

For a **later item**, comment on its issue: what the team saw, the image links from the comment, and
what its migration must do about it. Its spec session reads the issue.

For a **follow-up issue**: `gh issue create --title "<type>(frontend): <what>" --body "<what the team saw, the comment link>"`.
A security issue goes to `XTM-Hub/xtm-hub-private`, never to this repository.

## 6. Record the decisions

`ds-migration/team-feedback.md` holds one row per settled comment, so that the next session skips it.
Create it when missing:

```markdown
# Team feedback on the design system migration

| Comment | Author | Finding | Decision | Commit, issue or reason |
| --- | --- | --- | --- | --- |
```

`Comment` is the comment link, labelled by its id. `Decision` is one of `fixed`, `fix pending`,
`later item`, `follow-up`, `answered`, `rejected`. Outside triage only, commit it on its own:
`docs(frontend): record the team feedback decisions (#3507)`.

## 7. Publish and answer

With the human's go:

1. Outside triage only, when something was committed: run `ds-migration/run.sh publish` in the
   background and follow it. It pushes, waits for the required checks and refreshes the issues. If
   the checks fail, read the failing job, fix it with the human and run it again.
2. Answer every settled comment on its own, so that its author sees the answer next to the remark.
   A pull request comment cannot be threaded: post a new one with
   `gh pr comment <pr> --body-file <file>`, in this shape:

   ```markdown
   > <first line of the comment>

   @<author> ([comment](<comment url>))

   <the answer: the commit and what changed, the issue, or the reason>

   <!-- ds-migration feedback -->
   ```

   For a review, link `([review](<url>))` without the author. Answer an inline comment in its
   thread instead: `gh api -X POST repos/<repository>/pulls/<pr>/comments/<id>/replies -F body=@<file>`,
   where `<repository>` is the `repository` header of the status file. Keep the last line: the
   script never lists a comment that carries it as feedback.
3. React on every settled comment: `+1` when fixed, `eyes` otherwise.
   `gh api -X POST repos/<repository>/issues/comments/<id>/reactions -f content=+1`, or
   `pulls/comments/<id>/reactions` for an inline comment.

## 8. Hand back

Tell the human what was settled, by decision, and what is left: `fix pending` rows, comments that
wait for their author. Then how to go on: `ds-migration/run.sh feedback` again for new comments or
pending fixes, `caffeinate -i ds-migration/run.sh` to relaunch the migration.
