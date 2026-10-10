---
key: 3691-label
issue: 3691
epic: epic-3-candidates
kind: candidate # ds | candidate | adoption | cleanup
legacy_symbols: [Label]
target_module: "@/components/ui/label"
target_symbols: [Label]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Label.tsx]
---

# Label → `@/components/ui/label`, rebuilt on `Text`

## Intent

The design system ships no standalone `Label`: its field label lives inside `Input`, `Textarea`, `Select` and the other
fields. The legacy Radix-based `Label` (7 direct call sites, plus the legacy `FormLabel`) is rebuilt as a candidate in
`src/components/ui/label/`, on the design system `Text` primitive and the `input` text tokens, so a standalone label
looks like the label the design system fields draw. Every label keeps its text, its element (`label`), its `htmlFor`
and its layout classes.

## The component

`src/components/ui/label/`, the package layout:

- `Label.tsx`: `Label`, which renders `<Text as="label" variant="content-compact-medium">` with
  `text-input-label`, or `text-input-error` when `error` is set. Props: the native `label` attributes, `children`
  (required), `className` (merged last) and `error?: boolean` (default `false`). It forwards its ref to the `label`
  element (`FormLabel` passes one) and sets `displayName = 'Label'`.
- `Label.meta.ts`: `LabelMeta`, typed `ComponentMeta` from `@filigran/design-system/meta` (type import only): name,
  description, `status: 'beta'`, `category: 'inputs'`, `version: '0.1.0'`, `radixPrimitive: 'none'`, variants
  `default` and `error`, no size, two examples, `props`, and `accessibility` with `wcagStatus: 'pending'` and the
  contrast pairs `--text-input-label` and `--text-input-error` on `--bg-elevation-default` at 4.5.
- `Label.test.tsx`: renders a `label` element with its text; `htmlFor` names the control (`getByLabelText`); the
  `error` class swap; `className` merges; the compact medium style survives next to the colour class; the ref reaches
  the `label` element.
- `index.ts`: exports `Label` and the `LabelProps` type, never the meta (the runtime entry point stays meta-free).

## Props mapping

