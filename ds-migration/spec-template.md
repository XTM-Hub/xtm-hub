---
key: 3561-textarea
issue: 3561
epic: epic-1-primitives
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [Textarea]
target_module: "@filigran/design-system"
target_symbols: [Textarea]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/servers/Textarea.tsx]
---

<!-- The frontmatter above is the contract read by ds-migration/validate.mjs. Keep it exact.
     A candidate sets `kind: candidate` and `target_module: "@/components/ui/<kebab-name>"`.
     Copy this file to ds-migration/specs/<key>.md, fill every section, delete these comments.
     Target: under 1200 tokens. Boundaries and examples, not step-by-step instructions. -->

# Textarea → `@filigran/design-system`

## Intent

<!-- One or two sentences: what moves where, and what must not change for users. -->

## Props mapping

<!-- One row per distinct legacy usage found in the code. Anything not listed here is out of scope. -->

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<Textarea rows={4} />` | `<Textarea rows={4} />` | 3 |

## Files in scope

<!-- Call sites, wrappers in src/components/ui/, legacy files in filigran-ui/ that use the component,
     and the e2e locators under apps/e2e/tests/ whose accessible name or role the change alters. -->

## Screens

<!-- One to three screens where the component renders, the most visible first; none for cleanup.
     Format in ds-migration/WORKFLOW.md, section Screenshots. -->

```json
[
  { "name": "profile-form", "path": "/app/profile", "clip": "form" },
  { "name": "edit-dialog", "path": "/app/profile", "steps": [{ "click": "role=button[name=\"Edit\"]" }], "clip": "role=dialog" }
]
```

## Out of scope

## Accessibility and i18n

<!-- Accessible names to keep or add (IconButton needs aria-label). New keys go into messages/{en,fr,ja}.json. -->

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test <changed folders>`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `yarn workspace @xtm-hub/test_e2e lint` and `format:check`, when e2e locators change (never the e2e suite)
- `node ds-migration/validate.mjs ds-migration/specs/<key>.md`

## Decisions

<!-- Choices made while writing this spec, with the evidence. -->

## To validate

<!-- One bullet per choice a designer should see: what was chosen, and the alternative. The script copies
     these bullets into the pull request report. Keep the heading even when empty. -->

## Deferred findings

<!-- One bullet per real review finding left out of this item's scope. Also copied into the report. -->
