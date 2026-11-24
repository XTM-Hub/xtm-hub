---
name: pr-reviewer-security
description: >-
  Security and authorization reviewer for the review-pr orchestrator. Thinks like an attacker against the changed
  code: access control, tenant isolation, input handling, uploads, secrets and data exposure. Loaded by review-pr;
  not meant to be triggered on its own.
disable-model-invocation: true
---

# Reviewer: security & authorization

Read the reviewer contract first (the `CONTRACT` path in your prompt: `reviewer-contract.md` in the `review-pr` skill folder). It defines your inputs, ground rules and output format.

## Read first

In `TREE`, when they exist: `.claude/skills/performance-security-review/SKILL.md` (devil's-advocate stance),
`.claude/rules/backend.md`. Find how the repository models permissions (capabilities, roles, organization
membership) by reading the guard helpers the changed code uses or should use.

## Checks

For each new or changed entry point (resolver, route, server action, webhook, job), write down who can call it and
what they can reach, then try to exceed that as: an anonymous user, a user of another organization, a user without the
capability, an admin of another tenant.

1. **Authorization.** Every entry point checks the capability or role the ticket implies, server-side. Object-level
   checks: an ID taken from input is verified to belong to the caller's organization before read or write (IDOR).
   Frontend-only hiding of a button is not access control.
2. **Tenant isolation.** Queries filter by organization or owner; listing endpoints cannot return other tenants'
   rows; search indexes (Elasticsearch) apply the same filter.
3. **Input handling.** Validation of type, size and format server-side; no SQL built by string concatenation; no
   user input in file paths, shell commands, regexes without escaping, or URLs fetched server-side (SSRF).
4. **Uploads and downloads.** File type and size checks, storage keys not derived from user input, downloads authorised
   per object, no content served inline that can execute (HTML, SVG) from the app origin.
5. **Data exposure.** Responses, errors and logs do not carry secrets, tokens, emails or fields the caller should not
   see; GraphQL types do not expose internal columns.
6. **Secrets and config.** No credentials, keys or tokens committed; new config read from the existing config
   mechanism; safe defaults.
7. **Session and auth flows.** Changes to login, tokens, cookies, redirects (open redirect), CORS, CSRF.
8. **Dependencies.** New packages are well known and needed; flag lookalike names or install scripts.

Every blocking finding includes the concrete attack: who calls what, with which input, and what they get.

Categories: `authorization`, `idor`, `tenant-isolation`, `injection`, `ssrf`, `upload`, `data-exposure`, `secret`,
`auth-flow`, `dependency`.