Every call site imports `Label` from `@/components/ui/label` and drops it from its `@filigran/ui` import line (the
whole line when `Label` was its only name).

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<Label>{text}</Label>`, no `htmlFor`, no class | `<Label>{text}</Label>` | 6 (`Parameters`, `UserAdminForm` ×2, `AdminUserUpdateForm` ×2, `IntegrationsCsvExportDialog`) |
| `<Label className="block pb-s">{label}</Label>` | same, the layout classes kept | 1 (`ShareableResourceDetailItem`) |
| `FormLabel`: `<Label ref htmlFor={formItemId} className={cn(error && 'text-destructive', className)} {...props} />` | `<Label ref htmlFor={formItemId} error={Boolean(error)} {...props} />`; its props are `Omit<LabelProps, 'error'>` (the form state owns the error) and its ref is `HTMLLabelElement`, and the `@radix-ui/react-label` import leaves `Form.tsx` | 1 (`filigran-ui/components/clients/Form.tsx`) |

## Files in scope

- `apps/frontend/src/components/ui/label/Label.tsx`, `Label.meta.ts`, `Label.test.tsx`, `index.ts` (new)
- `apps/frontend/src/components/admin/parameters/Parameters.tsx`
- `apps/frontend/src/components/admin/user/forms/admin/UserAdminForm.tsx`
- `apps/frontend/src/components/admin/user/forms/admin/AdminUserUpdateForm.tsx`
- `apps/frontend/src/components/service/components/header/IntegrationsCsvExportDialog.tsx`
- `apps/frontend/src/components/service/document/ui/ShareableResourceDetailItem.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/Form.tsx` (`FormLabel` only)
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop `export * from './Label'`)
- `apps/frontend/src/components/filigran-ui/components/clients/Label.tsx` (delete)

No existing test or e2e locator finds these labels by class or role; the ones that read their text
(`getByText`, `getByLabelText` through `FormLabel`'s `htmlFor`) keep passing, since text and association are unchanged.

## Screens

```json
[
  {
    "name": "resource-details",
    "path": "/en/cybersecurity-solutions/opencti-integrations",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "li > a.flex-1[href]" },
      { "waitFor": "label:text-is(\"Shares\")" }
    ],
    "clip": "section:has(label:text-is(\"Shares\"))"
  },
  {
    "name": "admin-user-add-organization",
    "path": "/app/admin/user",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "role=button[name=\"Add user\"]" },
      { "click": "role=dialog >> role=combobox" },
      { "click": "role=option" },
      { "waitFor": "role=dialog >> role=button[name=\"Remove\"]" },
      { "hover": "role=dialog >> div.grid:has(button[aria-label=\"Remove\"])" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "epic-form",
    "path": "/app",
    "steps": [
      { "click": "role=link[name=\"XTM Platform Roadmap\"]" },
      { "click": "role=button[name=\"Create\"]" },
      { "waitFor": "role=dialog >> role=checkbox" }
    ],
    "clip": "role=dialog"
  }
]
```

## Out of scope

- The rest of `Form.tsx` (`FormItem`, `FormControl`, `FormDescription`, `FormMessage`): item 3706.
- `AutoFormLabel` (`auto-form/common/Label.tsx`) and its `text-destructive` star: item 3707.
- The hand-rolled `*` next to `FormLabel` in `EpicForm` and `DescriptionField`, and the classes callers pass to
  `FormLabel`.
- `@radix-ui/react-label` in `apps/frontend/package.json`: a shared file, removed with the copy (3708).

## Accessibility and i18n

- The element stays a native `label`; `htmlFor` keeps naming the `FormControl` target, so every accessible name is
  unchanged. The `error` state is colour only: the field's own message and `aria-invalid` carry it, as before.
- No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui/label src/components/admin src/components/service/document src/components/service/components/header src/components/epic src/components/filigran-ui src/components/service/form src/components/service/[slug] src/components/service/openaev-scenarios`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3691-label.md`

## Decisions

- **`Text as="label" variant="content-compact-medium"` with `text-input-label`**: `content-compact-medium` is IBM Plex
  Sans, `--text-2` (12px), medium, the recipe of the label the design system `Input` draws
  (`font-sans-plex font-medium text-2 text-input-label`, `text-input-error` in error), plus the Named Style's own
  line height and tracking where the `Input` label inherits them. A standalone label then matches the integrated ones,
  with a Named Style instead of loose size classes.
- **The colour goes through `Text`'s `className`**: `Text` merges with the design system's tailwind-merge config, which
  knows `text-input-*` as colours and `text-2` or `text-content-*` as sizes. The app's `cn` (plain tailwind-merge)
  reads `text-2` as a colour and would drop it against `text-input-label`: never add a size class through it.
- **A native `label`, no Radix**: `@radix-ui/react-label` only prevents text selection on a double click; the
  candidate stays on design system primitives so it can go upstream as is.
- **`error` only**: `FormLabel` is the only caller with a state. No `disabled` or `required` prop until a caller needs
  one; the legacy `peer-disabled` styles go, no call site puts a peer control before its label.

## To validate

- Every label goes from the legacy 14px, inherited primary colour, `leading-none`, to the design system field label:
  12px, `text-input-label` (secondary). That includes the labels that name no field: the Parameters "Version" key,
  the resource details titles, the organization names of the user sheet rows and the CSV export "Filters" heading.
  Alternative: move those to `Text` with a primary content style, a semantic change for a later epic (Deferred
  findings).
- `FormLabel` in error goes from `text-destructive` to `text-input-error`, the colour the design system fields use for
  their own label. Alternative: none without restyling.
- The hand-rolled `*` of `EpicForm` and `DescriptionField` keeps its `text-sm` (14px) inside a label that is now
  12px, so the star is a little larger than the text it marks. Alternative: the `required` prop of the Deferred
  findings, which draws the design system's own star.

## Deferred findings

- Five of the seven direct usages label no control (no `htmlFor`, no nested field): `Parameters`' key, the
  "Organizations" text beside `AutocompleteOrganization` (the combobox names itself), the organization name of each
  capability row, the CSV export "Filters" heading and the `ShareableResourceDetailItem` titles. A description list
  (`dl`/`dt`/`dd`) or a heading would carry their meaning; the capability rows' `CapabilityMultiSelect` has no name
  tied to its organization.
- The required marker is hand-rolled three ways next to `FormLabel` (`EpicForm`, `DescriptionField`, `AutoFormLabel`,
  all `text-destructive`), while the design system fields draw an `aria-hidden` `*` in `text-input-required`. A
  `required` prop on `Label` would unify them, for 3706 or 3707.
- No test renders `FormLabel` inside a form with an invalid field, before or after this change: the error colour it
  derives from `useFormField()` is uncovered. A `Form` test belongs with the rest of `Form.tsx` (3706).
- `@radix-ui/react-label` has no import left in `apps/frontend` after this change; it stays declared in
  `package.json` until 3708.
