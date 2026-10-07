---
key: 3541-checkbox
issue: 3541
epic: epic-1-primitives
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [Checkbox]
target_module: "@filigran/design-system"
target_symbols: [Checkbox]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Checkbox.tsx]
---

# Checkbox → `@filigran/design-system`

## Intent

Every checkbox moves to the design system `Checkbox`, which owns its integrated label (and description) when the text
sits next to the box. Checked values, toggling, the indeterminate state, disabled states, the `id`s the e2e page
models use and the accessible names stay the same for users.

## Props mapping

`checked` (`boolean | 'indeterminate'`), `onCheckedChange`, `disabled` and `id` keep their signature (both are Radix
`Checkbox.Root`; the design system applies `id` to the box). Same rule as the Switch and Radio specs: text right next
to the box becomes `label` (contract: label absorbed, no separate label element); text laid out apart, or a row that
also carries other content, keeps its layout and names the box with `aria-label`. Every legacy `className` on the box
goes (`flex bg-background`, `mt-xs`, `mt-1`, `shrink-0`, `text-text-default-primary`): the box has no background at
rest and is already `shrink-0`.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `FormItem` (`flex-row`) + `FormControl` + `<Checkbox checked={integrationField.value ?? false} onCheckedChange />` + `FormLabel` | `<Checkbox label={t('Epic.Form.Integration')} checked={integrationField.value ?? false} onCheckedChange={integrationField.onChange} />` directly in the `FormField` render; `FormItem`, `FormControl` and `FormLabel` go | 1 (`EpicForm` `is_integration`) |
| Same, with `FormLabel` = `Epic.Form.PublishNow` + muted `<span>` `Epic.Form.PublishNowHint` | `<Checkbox label={t('Epic.Form.PublishNow')} description={t('Epic.Form.PublishNowHint')} checked={field.value ?? false} onCheckedChange={field.onChange} />` directly in the render | 1 (`EpicForm` `active`) |
| `<label className="flex … cursor-pointer">` row + `<Checkbox className="shrink-0" checked onCheckedChange />` + truncated label `<span>` + facet count badge | Row `<label>`, its `<span>`s and badge unchanged; `<Checkbox aria-label={option.label} checked onCheckedChange />` (parent keeps `checked={indeterminate ? 'indeterminate' : checked}`) | 2 (`LogicalMultiSelectFormField` parent and child rows) |
| `<label key className="flex items-center gap-s cursor-pointer">` + `<Checkbox checked onCheckedChange />` + `<span className="text-sm">{capability.name}</span>` | `<Checkbox key={capability.id} label={capability.name} checked onCheckedChange />`; the `<label>` and `<span>` go | 2 (`SubscriptionSlugAddCapabilities`, `ServiceSlugAddCapabilities`) |
| `FormItem` (`flex-row`) + `<Checkbox className="mt-xs" checked onCheckedChange id={id} />` + sibling `<label htmlFor className="txt-sub-content">` | `<Checkbox label={t('Service.Form.CapabilityAccessLabel', …)} checked onCheckedChange />` directly in the render; `FormItem`, `id` and the `<label>` go | 1 (`ServiceSlugOrgaForm`) |
| `FormItem` + `FormControl` + `<Checkbox {...field} disabled className="mt-xs" checked onCheckedChange id={capability.id} />` + `Tooltip` whose trigger is the sibling `<label htmlFor aria-disabled>` | `<Checkbox {...field} disabled checked onCheckedChange label={<Tooltip><TooltipTrigger asChild><span>{label text}</span></TooltipTrigger><TooltipContent>…</TooltipContent></Tooltip>} />` inside the existing `TooltipProvider`, directly in the render; `FormItem`, `FormControl`, `id`, `className` and the `<label>` go, the stray `{isCapabilityDisabled(…)}` child (renders nothing) goes | 1 (`UserServiceForm`) |
| `<div className="relative flex items-center gap-s">` + `<Checkbox id checked onCheckedChange />` + sibling `<label htmlFor className="txt-default">` | `<Checkbox key id={`product-${platformIdentifier}`} label={t(…)} checked onCheckedChange />`; the `div` and `<label>` go | 1 (`XtmPlatformTrialForm` products) |
| Same with `<Checkbox id="product-xtmone" checked disabled />` + muted `<label>` | `<Checkbox id="product-xtmone" label={t(…)} checked disabled />` | 1 (`XtmPlatformTrialForm` XTM One) |
| `FormItem` + `div.flex.items-start.gap-l` + `<Checkbox id="acceptTerms" className="mt-1" checked onCheckedChange />` + `<label htmlFor>` (rich text with links, then `<span className="text-destructive">*</span>`) + `FormMessage` | `FormItem` + `FormControl` + `<Checkbox id="acceptTerms" label={<>{t.rich(…)} <span className="text-destructive">*</span></>} error={Boolean(fieldState.error)} checked onCheckedChange />` + `FormMessage`; the `div` and `<label>` go | 1 (`XtmPlatformTrialForm` terms) |
| `<div className="… text-text-default-disabled">` + `<Checkbox id className="text-text-default-primary" checked disabled />` + sibling `<label htmlFor>` | `<Checkbox key id={`status-product-${product}`} label={t(…)} checked disabled />`; the `div` and `<label>` go | 1 (`XtmPlatformTrialStatusPanel`) |
| `DataTable` selection column: `<Checkbox className="flex bg-background" checked aria-label onCheckedChange />` (header: tri-state; cell: plus `onClick={(e) => e.stopPropagation()}`) | Same props without `className`, imported from `@filigran/design-system` | 2 (legacy `DataTable`) |
| `AutoFormCheckbox`: `FormItem` + `div.mb-3.flex.items-center.gap-3` + `FormControl` + `<Checkbox checked onCheckedChange {...fieldProps} />` + `AutoFormLabel`, then tooltip | `FormItem` + `FormControl` + `<Checkbox label={fieldConfigItem?.label \|\| label} wrapperClassName="mb-3" checked onCheckedChange {...fieldProps} />` (spread stays last), then tooltip; the `div` and `AutoFormLabel` go. Renders every integration form's booleans (`active`, `verified`, …) | 1 (legacy) |

