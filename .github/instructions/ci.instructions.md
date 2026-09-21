---
applyTo: '.github/workflows/**,xtm-hub-dev/**,chart/**,**/Dockerfile,**/*.Dockerfile,.dockerignore'
---

# CI, Docker & deployment

**Read [`.claude/rules/ci.md`](../../.claude/rules/ci.md) now and follow it** before working on a workflow, a Dockerfile or the Helm chart.

That file is the single source for these rules. Nothing is duplicated here, so this file on its own
tells you nothing — open it. It lives under `.claude/rules/` because that is where Claude Code loads
rules from; this pointer exists because Copilot requires path-specific instructions under
`.github/instructions/`. Keep the `applyTo` glob above and the `paths` glob in the rule identical.
