---
id: RFC-XHUB-9999
# no `type: rfc` line: the Flow plugin would lint this fixture as a real RFC
template: rfc@5.7
title: "Fictional RFC: saved searches on the library"
status: draft
prd: PRD-9999
covers: [PRD-9999/FR-001, PRD-9999/FR-002]
responsible: ["@someone"]
accountable: "@principal"
product: "XHUB"
repos: [XTM-Hub/xtm-hub, XTM-Hub/xtm-hub-docs]
baseline: {XTM-Hub/xtm-hub: "0000000"}
user_facing: true
security_sensitive: false
---

# RFC-XHUB-9999 — Fictional RFC: saved searches on the library

A test fixture for rfc-delivery. Nothing here describes a real feature.

## Behavior specification

| ID | Acceptance criterion | Covers |
|---|---|---|
| AC-001 | WHEN a user saves a search, THE hub SHALL store its filters for that user. | PRD-9999/FR-001 |
| AC-002 | WHEN a user opens the library, THE hub SHALL list their saved searches. | PRD-9999/FR-001 |
| AC-003 | IF a saved search name holds a pipe `a\|b`, THE hub SHALL keep it verbatim. | PRD-9999/FR-002 |
| AC-004 | WHERE the flag `saved_searches` is off, THE hub SHALL hide the feature. | PRD-9999/FR-002 |

## Test and validation plan

| Test | Level | Verifies |
|---|---|---|
| TST-001 | integration | AC-001, AC-003 |
| TST-002 | e2e | AC-002 |

## Delivery plan and commitment

### P1 — the feature

| ID | Slice | Type | Demo | Target |
|---|---|---|---|---|
| MS-001 | Backend: `saved_search` table, GraphQL `saveSearch \| savedSearches` (AC-001, AC-003) | technical (flag `saved_searches`) | A saved search read back over GraphQL | 2026-12-01 |
| MS-002 | Frontend: save button and list on the library (AC-002, AC-004) | functional | A user saves and reopens a search | 2026-12-08 |

### P2 — documentation

| ID | Slice | Type | Demo | Target |
|---|---|---|---|---|
| MS-003 | User documentation in xtm-hub-docs | functional | The page online | 2026-12-15 |

```markdown
| MS-999 | a slice inside a code fence is not a slice | functional | - | - |
```

## Risks and open questions

| ID | Risk or question | Owner | Mitigation / due |
|---|---|---|---|
| RISK-001 | Many saved searches slow the library | @someone | A limit of 50 per user |
| OQ-001 | Are saved searches shared with the organization? | @po | Before MS-002 |

## Traceability

| PRD requirement | Acceptance criteria | Design section | Tests |
|---|---|---|---|
| PRD-9999/FR-001 | AC-001, AC-002 | Technical design | TST-001, TST-002 |
| PRD-9999/FR-002 | AC-003, AC-004 | Technical design | TST-001 |
