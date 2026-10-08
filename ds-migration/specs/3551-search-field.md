---
key: 3551-search-field
issue: 3551
epic: epic-2-composites
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [SearchInput]
target_module: "@filigran/design-system"
target_symbols: [SearchField]
legacy_files_to_delete: [apps/frontend/src/components/ui/SearchInput.tsx]
---

# SearchField → `@filigran/design-system`

## Intent

The app's search box is the wrapper `src/components/ui/SearchInput.tsx` (the design system `Input` plus a search icon,
since item 3556); `filigran-ui` holds no search component. Every caller moves to the design system `SearchField` and the
wrapper is deleted. Each list keeps its placeholder, accessible name, debounced filtering and width; the field gains the
design system's built-in clear cross and `Escape` to clear, which must reset the list's search like an emptied field.

## Props mapping

Shared by every row:

- `<SearchInput placeholder onChange />` → `<SearchField aria-label={placeholder} placeholder onChange />`, default
  `size` (`md`, 36px like the design system `Input` today). The wrapper's default `aria-label` moves to each call site.
- Every site is uncontrolled. The clear cross and `Escape` empty the input without firing `onChange` (contract
  RULE-08), so each site passes `onClear`: cancel its pending debounced call (`.cancel()`, usehooks-ts) and apply the
  empty search at once, the same effect its `onChange` has on an emptied field. `Escape` fires `onClear` on an
  already empty field too, so a site that holds the applied term (`UserList`, `PendingUserList`: `filter.search`;
  `OrganizationSubscribedServices`: `searchTerm`) still cancels but applies the empty search only when that term is
  not already empty, otherwise `Escape` on an empty box would send the list back to page 1.
