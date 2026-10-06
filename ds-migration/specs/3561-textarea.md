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

# Textarea → `@filigran/design-system`

## Intent

Every multi-line field moves to the design system `Textarea`, which owns its label, required marker, helper text
and error message. Values, validation, submission and accessible names stay the same for users.

## Props mapping

The react-hook-form `FormField` (controller) stays. Around the textarea, the legacy `FormItem`, `FormLabel`,
`FormControl`, `FormDescription` and `FormMessage` are dropped: their roles move to `Textarea` props, and `error`
takes the same raw `fieldState.error?.message` that `FormMessage` showed.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `FormLabel` + `<Textarea rows={4} {...field} />` + `FormDescription` (original value) | `<Textarea label={…ValueLabel} rows={4} helperText={original value, when defined} {...field} />` | 1 (`ContentEditDialog`) |
| `FormLabel` + `<Textarea placeholder {...field} />` + `FormMessage` | `<Textarea label placeholder error {...field} />` | 1 (`VotingRoundForm`) |
| `FormLabel` + `<Textarea {...field} value={field.value ?? ''} className="min-h-24 bg-elevation-background-layer-1" />` + `FormMessage` | `<Textarea label {...field} value={field.value ?? ''} error />`, `className` dropped; `error` read with `getFieldState(field.name)` from the form context the component already uses | 1 (`PrivateXtmPlatformTrialBanner`) |
| `FormLabel` with a hand-written `<span>*</span>` and custom classes + `<Textarea placeholder {...field} />` + `FormMessage` | `<Textarea label required placeholder error {...field} />`; the `<form>` gets `noValidate` | 1 (`ReachSalesDialogForm`) |
| no label + `<Textarea rows={4} placeholder {...field} />` + `FormMessage` | `<Textarea aria-label={t('…EELearnMore.InterestedTitle')} rows={4} placeholder error {...field} />` | 1 (`EeLearnMoreSheet`) |
| `EpicFieldLabel` (required) + `<Textarea {...field} value ?? '' rows={TEXTAREA_MIN_ROWS} className="field-sizing-content min-h-24 resize-none" placeholder />` + `CharacterCount` (`FormMessage` + counter) | `<Textarea label={t(labelKey)} required={required} {...field} value ?? '' minRows={TEXTAREA_MIN_ROWS} resize="none" placeholder error />` then the counter alone, right-aligned; `CharacterCount` keeps its `FormMessage` for the Title `Input`; the `<form>` gets `noValidate` | 5 (`EpicTextareaField`) |
| `AutoFormTextarea`: legacy composition around `<Textarea {...fieldProps} />` | Same composition, import switched to `@filigran/design-system`; no app schema uses the `textarea` field type | 1 (legacy) |

## Files in scope

- `apps/frontend/src/components/content-translation/ContentEditDialog.tsx`
- `apps/frontend/src/components/admin/voting-round/VotingRoundForm.tsx`
- `apps/frontend/src/components/service/trial-instances/banner/xtm-platform-trial/PrivateXtmPlatformTrialBanner.tsx`
- `apps/frontend/src/components/service/trial-instances/reach-sales/ReachSalesDialogForm.tsx`
- `apps/frontend/src/components/service/document/one-click-deploy/EeLearnMoreSheet.tsx`
- `apps/frontend/src/components/epic/EpicForm.tsx`
- `apps/frontend/src/components/filigran-ui/components/auto-form/fields/Textarea.tsx`
- `apps/frontend/src/components/filigran-ui/components/servers/index.ts` (drop the `Textarea` export)
- `apps/frontend/src/components/filigran-ui/components/servers/Textarea.tsx` (delete)
- Tests of the touched folders, only where a query no longer matches

## Screens

```json
[
  {
    "name": "epic-form-errors",
    "path": "/app",
    "steps": [
      { "click": "role=link[name=\"XTM Platform Roadmap\"]" },
      { "click": "role=button[name=\"Create\"s]" },
      { "waitFor": "role=dialog" },
      { "click": "role=button[name=\"Create epic\"]" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "voting-round-form",
    "path": "/app/admin/voting-rounds",
    "steps": [{ "click": "role=button[name=\"Create voting round\"]" }, { "waitFor": "role=dialog" }],
    "clip": "role=dialog"
  }
]
```

