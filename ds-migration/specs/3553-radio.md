---
key: 3553-radio
issue: 3553
epic: epic-1-primitives
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [RadioGroup, RadioGroupItem]
target_module: "@filigran/design-system"
target_symbols: [RadioGroup, Radio]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/RadioGroup.tsx]
---

# RadioGroup → `@filigran/design-system`

## Intent

Every single-choice group moves to the design system `RadioGroup` + `Radio`, whose items own their integrated label.
Values, `onValueChange`, the controlled or uncontrolled mode and the disabled state stay the same for users; each
group gains the accessible name it lacked (a `<label for>` on a `div` names nothing).

## Props mapping

`value`, `defaultValue`, `onValueChange` and `disabled` keep their signature (both are Radix `RadioGroup.Root`). The
legacy per-option composition (`FormItem` + `FormControl` + `RadioGroupItem` + `FormLabel`) becomes one
`<Radio value label />` (contract: label absorbed). Every group lays out in a row today, so it takes
`orientation="horizontal"`; the legacy gap classes go. The group keeps its surrounding `FormItem`, visible title,
`FormControl` and `FormMessage` (contract RULE-04: errors belong to the field), and gets an `aria-label` repeating its
title (RULE-08).

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<FormControl><RadioGroup value onValueChange className="flex flex-wrap items-center gap-x-6 gap-y-2">` + per option `FormItem` / `FormControl` / `<RadioGroupItem value />` / `FormLabel` | `<FormControl><RadioGroup orientation="horizontal" className="flex-wrap" aria-label={t('Epic.Form.EditionType')} value onValueChange>` + `<Radio key value label={EditionTypeMapping[value].label} />`; `EpicFieldLabel` (title and info tooltip), the `Separator` and the integration `Checkbox` stay | 1 (`EpicForm`) |
| `<FormItem><FormControl><RadioGroup value onValueChange className="flex flex-row">` + per option `FormItem` / `FormControl` / `<RadioGroupItem value />` / `FormLabel`, then `FormMessage` | `<FormItem><FormControl><RadioGroup orientation="horizontal" aria-label={t('Service.Trials.XtmPlatform.Feedback.Question')} value onValueChange>` + `<Radio key value label={t(labelKey)} />`, then `FormMessage` | 1 (`PrivateXtmPlatformTrialBanner`) |
| `AutoFormRadioGroup`: `AutoFormLabel` + `<FormControl><RadioGroup onValueChange defaultValue className="flex flex-wrap items-center gap-x-6 gap-y-2" {...fieldProps}>` + per option `FormItem` / `FormControl` / `<RadioGroupItem value />` / `FormLabel {value}`, `FormMessage`, tooltip | Same composition; `<RadioGroup orientation="horizontal" className="flex-wrap" aria-label={fieldConfigItem?.label \|\| label} onValueChange defaultValue {...(fieldProps as ComponentProps<typeof RadioGroup>)}>` (spread stays last) + `<Radio key value label={value} disabled={Boolean(fieldProps.disabled)} />`. Used by the six integration forms' `license_type` (`fieldType: 'radio'`) | 1 (legacy) |

## Files in scope

- `apps/frontend/src/components/epic/EpicForm.tsx`
- `apps/frontend/src/components/service/trial-instances/banner/xtm-platform-trial/PrivateXtmPlatformTrialBanner.tsx`
- `apps/frontend/src/components/filigran-ui/components/auto-form/fields/RadioGroup.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop the `RadioGroup` export)
- `apps/frontend/src/components/filigran-ui/components/clients/RadioGroup.tsx` (delete)
- Tests of the touched folders, only where a query no longer matches

## Screens

```json
[
  {
    "name": "epic-form-edition-type",
    "path": "/app",
    "steps": [
      { "click": "role=link[name=\"XTM Platform Roadmap\"]" },
      { "click": "role=button[name=\"Create\"]" },
      { "waitFor": "role=dialog >> role=radiogroup" }
    ],
    "clip": "role=dialog >> css=form > div:has([role=radiogroup])"
  },
  {
    "name": "integration-license-type",
    "path": "/app",
    "steps": [
      { "click": "a[href*=\"/service/opencti_integrations/\"]" },
      { "click": "role=button[name=\"Update\"]" },
      { "waitFor": "role=dialog >> role=radiogroup" }
    ],
    "clip": "role=dialog >> css=div:has(> [role=radiogroup])"
  }
]
```

## Out of scope

- `DropdownMenuRadioGroup` / `DropdownMenuRadioItem` (`DataTable`, `PaginationManageDropdown`): menu items, the Menu
  item's scope.
