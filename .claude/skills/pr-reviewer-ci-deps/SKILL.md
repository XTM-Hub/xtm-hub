---
name: pr-reviewer-ci-deps
description: >-
  CI, dependencies and infrastructure reviewer for the review-pr orchestrator. Judges workflow, Docker, Helm and
  package manifest changes. Loaded by review-pr; not meant to be triggered on its own.
disable-model-invocation: true
---

# Reviewer: CI, dependencies & infra

Read the reviewer contract first (the `CONTRACT` path in your prompt: `reviewer-contract.md` in the `review-pr` skill folder). It defines your inputs, ground rules and output format.

## Read first

In `TREE`, when they exist: `.claude/rules/ci.md`, `AGENTS.md` (setup and dependency rules), `.yarnrc.yml`, the root
`package.json` (`packageManager`, `catalog`).

## Checks

1. **Dependencies.** Shared versions pinned in the root `catalog` and referenced as `"catalog:"`; lockfile updated
   consistently with manifests; no version hardcoded in documentation; new packages justified by the ticket, well
   known, and not duplicating one already in use. Major bumps: look for the changelog's breaking changes in code that
   uses the package.
2. **Workflows.** Least-privilege `permissions`, no `pull_request_target` checking out untrusted code with secrets,
   no secrets echoed, third-party actions pinned the way the repository pins them, path filters and required checks
   still cover what they should, caching keys correct.
3. **Docker.** Base images pinned as the repository does, no secrets baked into layers, non-root user kept, layer order
   keeps caching, `.dockerignore` still excludes what it should.
4. **Helm / deployment.** Values have safe defaults, new env vars wired through every place config is read, resource
   limits and probes kept, backward compatible for existing installs (renamed values keep a fallback).
5. **Scripts and tooling.** No new tooling the repository did not already have (AGENTS.md forbids it in XTM Hub);
   scripts are idempotent and fail loudly.

Categories: `dependency`, `lockfile`, `workflow`, `supply-chain`, `docker`, `helm`, `config`, `tooling`,
`rule-violation`.
