---
key: 3547-color-picker
issue: 3547
epic: epic-2-composites
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [ColorPicker]
target_module: "@filigran/design-system"
target_symbols: [ColorPicker]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/ColorPicker.tsx]
---

# ColorPicker → `@filigran/design-system`

## Intent

The use case form's colour field moves from the legacy `ColorPicker` (design system `Input` + round swatch button +
`react-colorful` popover) to the design system `ColorPicker`. The form still stores a `#RRGGBB` hex string, validated
by the same zod rule, and the user still types it or picks it in a panel.

## Props mapping

Same rule as the Input and Textarea specs: the react-hook-form `FormField` stays; the `FormItem` and `FormLabel`
around the field go and their role moves to `label`. No `error` is added (no `FormMessage` rendered here).

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `FormItem` > `FormLabel {t('UseCaseForm.Color')}` + `<ColorPicker value={value ?? ''} onChange={onChange} />` | `<ColorPicker label={t('UseCaseForm.Color')} placeholder={t('UseCaseForm.Color')} maxLength={7} value={value ?? ''} onValueChange={onChange} />`, default `formats`, `eyeDropper`, `showSwatches` off, no `alpha` | 1 (`UseCaseForm`, rendered by `AddUseCase` and `EditUseCase`) |
| Inside the legacy file: `aria-label={t('UseCaseForm.Color')}` on the input and on the swatch button, `maxLength={7}`, `'#FFFFFF'` shown when the value is empty | `label` names the input; the panel trigger keeps the design system name; `maxLength={7}` passes through to the trigger input; an empty value shows the placeholder | (legacy) |

## Files in scope

- `apps/frontend/src/components/admin/use-case/UseCaseForm.tsx`: `ColorPicker` leaves the `@filigran/ui` import for
  the `@filigran/design-system` one; `FormItem` and `FormLabel` stay imported for the product field.
- `apps/frontend/src/components/admin/use-case/UseCaseForm.test.tsx`:
  - the colour field is found with `getByRole('textbox', { name: 'UseCaseForm.Color' })`: the design system shows the
    hex lowercase (`#ffffff`), so `getByDisplayValue('#FFFFFF')` no longer matches;
  - `123456` leaves the rejected dataset: the design system resolves a hex typed without `#` and hands the form
    `#123456`. A new case asserts that typing `123456` submits `color: '#123456'`.
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop the `ColorPicker` export)
- `apps/frontend/src/components/filigran-ui/components/clients/ColorPicker.tsx` (delete)
- No e2e locator: nothing under `apps/e2e/tests/` reaches the use case form's colour field.

## Screens

```json
[
  {
    "name": "use-case-add-sheet",
    "path": "/app/admin/use-case",
    "steps": [{ "click": "role=button[name=\"Add use case\"]" }, { "waitFor": "role=dialog" }],
    "clip": "role=dialog"
  },
  {
    "name": "use-case-color-panel-open",
    "path": "/app/admin/use-case",
    "steps": [
      { "click": "role=button[name=\"Add use case\"]" },
      { "waitFor": "role=dialog" },
      { "click": "role=dialog >> role=button[name=/color/i]" },
      { "waitFor": "role=slider[name=\"Hue\"]" }
    ]
  }
]
```

## Out of scope

- The legacy `Form`, `Sheet`, `SheetWithPreventingDialog`, `Popover` and `MultiSelectFormField` (their own items),
  and the other fields of `UseCaseForm`.
- The `react-colorful` dependency, now unused, stays in `apps/frontend/package.json` until the cleanup item (3708).
- Passing react-hook-form's `ref` and `onBlur` to the field: the legacy call site did not.

## Accessibility and i18n

- The hex input is named `UseCaseForm.Color` by the design system `<label for>`, as it was by its `aria-label`.
- The panel trigger loses `UseCaseForm.Color` for the design system's own "Open color panel", which ends the shared
  name the Input spec deferred to this item. The panel controls ("Hue", "Saturation and brightness", "Color format",
  "Hex color", channel inputs, eyedropper) carry the design system's English names; the panel has `role="dialog"`
  named "Color color picker".
- No new translation key: the placeholder reuses `UseCaseForm.Color`, as the name field reuses `UseCaseForm.Name`.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/admin/use-case src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3547-color-picker.md`

## Decisions

- **Hex stays the stored format**: the design system emits `#RRGGBB` whatever format the panel shows (RULE-03, every
  `commit` goes through `rgbToHex`), so the HEX/RGB/HSL/HSB selector changes no data and keeps its default.
- **`maxLength={7}` kept**: it is the legacy cap, `alpha` is off so no valid value is longer, and the design system
  `ColorPicker` draws no counter (the `N/7` counter the Input spec traced goes with the legacy file).
- **Lenient parsing accepted**: the design system resolves `123456`, `#abc` and `#abcd` to `#123456`, `#aabbcc`
  and `#aabbcc` and hands the form that hex, lowercase. The stored value still matches the zod rule; an unparsable
  draft (`#12`, `blue`, `#12345g`) still reaches the form verbatim and is still rejected.
- **Placeholder from `UseCaseForm.Color`**: the legacy field never looked empty (it showed `#FFFFFF` for an empty
  value), the design system default "Select color" is English only, and the sibling name field already uses its label
  key as placeholder.
- **No `error`**: no `FormMessage` rendered here, as decided for `UseCaseForm` in the Input spec.

## To validate

- The field takes the design system look: a 36px monospace hex input with a square swatch and a palette icon button,
  instead of a round coloured button. The panel is the design system one: area, hue slider, format selector, value
  inputs, and an eyedropper in Chromium, instead of the `react-colorful` square and hue bar.
- Preset swatches stay off (the legacy panel had none). Alternative: `showSwatches` with the Filigran palette.
- The four formats stay offered. Alternative: `formats={['hex']}`, which hides the selector.
- A hex typed without `#`, or in 3 or 4 digits, is now accepted and stored as a full lowercase `#RRGGBB`.
  Alternative: none without wrapping the component.
- An emptied field shows the `Color` placeholder where the legacy showed `#FFFFFF` while holding an empty value.
  Alternative: the design system default "Select color", untranslated.

## Deferred findings

- Design system: the panel trigger, the panel's `aria-label` and every panel control carry hard-coded English names
  with no override prop; to raise upstream with the Combobox `Clear` / `Toggle options` names.
- `UseCaseForm`: the colour field shows no error and loses the red legacy label on an invalid submit, as the name field
  since the Input item. To settle with the Form item (3706).
