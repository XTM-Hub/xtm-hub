---
name: start-rfc
description: >-
  Starts the delivery of a Filigran Flow RFC in XTM Hub, interactively, with the developers who will
  own it - reads the RFC and its context in filigran-flow, runs a readiness gate, takes the RFC's
  delivery slices as chunks (one pull request each), measures each against the code and has the
  developers validate them, splitting only a slice too big to review, has the plan reviewed
  independently, then writes it in xtm-hub-private, creates the issues, the RFC branch
  and its draft pull request, and the tracking pull request the team approves before
  `rfc-delivery/run.sh` builds the chunks. Use when someone says "let's build RFC-XHUB-NNNN", "start
  the RFC", "plan the chunks of", or names an RFC to implement. Not for writing the RFC (`/flow:write-rfc`).
---

# Start the delivery of an RFC

BMAD's sprint planning, for one Flow RFC: check the plan is implementable, turn it into stories,
write the tracking file. Here the stories are **chunks**: one pull request each, stacked on one
another, built later by `rfc-delivery/run.sh` (see `rfc-delivery/README.md`).

A human is at the keyboard: usually the engineers who will review the chunks. **The split is
already theirs**: they wrote the RFC's delivery plan, its slices `MS-NNN`, with `/flow:write-rfc`.
Do not cut it again from scratch. Take each slice as one chunk, confront it with the code as it is
today, and ask them to validate it; rewrite a slice into several chunks only where it is too big to
review, and only with their agreement. Write nothing public before they confirm. Answer in the human's language; write files in
English.

Paths: `<flow>` is the filigran-flow checkout (`../filigran-flow` by default), `<private>` the
xtm-hub-private checkout (`../xtm-hub-private`), `<dir>` = `<private>/rfc-delivery/<RFC-ID>`. The
plan and the specs are private: they may quote the RFC. What lands in xtm-hub, which is public
(issue and pull request titles, `public_title`), follows the Confidentiality section of
`rfc-delivery/WORKFLOW.md`.

## 1. Find and read the RFC

1. `git -C <flow> fetch --quiet origin`, then
   `node rfc-delivery/cli.mjs locate <RFC-ID> --flow <flow>`. RFCs are drafts on branches until
   approved: when several branches hold it, show each with its last change and ask which one.
2. Read, in full and in parallel: the RFC (`git -C <flow> show <branch>:<path>`), its parsed form
   (`node rfc-delivery/cli.mjs parse <branch>:<path> --flow <flow>`), its PRD
   (`prds/<prd>-*/prd.md` on the same branch), the ADRs in `links.adrs`, the XHUB and suite guidelines
   (`gdls/`), then `AGENTS.md` and the `.claude/rules/` files of the areas its technical design touches.
3. When `<dir>` already exists, this is a re-plan: read `chunks.yaml` and `rfc-status.yaml`, say what
   is built, and plan only what is not (`generate` keeps the statuses of the chunks that stay).

## 2. Readiness gate

`node rfc-delivery/cli.mjs readiness <branch>:<path> --flow <flow>` gives the deterministic half:
`PASS`, `CONCERNS` or `FAIL` (nothing to build here, exit code 2). Add your own judgment, as a skeptic reading a
handoff, with evidence:

- Is the technical design grounded in the code as it is? Compare its `baseline` for
  XTM-Hub/xtm-hub with `origin/main`: `git log --oneline <baseline>..origin/main -- <paths it names>`.
- Can each acceptance criterion be observed and tested at a surface the hub has?
- Do the open questions (`OQ-`) block a slice, or only a later one?

Show one verdict, `PASS`, `CONCERNS` or `FAIL`, then each concern in one line. On `FAIL`, stop:
the RFC goes back to its authors (`/flow:clarify`, `/flow:amend` in filigran-flow). On `CONCERNS`,
ask whether to go on; a concern the team accepts becomes a guardrail of the chunk it touches
(`invoke_dev_with`, step 4).

## 3. Measure each slice against the code

Launch one `Explore` subagent per slice of this repository, all in one message, each with: the
slice row, its criteria and tests, the technical design passages it needs, and the question "which
files, modules, migrations, GraphQL operations, translations and e2e page objects does this slice
touch at HEAD, how many lines will the change likely add or change, and what could break".

## 4. Validate the chunks

Start from the RFC: **one chunk per slice**, in the delivery plan's order, each claiming the
criteria and tests the slice names. Show it as one table, with what the exploration measured:

`| Chunk | Slice | Criteria | Files touched | Estimated diff | Depends on | Verdict |`

The verdict is **ok**, or **too big** with the reason. A chunk must:

- be reviewable in about half an hour: a few hundred changed lines, one concern;
- pass the CI on its own on top of the chunks below it, and leave `main` releasable once merged: a
  technical slice stays behind the RFC's feature flag;
- come after what it needs (a migration before its use, the backend before the frontend that calls
  it): `depends_on` lists the chunks it builds on, all earlier in the stack;
- claim the criteria it delivers (`acceptance`) and the tests that prove them (`tests`); a purely
  technical chunk says why it claims none (`no_acceptance_reason`).

For a slice that is too big, propose where to cut it (`ms-001-…`, `ms-001-…`: by layer, migration
first, then by user journey) and what each part claims. Then ask the engineers to validate the
table as a whole: they accept, amend or reject each rewrite, and may point out a slice the
exploration misjudged. Ask once, not slice by slice; discuss only what they question. Capture every
constraint they voice (a module to avoid, a trap in the data, a reviewer to involve) as a line of
that chunk's `invoke_dev_with`.