## Files in scope

- `apps/frontend/src/components/epic/EpicForm.tsx`
- `apps/frontend/src/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField.tsx`
- `apps/frontend/src/components/subcription/[slug]/SubscriptionSlugAddCapabilities.tsx`
- `apps/frontend/src/components/service/[slug]/ServiceSlugAddCapabilities.tsx`
- `apps/frontend/src/components/service/[slug]/ServiceSlugOrgaForm.tsx`
- `apps/frontend/src/components/service/[slug]/UserServiceForm.tsx`
- `apps/frontend/src/components/service/trial-instances/xtm-platform-trial/request-form/XtmPlatformTrialForm.tsx`
- `apps/frontend/src/components/service/trial-instances/xtm-platform-trial/request-panel/XtmPlatformTrialStatusPanel.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/DataTable.tsx`
- `apps/frontend/src/components/filigran-ui/components/auto-form/fields/Checkbox.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop the `Checkbox` export)
- `apps/frontend/src/components/filigran-ui/components/clients/Checkbox.tsx` (delete)
- Tests of the touched folders, only where a query no longer matches
- `XtmPlatformTrialForm.test.tsx`: one assertion that a submit without the terms marks `#acceptTerms` `aria-invalid`

## Screens

```json
[
  {
    "name": "epic-form",
    "path": "/app",
    "steps": [
      { "click": "role=link[name=\"XTM Platform Roadmap\"]" },
      { "click": "role=button[name=\"Create\"]" },
      { "waitFor": "role=dialog >> role=checkbox" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "admin-service-table",
    "path": "/app/admin/service",
    "steps": [
      { "click": "role=row[name=/OpenAEV Scenarios Library/] >> role=button[name=/open menu/i]" },
      { "click": "role=menuitem[name=\"Manage\"]" },
      { "waitFor": "role=checkbox[name=\"Select all\"]" }
    ],
    "clip": "role=table"
  },
  {
    "name": "integration-filters",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "role=button[name=\"OpenCTI\"]" },
      { "click": "role=link[name=\"Integrations\"]" },
      { "click": "css=div.sticky.self-start >> role=checkbox" },
      { "waitFor": "css=div.sticky.self-start >> role=checkbox[checked=true]" }
    ],
    "clip": "div.sticky.self-start"
  }
]
```