- `className` stays where given (`tailwind-merge` lets it beat the variant's `w-55`); a site that passed none filled its
  container (the design system `Input` wrapper is `w-full`) and takes `fullWidth`. No `onSubmit`: filtering stays on
  `onChange`, as the contract's openaev mapping does.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `className="w-full sm:w-1/3"`, `onChange={debounceHandleInput}` → `handleInputChange(value)` | same `className`; `onClear` → `handleInputChange('')` | 3 (`PendingUserList`, `OrganizationList`, `AdminServiceTab`) |
| `className="w-full sm:w-auto"`, `handleInputChange(value)` | `className="w-full sm:w-55"` (the design system default width from `sm`: with `sm:w-auto` the `inline-flex` field grows by the clear cross on the first keystroke and pushes the organization filter); `onClear` → `handleInputChange('')` | 1 (`UserList`) |
| `className="w-full sm:w-1/3"`, `onChange` → `setSearchTerm(value \|\| null)` | `onClear` → `setSearchTerm(null)` | 1 (`TrialsTab`) |
| `className="w-full sm:w-1/3"`, `onChange={onSearchChange}` (debounced: sets the term, resets `pageIndex`) | the debounced body moves to a local `applySearch(value: string)`, called by the debounced handler with `event.target.value`; `onClear` → `applySearch('')` | 1 (`OrganizationSubscribedServices`) |
| `id="SearchTerm"`, no `className`, in a `flex-1 max-w-sm` box, `onChange` → `setSearchTerm(value)` | `id` kept, `fullWidth`; `onClear` → `setSearchTerm('')` | 1 (`ServiceSlug`) |
| `className="max-sm:w-full sm:w-[20rem]"`, `defaultValue={search}`, `onChange={debounceHandleInput(onSearchChange)}` inline | same `className` and `defaultValue`; the debounced handler is hoisted to a `const` in the body (still called on every render); `onClear` → `onSearchChange('')` | 1 (`ServiceListHeader`) |
| No `className`, in a grid cell, `onChange={debounceHandleInput}` (prop from `EpicList`) | `fullWidth`; `EpicFilter` gains an optional `onSearchClear?: () => void` prop passed to `onClear`; `EpicList` passes one that cancels its debounced handler and calls `handleInputChange('')` | 1 (`EpicFilter`) |

## Files in scope

- `apps/frontend/src/components/ui/SearchInput.tsx` (delete)
- `apps/frontend/src/components/admin/user/UserList.tsx`, `admin/user/pending-user/PendingUserList.tsx`
- `apps/frontend/src/components/organization/OrganizationList.tsx`,
  `organization/[slug]/subscribed-services/OrganizationSubscribedServices.tsx`
- `apps/frontend/src/components/trials/tab/TrialsTab.tsx`
- `apps/frontend/src/components/service/AdminServiceTab.tsx`, `service/[slug]/ServiceSlug.tsx`,
  `service/components/header/ServiceListHeader.tsx`
- `apps/frontend/src/components/epic/EpicFilter.tsx`, `epic/EpicList.tsx`
- `apps/frontend/src/components/admin/user/pending-user/PendingUserList.test.tsx`: drop the `vi.mock` of the deleted
  wrapper; the real `SearchField` renders. The `useDebounceCallback` mock gains `cancel`; one test that `Escape` in
  an empty field does not refetch
- `apps/frontend/src/components/service/components/header/ServiceListHeader.test.tsx`,
  `epic/EpicList.test.tsx`: one test each, typing then clicking `Clear search` calls the search callback with `''` and
  cancels the pending debounced call (the mocked `cancel` is asserted)
- `apps/frontend/src/components/organization/[slug]/subscribed-services/OrganizationSubscribedServices.test.tsx`: the
  `useDebounceCallback` mock gains `cancel`; one test that clearing a typed search sends an empty term, one that
  `Escape` on an empty field leaves the query variables unchanged. New tests follow `testing-validation`: Given/When/
  Then, `should … when …` titles, repeated fixture values as named constants
- No e2e locator changes: e2e finds no `SearchInput` (the `Search...` placeholders of `service.pageModel.ts` and
  `service-management.spec.ts` belong to `SelectUsers`).

## Screens

```json
[
  {
    "name": "admin-user-search",
    "path": "/app/admin/user",
    "steps": [{ "waitFor": "input[placeholder=\"Search user...\"]" }],
    "clip": "div.flex-col-reverse:has(input[placeholder=\"Search user...\"])"
  },
  {
    "name": "integrations-search",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"OpenCTI\"]" },
      { "click": "role=link[name=\"Integrations\"]" },
      { "waitFor": "input[placeholder=\"Search...\"]" }
    ],
    "clip": "div.flex-wrap:has(input[placeholder=\"Search...\"])"
  },
  {
    "name": "roadmap-search",
    "path": "/app",
    "steps": [
      { "click": "role=link[name=\"XTM Platform Roadmap\"]" },
      { "waitFor": "input[placeholder=\"Search...\"]" }
    ],
    "clip": "div.grid:has(input[placeholder=\"Search...\"])"
  }
]
```

## Out of scope

- `SelectUsers`' and `MultiSelect`'s search boxes (legacy `CommandInput` / own input inside a popover), the
  `Combobox` fields next to some search boxes, and the toolbars' layout.
- Debounce: stays in each caller (contract: a consumer concern).
- The `md` size everywhere; no `sm` is introduced.

## Accessibility and i18n

- Each field keeps its accessible name, its placeholder, through `aria-label`; `SearchField` also gives its
  `role="search"` landmark that name. The input's role becomes `searchbox` (`type="search"`): no unit or e2e query
  uses `textbox` on these fields, and tests find them by placeholder.
- The clear cross is a `<button>` named by `clearLabel`, kept at the design system default `Clear search`, as the
  `Combobox` spec kept `Clear`. No new translation key.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/admin/user src/components/organization src/components/trials src/components/service src/components/epic`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3551-search-field.md`

## Decisions

- **The wrapper goes**: without the icon, which `SearchField` draws, it would only default `aria-label` to the
  placeholder, which each call site states in one prop.
- **`onClear` on every site**: without it the cross empties the field while the list stays filtered on the old term.
  Cancelling the pending debounced call avoids a second, late request with the same empty term.
- **`fullWidth` where no `className` was given**: the design system default 220px would shrink the roadmap and service
  management fields that filled their box.
- **`legacy_symbols: [SearchInput]`** is informational: the symbol never came from `@filigran/ui`; the deleted file is
  what `validate.mjs` checks.
- **`useDebouncedSearch` owns the search wiring** (epic review): `src/hooks/use-debounced-search.ts` returns the
  `onChange` and `onClear` every `SearchField` passes. Its debounce is stable across renders, so a clear always
  cancels the pending call, and a clear applies `''` only when a term is applied (by the page or by the hook itself),
  so Escape in an empty box sends nothing. The nine sites use it; `utils/debounce.ts`, a second copy, goes.

## To validate

- Every search box takes the `SearchField` look (focus colour on the icon, outlined disabled state) and gains a clear
  cross while it holds text, plus `Escape` to clear. Alternative: none, the cross is built in.
- The admin user search takes the design system default 220px from `sm` instead of its content width (about 190px), so
  the clear cross no longer shifts the organization filter. Alternative: another fixed width.
- The clear cross keeps the English default name `Clear search` in every locale, like the `Combobox` controls.
  Alternative: `clearLabel` with a new key in en, fr and ja, to do in one pass with the `Combobox` names.

## Deferred findings