## Out of scope

- The other fields of these forms and the legacy `Form`, `AutoForm` and `Label` (items 3706, 3707, 3691).
- `AutoFormTextarea`'s composition and `auto-form/types.ts`, beyond the import switch.
- `EditModeContentObserver`, the legacy `theme.css`, the `@filigran/ui` aliases.
- Translating the raw `'Required'` zod messages of `ReachSalesDialogForm` and `EeLearnMoreSheet`: unchanged.

## Accessibility and i18n

- Accessible names stay the label texts the tests query (`VotingRound.Form.Description`,
  `Service.Trials.XtmPlatform.Feedback.Justification`, `EditableText.ValueLabel`), now through the design system
  `<label for>`. `EeLearnMoreSheet` gains an `aria-label` from an existing key. No new translation key.
- `error` restores `aria-invalid` and `aria-describedby` on the textarea; `required` sets `aria-required`.
- `noValidate` keeps zod the only validator where `required` now also sets the native attribute.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/epic src/components/admin/voting-round src/components/content-translation src/components/service/trial-instances src/components/service/document/one-click-deploy`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3561-textarea.md`

## Decisions

- **The design system field owns its label, required marker, helper and error.** Evidence in the installed
  `Textarea`: it spreads the caller's props, then sets `aria-invalid` from `error` only, so a bare `Textarea` under
  the legacy `FormControl` loses `aria-invalid` on a failing field; it warns in development without `label`,
  `aria-label` or `aria-labelledby`; `className` lands on its wrapper, not on the `<textarea>`. The other field
  migrations of this epic (`Input`, `Select`, …) follow the same rule.
- `minRows` replaces `rows` plus `field-sizing-content` in `EpicForm`: it is the design system's autosize API, and
  the contract makes `rows` and `minRows` mutually exclusive.
- `noValidate` is added only to the two forms that pass `required`, so an empty field still shows the zod message
  instead of the browser's bubble.

## To validate

- Within `EpicForm` and `VotingRoundForm`, textarea labels and errors use the design system typography while the
  neighbouring legacy fields keep `FormLabel` and `FormMessage` until their own migration. Alternative: keep the
  legacy label and message around a bare `Textarea`, at the cost of `aria-invalid`.
- `EpicForm`'s character counter sits on its own row under the design system error, which has no counter slot by
  design. Alternative: propose a counter upstream.
- `EpicForm` textareas grow with their content from 4 rows (`minRows`), resize handle off as before. Alternative:
  a fixed `rows={4}`.
- The trial feedback justification loses its `bg-elevation-background-layer-1` and `min-h-24` overrides and
  renders the design system background at its default 3 rows. Alternative: `rows={4}`.
- `ReachSalesDialogForm` drops its custom label classes and hand-written `*` for the design system label and
  required marker.
- `EeLearnMoreSheet` names its textarea with an `aria-label` reusing the heading above it. Alternative:
  `aria-labelledby` on that heading.

## Deferred findings

- Upstream, design system `Textarea` autosize (`useAutosize` in `dist/components/textarea/Textarea.mjs`): the height is
  measured only when `value`, `minRows` or `maxRows` change, with `overflowY: hidden` when there is no `maxRows`. In
  `EpicForm` (`minRows`, `resize="none"`), a width change after mount (window resize, late web font) can leave the
  last lines hidden with no scrollbar until the user types. Legacy `field-sizing-content` re-measured on its own. To
  propose upstream: re-measure on a `ResizeObserver`.
- `AutoFormTextarea` (`filigran-ui/components/auto-form/fields/Textarea.tsx`): with only the import switched, the
  design system `Textarea` overrides the `aria-invalid` the legacy `FormControl` passes, and warns in development
  for lack of `label` or `aria-label`. No app schema uses the `textarea` field type today; to settle with the
  `AutoForm` migration (item 3707).
- No unit test covers the `Textarea` error wiring of `EpicForm`, `ReachSalesDialogForm` and `EeLearnMoreSheet`
  (error text, `aria-invalid`, `aria-required`, `noValidate`): `EpicForm` is stubbed wherever it is mounted and the
  other two have no test file. Worth a dedicated test pass on these forms.