## Out of scope

- The other fields of these forms and the legacy `Form`, `Dialog`, `Sheet`, `Tooltip`, `DataTable` and `AutoForm`
  around the boxes (their own items: 3706, 3564, 3705, 3707).
- `UserServiceForm`'s `{...field}` spread onto the box (`value` is the capability array): kept as is.
- `DataTable`'s hard-coded English `aria-label`s (`Select all`, `Select row`): legacy file, translated with 3705.
- Native `<input type="checkbox">` elsewhere: not the legacy component.
- The `@radix-ui/react-checkbox` dependency, the legacy `theme.css` and the `@filigran/ui` aliases (cleanup 3708).
- `apps/e2e`: its selectors (`#product-*`, `#status-product-*`, `#acceptTerms`, names) keep matching, nothing to change.

## Accessibility and i18n

- Names kept through the design system `<label for>`: `Epic.Form.Integration`, `Epic.Form.PublishNow` (the hint
  moves to `aria-describedby`; e2e `{ name: 'Publish now' }` still matches), capability names (e2e `getByLabel`,
  `{ name: 'DELETE access:' }`), `PlatformIdentifier.*` (`XtmPlatformTrialForm.test.tsx`), AutoForm labels (e2e
  `Is the … published?`).
- `LogicalMultiSelectFormField` names each box with `aria-label={option.label}`: the name no longer includes the facet
  count; `LogicalMultiSelectFormField.test.tsx` and the `Integration*Filter.test.tsx` queries still resolve, and the
  count stays inside the row `<label>` (`IntegrationTypeFilter.test.tsx` `closest('label')`).
- `DataTable` keeps its `aria-label`s; the header keeps `aria-checked="mixed"` through `'indeterminate'`.
- `XtmPlatformTrialStatusPanel` keeps its names (`PlatformIdentifier.*`) through the integrated label.
- No new translation key.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/epic src/components/ui/shareable-resource src/components/service/[slug] src/components/subcription src/components/service/trial-instances src/components/service/integrations src/components/admin/user/pending-user`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3541-checkbox.md`

## Decisions

- **Integrated label where the text is the box's neighbour, `aria-label` otherwise**, as the Switch and Radio specs
  decided. `LogicalMultiSelectFormField` rows also hold a truncated label and a right-aligned facet badge that the
  design system label cannot lay out without restyling, so the row `<label>` stays and the box takes `aria-label`
  (the contract requires `label` or `aria-label`; the design system warns otherwise).
- **Wrappers that only produced the label go** (`FormItem` / `FormControl` / `FormLabel` around `is_integration`,
  `active` and the capability rows): these are optional booleans or arrays with no message to show, as in the Switch
  spec's `VotableFeatureForm`. `acceptTerms` keeps `FormItem` + `FormMessage` (its zod refine shows an error).
- **The `id`s read by e2e stay** (`product-*`, `status-product-*`, `acceptTerms`; `XtmPlatformTrialForm.test.tsx`
  also queries `#acceptTerms`): the design system puts `id` on the box and its `<label for>`. The capability `id`s
  are read by nothing and go.
