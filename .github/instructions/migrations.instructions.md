---
applyTo: 'apps/backend/src/migrations/**,apps/backend/src/es-migrations/**,apps/backend/src/seeds/**,apps/backend/tests/seeds/**'
paths:
  - "apps/backend/src/migrations/**"
  - "apps/backend/src/es-migrations/**"
  - "apps/backend/src/seeds/**"
  - "apps/backend/tests/seeds/**"
---

# Migration Instructions

Migrations are append-only history. Once a migration has run anywhere beyond your machine, never edit it — write a
new one.

For how to write and scaffold migrations themselves, follow
[`.claude/skills/knex-migration/SKILL.md`](../../.claude/skills/knex-migration/SKILL.md) (Postgres — table naming, `.alter()`
gotcha, `down` correctness) and
[`.claude/skills/elasticsearch-migration/SKILL.md`](../../.claude/skills/elasticsearch-migration/SKILL.md) (Elasticsearch —
mapping changes, isolation from app code). This file covers the surrounding pieces those skills don't: seeds and the
CI coupling.

## Seeds

Production seeds are in `apps/backend/src/seeds/`, test seeds in `apps/backend/tests/seeds/`. When `VITEST_MODE=true`
the backend targets `test_database` and the test seed directory. Adding a new required table usually means updating
the test seeds too, or integration tests will fail on missing fixtures.

## CI coupling

See [`ci.instructions.md`](ci.instructions.md) for the exact copy command. A migration that only works when run
from `apps/backend` will break the e2e job.
