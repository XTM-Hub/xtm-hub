---
chunk: ms-001-saved-search-model
rfc: RFC-XHUB-0000
rfc_sha: 0000000000000000000000000000000000000000
slice: MS-001
issue: 0
baseline_revision: 0000000000000000000000000000000000000000
acceptance: [AC-001, AC-003]
tests: [TST-001]
approved_by: none
review_loop_iteration: 0
---

<!-- The frontmatter above is the contract `node rfc-delivery/cli.mjs check-spec` reads. Keep it exact:
     `acceptance` and `tests` equal the chunk's entry in chunks.yaml, `rfc_sha` is rfc-status.yaml's
     source.sha, `baseline_revision` the full sha of HEAD when the spec is written.
     `approved_by` stays `none`: a human sets it when chunks.yaml asks for a spec checkpoint.
     Copy this file to <private>/rfc-delivery/<RFC-ID>/chunks/<chunk>.md, fill every section, delete
     these comments. Target: under 1500 tokens. Boundaries and examples, not step-by-step prose.
     This file is private: it may quote the RFC. Nothing from it goes into the public repository but
     the commit message and the pull request body the build session writes. -->

# MS-001 · Store saved searches behind the saved_searches flag

<intent-contract>

## Intent

**Problem:** <!-- What the user or the system cannot do today, in the RFC's words. One or two sentences. -->

**Approach:** <!-- The shape of the change this chunk makes, following the RFC's technical design. -->

## Acceptance criteria

<!-- Every criterion of `acceptance`, verbatim from the RFC, then the outermost surface where it is
     observed (a GraphQL operation, a page, a REST route, a migration) and the test that proves it.
     A criterion this chunk only prepares (behind a flag, completed by a later chunk) says so. -->

| ID | Criterion (verbatim) | Observed at | Proven by |
| --- | --- | --- | --- |
| AC-001 | WHEN a user saves a search, THE hub SHALL store its filters for that user. | `saveSearch` mutation | `apps/backend/src/modules/saved-search/saved-search.test.ts` (TST-001) |

## Boundaries & Constraints

**Always:** <!-- Rules this chunk must keep: the RFC's contracts, ADRs and guidelines it applies, the
repository rules (.claude/rules/*), the feature flag. -->

**Never:** <!-- What belongs to other chunks (name them), what the RFC excludes, what must not change. -->

## I/O & Edge-Case Matrix

<!-- One row per behaviour a test must pin, failure paths included. Every row gets a test. -->

| Scenario | Input / State | Expected | Error handling |
| --- | --- | --- | --- |
| HAPPY_PATH | | | |

</intent-contract>

## Code Map

<!-- The files this chunk reads or changes at baseline_revision, each with its role and why it is
     touched: call sites, modules, migrations, GraphQL operations, translations, e2e page objects. A
     file that is not listed is out of scope. -->

## Tasks

<!-- Ordered by dependency. Each task names its file(s) and the action. -->

- [ ] `path/to/file.ts`: what to do.

## Screens

<!-- Optional, for a chunk the user sees: one to three screens, the format of
     rfc-delivery/WORKFLOW.md, section Screenshots. Leave `[]` for a backend-only chunk. -->

```json
[]
```

## Verification

<!-- The narrowest commands that prove the chunk, from AGENTS.md and .claude/rules. Never the e2e suite. -->

- `yarn workspace @xtm-hub/backend check-ts`
- `yarn workspace @xtm-hub/backend lint`
- `yarn workspace @xtm-hub/backend test <changed folders>`

## Decisions

<!-- Choices made while writing this spec or building it, with the evidence. -->

## To validate

<!-- One bullet per choice a human should see: what was chosen, and the alternative. Copied into the
     private tracking pull request. Keep the heading even when empty. -->

## Deferred findings

<!-- One bullet per real review finding left out of this chunk. Copied into the tracking pull request. -->