- **`error` on `acceptTerms`**: the installed `CheckboxProps` ships `error?: boolean` (`dist/index.d.ts`, "added to
  the component set after the first implementation") although the usage contract still says there is none; the
  shipped types win, as the Radio spec ruled for `orientation`. It is the only validated checkbox. `error` only
  recolours, so the box sits in `FormControl` for `aria-invalid` and the `aria-describedby` link to `FormMessage`; the
  Slot lets the box's own `id="acceptTerms"` win over the generated one.
- **No `required` on `acceptTerms`**: inside a `<form>`, Radix adds a hidden native `required` input, so the
  browser would block the submit before zod shows `FormMessage`. The visible `*` stays in the label content, in the
  design system's `text-input-required` colour (the marker of its `Input` and `Textarea`), not the legacy
  `text-destructive`.
- **`DataTable` cell keeps `onClick={(e) => e.stopPropagation()}`**: the contract's "never stop propagation" targets
  presentational boxes inside a clickable row; this box is interactive and the row's `onClickRow` opens the item, so
  removing it would both toggle and open.
- **`UserServiceForm`'s tooltip moves inside the label**: it was triggered by the label text, and the design system
  owns that `<label>` now; a `<span>` trigger keeps hover on the text, clicking still toggles through the native label.
- **`AutoFormCheckbox` takes the integrated label**, as the Radio spec did for `AutoFormRadioGroup` (a live AutoForm
  field): `FormControl` still links `id`, `aria-describedby` and `aria-invalid` onto the box. `isRequired` is no
  longer rendered: no AutoForm boolean is required today (every one is `.optional()`).
  `wrapperClassName="mb-3"` keeps the legacy field spacing (layout, not look).

## To validate

- Every box shrinks from 18px with the legacy border to the design system's 16px, transparent at rest, with its own
  checked glyph, hover halo and disabled colours (no 50% opacity); `DataTable` loses its `bg-background` fill.
- Labels take the design system typography and colour (`content-base`, `text-input-placeholder`) instead of
  `text-sm`, `txt-default`, `txt-sub-content`, `FormLabel` or `text-muted-foreground`, and the box-to-text gap
  becomes the design system's 8px everywhere (it was 12px in `EpicForm` and AutoForm, 16px for the trial terms).
- `EpicForm` "Publish now": the hint moves from inline after the label to a `description` line under it.
  Alternative: keep it inline inside `label`.
- Trial terms: the box is centred on the multi-line text instead of top-aligned, the label and box turn to the error
  tone on a failed submit, and the `*` takes the design system `text-input-required` colour. Alternative: no `error`,
  as before.
- `XtmPlatformTrialForm` XTM One and `XtmPlatformTrialStatusPanel`: the disabled labels use the design system
  disabled colour instead of `text-muted-foreground` / `text-text-default-disabled`.
- `LogicalMultiSelectFormField` keeps its own row typography (`content-body-compact text-[13px]`) next to the design
  system box. Alternative: the integrated label, losing truncation and the right-aligned count.

## Deferred findings

- Upstream: the Checkbox usage contract (`skills/consumer/usage-contracts/Checkbox.md`) says "No error/invalid
  state … there will not be one" while `CheckboxProps` ships `error`; the contract needs updating.
- No unit test covers `EpicForm`'s checkboxes, the capability dialogs, `ServiceSlugOrgaForm`, `UserServiceForm`
  or `AutoFormCheckbox`; they rely on e2e (`xtm-platform-roadmap`, `service`, `integration`, `xtm-platform-trial`
  page models). `XtmPlatformTrialStatusPanel.test.tsx` only checks the product texts, not the boxes' names and
  states. Nothing asserts `DataTable`'s tri-state header, its row `stopPropagation`, or the
  `LogicalMultiSelectFormField` parent's `'indeterminate'` state.
- AutoForm: `zodToHtmlInputProps` puts `required: true` in `fieldProps` for a boolean that is not `.optional()` /
  `.nullable()` (`.default(false)` included), and the spread forwards it to Radix's hidden native input, which would
  block submit with no visible `*`. Same as the legacy box; latent while every AutoForm boolean is `.optional()`.
- `UserServiceForm`: the disabled-capability tooltip opens on hover of the label text only, with no
  `aria-describedby` on the box, so keyboard and screen reader users never get the reason. Unchanged from the legacy.
