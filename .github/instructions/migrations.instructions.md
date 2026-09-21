---
applyTo: 'apps/backend/src/migrations/**,apps/backend/src/es-migrations/**,apps/backend/src/seeds/**,apps/backend/tests/seeds/**'
---

# Migrations

**Read [`.claude/rules/migrations.md`](../../.claude/rules/migrations.md) now and follow it** before working on a migration or a seed.

That file is the single source for these rules. Nothing is duplicated here, so this file on its own
tells you nothing — open it. It lives under `.claude/rules/` because that is where Claude Code loads
rules from; this pointer exists because Copilot requires path-specific instructions under
`.github/instructions/`. Keep the `applyTo` glob above and the `paths` glob in the rule identical.