A rewrite that changes the slices themselves (merging two, moving a criterion to another slice) is
a change of the RFC: say so, and suggest amending its delivery plan in filigran-flow
(`/flow:amend`) so that the RFC and the chunks keep the same slices.

Slices another repository delivers get a chunk with its `repository:`, which the loop skips; a
slice the team decides not to build now goes under `skipped_slices` with the reason.

Then agree on:

- the public names: each chunk's `type`, `scope` and `title` (its issue title `type(scope): title`;
  its pull request title adds ` (#issue)`; starts lowercase, keeps acronyms, no trailing period,
  imperative), and the RFC's `public_title` (`feat(scope): …`, the title of the RFC issue and pull
  request). Propose them from the slice titles, under that same Confidentiality section;
- `spec_checkpoint: true` for the chunks whose spec a human approves before the build: a migration of
  existing data, a security-sensitive change, the first chunk of a new module.

## 5. Write the plan

On a branch of the private repository, `git -C <private> switch -c rfc/<RFC-ID> origin/main` (or
the existing one). Write `<dir>/chunks.yaml`:

```yaml
# Plan of RFC-XHUB-NNNN, agreed with <who> on <date>. Read by rfc-delivery/run.sh, never written by it.
rfc: RFC-XHUB-NNNN
skipped_slices: {}            # MS-NNN: why it is not built now
chunks:
  - id: ms-001-short-name     # starts with its slice, lowercase
    slice: MS-001
    type: feat
    scope: backend
    title: store saved searches behind their flag
    acceptance: [AC-001, AC-003]
    tests: [TST-001]
    depends_on: []
    spec_checkpoint: false
    description: >-
      What the chunk delivers, in two or three sentences, for the Spec mode session.
    invoke_dev_with: >-
      The engineers' guardrails: what to reuse, what to avoid, what a reviewer will look for.
```

Then generate the status file with its header, and validate against the RFC:

```bash
node rfc-delivery/cli.mjs generate <dir> --header '{
  "generated": "<today>", "title": "<the RFC title>", "public_title": "feat(scope): …",
  "source": {"repository": "XTM-Flow/filigran-flow", "branch": "<branch without origin/>", "path": "<path>", "sha": "<sha>"},
  "repository": "XTM-Hub/xtm-hub", "base": "main", "branch": "none", "rfc_issue": "none", "pull_request": "none",
  "private_repository": "XTM-Hub/xtm-hub-private", "private_branch": "rfc/<RFC-ID>", "private_pull_request": "none",
  "required_checks": "run-api-unit-tests, run-front-unit-tests, run-e2e-tests",
  "github_project": "XTM-Hub/1", "project_statuses": "Development, Code review, Ready to Merge",
  "labels": "filigran team, vibe-coded", "rfc_status": "planning"}'
node rfc-delivery/cli.mjs validate <dir> --rfc <branch>:<path> --flow <flow>
```

On a re-plan, `generate` keeps the issues, branches, pull requests and `rfc_status` the delivery
already has, whatever the header says, and the statuses of the chunks that stay. Take
`required_checks` from the checks `main` requires today (`.github/workflows/dockerbuild-ci.yml`
and the branch protection) when they changed. Fix every error; discuss every warning.

## 6. Independent review of the plan

The engineers validated the plan: now let reviewers who did not take part look at it, the rewritten
slices first. Launch four
context-free subagents in one message, each reading `<dir>/chunks.yaml`, the RFC
(`git -C <flow> show <sha>:<path>`) and the code, and returning findings only (location, problem,
evidence):

- **Coverage**: every criterion and test of the slices built here is claimed by exactly one chunk,
  or its absence is explained; nothing a chunk claims belongs to another slice.
- **Size and seams**: for each chunk, the files it will touch and an estimate of its diff; a chunk too
  big to review, or two too small to stand alone.
- **Stack safety**: each chunk green on its own on top of the ones below, the order of migrations and
  contracts, the flag of technical slices, what a half-merged stack would leave in `main`.
- **Devil's advocate**: the strongest alternative cut (by layer, by user journey, by risk), and what
  it would do better.

Write their findings, verified against the code, to `<dir>/split-review.md`, then walk the engineers
through them one at a time: amend the plan, or record why not in the same file. Re-run `validate`.

## 7. Create the delivery

Show what will be created, then ask once:

- in XTM-Hub/xtm-hub (public): the RFC issue titled `public_title` and one sub-issue per chunk; the
  branch `issue/<RFC issue>` from `origin/main` with one empty commit, and its **draft** pull request
  onto `main`;
- in XTM-Hub/xtm-hub-private: the branch `rfc/<RFC-ID>` with `<dir>`, and the **tracking pull
  request**, where the team reviews the split.

On the go: `rfc-delivery/run.sh <RFC-ID> issues --yes`, then `rfc-delivery/run.sh <RFC-ID> start`.
Both need what `rfc-delivery/README.md` (Commands) lists.

## 8. Hand over

In a few lines: the links of the two pull requests; that the team reviews the split in the tracking
pull request, and that **an approval by someone other than its author starts the loop**; the command,
to launch from this checkout with what `rfc-delivery/README.md` (Commands) lists:
`caffeinate -i rfc-delivery/run.sh <RFC-ID>`; and what follows, as `rfc-delivery/README.md` (The
stack) describes, ending with `rfc-delivery/run.sh <RFC-ID> review`.