- `OrganizationForm`'s native `<input type="radio">`: not the legacy component (adoption, if any, is its own item).
- The legacy `Form`, `Checkbox`, `Separator`, `Dialog` and `AutoForm` around the groups (their own items).
- The untranslated `Free` / `Commercial` option labels of `AutoFormRadioGroup`: kept as the enum value.
- The `@radix-ui/react-radio-group` dependency, the legacy `theme.css` and the `@filigran/ui` aliases (cleanup 3708).

## Accessibility and i18n

- Each group gains an accessible name through `aria-label`, reusing an existing key: `Epic.Form.EditionType`,
  `Service.Trials.XtmPlatform.Feedback.Question`, and the AutoForm field label (`Service.Form.LicenseTypeLabel`).
- Each option keeps its name through the integrated `<label for>`; `PrivateXtmPlatformTrialBanner.test.tsx`'s
  `getByRole('radio', { name: 'Service.Trials.XtmPlatform.Feedback.Yes' | '…No' })` still resolves.
- Keyboard: Radix roving tabindex, unchanged; the design system keeps all four arrows in a horizontal group.
- No new translation key.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/epic src/components/service/trial-instances src/components/service/integrations src/components/service/form`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3553-radio.md`

## Decisions

- **Group title stays outside, `aria-label` names the group.** The contract (RULE-08) has no title slot and asks for
  `aria-label` or `aria-labelledby`; the legacy `FormLabel` has no `id` to reference, so `aria-label` repeats its
  text. This matches the Switch spec's rule: a label laid out apart from the control means `aria-label`.
- **Options take the integrated `label`**, as the Textarea and Switch specs do for text next to the control: the
  legacy per-option `FormItem` / `FormControl` / `FormLabel` only produced that `<label for>`.
- **`FormControl` stays around the group**: its `id`, `aria-describedby` and `aria-invalid` land on the Radix root,
  which the design system `RadioGroup` spreads, so `FormMessage` keeps its link (the trial answer is required).
- **`orientation="horizontal"`**: every legacy group is a row; the installed version ships it (`dist/index.d.ts`)
  although the usage contract still lists it as deferred, and the shipped types win. `flex-wrap` stays where the
  legacy group wrapped (`EpicForm`, `AutoFormRadioGroup`): it is layout, so the row breaks instead of overflowing a
  narrow sheet, not a look.
- **`AutoFormRadioGroup` passes `disabled` to each `Radio`**: the group's `disabled` (from `inputProps`) already
  disables the circles through Radix, but the design system label switches to its disabled colour and cursor only
  from the item's own prop.
- The `integration-license-type` screen opens the first integration linked from `/app` and its `Update` sheet: every
  integration form renders `license_type` through `AutoFormRadioGroup`, so whichever document comes first works.
- No screen for the trial feedback dialog: it needs a trial deployment ending within 15 days, which the
  development seed has not; `PrivateXtmPlatformTrialBanner.test.tsx` covers it.

## To validate

- Option labels take the design system typography and colour (`content-base`, `text-input-placeholder`) and the
  option gap becomes 16px instead of 24px (`EpicForm`, `AutoFormRadioGroup`) or none (trial dialog). Alternative:
  none without restyling the component.
- `EpicForm`: the edition type group keeps the legacy `FormLabel` title with its info tooltip above it, while the
  options use the design system label. Alternative: name the group with `aria-labelledby` on an `id` added to the
  title, once the legacy `Form` is migrated (item 3706).
- The circle shrinks from 20px with a 2px border to the design system's 16px with a 1px border and no rest fill
  (RULE-05).

## Deferred findings

- **Per-option error state is gone.** The legacy per-option `FormControl` / `FormLabel` set `aria-invalid` on each
  radio and turned its label `text-destructive`; now only the group root gets `aria-invalid` and `FormMessage` is the
  sole visual error cue (the trial dialog has no group title). The design system `Radio` has no error or invalid prop
  (`dist/index.d.ts`, `RadioProps`): a design system request, not a restyle here.
- **No render test for two of the three groups.** Neither `EpicForm` nor `AutoFormRadioGroup` has a test rendering its
  radios, so the group `aria-label`s and the per-option `disabled` (the integration forms' locked `license_type`) are
  covered by e2e only (`xtm-platform-roadmap.pageModel.ts`, `integration.pageModel.ts`). This spec limits tests to
  queries that stop matching; worth adding with the AutoForm item.
- **`AutoFormRadioGroup` spreads every `fieldProps` key last onto the Radix root.** A future `inputProps.className`
  would drop `flex-wrap`, and input-only keys (`showLabel`, `type`) land on the root `div`; the legacy group had the
  same order, so it is latent and belongs to the AutoForm item.
