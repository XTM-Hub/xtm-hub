---
key: 3568-switch
issue: 3568
epic: epic-1-primitives
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [Switch]
target_module: "@filigran/design-system"
target_symbols: [Switch]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Switch.tsx]
---

# Switch → `@filigran/design-system`

## Intent

Every on/off toggle moves to the design system `Switch`, which owns its integrated label when the text sits next to
the control. Checked values, toggling, disabled states and accessible names stay the same for users; the two toggles
that had no programmatic name (or only a sibling `<label>`) get the integrated one.

## Props mapping

`checked` and `onCheckedChange` keep the same signature (both are Radix `Switch.Root`). Where the text sits right next
to the control, it becomes the `label` prop (contract RULE-01: integrated label only). Where the text is laid out
apart from the control, the existing `aria-label` stays and `label` is omitted.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<Switch checked onCheckedChange />` + sibling `<span className="text-sm">` text, no accessible name | `<Switch label={t('Epic.ShowFinished')} checked onCheckedChange />`; the `<span>` goes, the wrapping `div` keeps only its `ml-auto` placement | 1 (`EpicFilter`) |
| `<Switch id="displayPersonalSpaces" checked onCheckedChange />` + sibling `<label htmlFor className="ml-s">` | `<Switch label={t('Service.Management.ShowPersonalSpaces')} checked onCheckedChange />`; the `id`, the `<label>` and the wrapping `div` go | 1 (`ServiceSlug`) |
| `<Switch checked onCheckedChange aria-label disabled? />` at the end of a `justify-between` row whose text (title, description, links) is laid out apart | Same props, import switched to `@filigran/design-system`; no `label` | 3 (`CookieConsentPreferences`) |
| `FormItem` (`flex-col`) + `FormLabel` + `FormControl` + `<Switch checked={field.value} onCheckedChange={field.onChange} aria-label />` + `FormMessage` | `<Switch label={t('VotingRound.Feature.Active')} checked={field.value} onCheckedChange={field.onChange} />` directly in the `FormField` render; `FormItem`, `FormLabel`, `FormControl`, `FormMessage` and the duplicate `aria-label` go (a `z.boolean()` field has no error to show) | 1 (`VotableFeatureForm`) |
| `AutoFormSwitch`: legacy composition around `<Switch checked onCheckedChange {...fieldProps} />` | Same composition, import switched to `@filigran/design-system` (`ComponentProps<typeof Switch>` still typechecks); no app schema uses the `switch` field type | 1 (legacy) |

## Files in scope

- `apps/frontend/src/components/epic/EpicFilter.tsx`
- `apps/frontend/src/components/service/[slug]/ServiceSlug.tsx`
- `apps/frontend/src/components/cookie-consent/CookieConsentPreferences.tsx`
- `apps/frontend/src/components/admin/voting-round/VotableFeatureForm.tsx`
- `apps/frontend/src/components/filigran-ui/components/auto-form/fields/Switch.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop the `Switch` export)
- `apps/frontend/src/components/filigran-ui/components/clients/Switch.tsx` (delete)
- Tests of the touched folders, only where a query no longer matches

## Screens

```json
[
  {
    "name": "epic-filter",
    "path": "/app",
    "steps": [
      { "click": "role=link[name=\"XTM Platform Roadmap\"]" },
      { "waitFor": "role=switch" }
    ],
    "clip": "div.grid:has([role=switch])"
  },
  {
    "name": "cookie-preferences",
    "path": "/app",
    "steps": [
      { "click": "role=region[name=\"Cookie settings\"] >> role=button[name=\"Cookie settings\"]" },
      { "waitFor": "role=dialog" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "admin-service-toolbar",
    "path": "/app/admin/service",
    "steps": [
      { "click": "role=row[name=/OpenAEV Scenarios Library/] >> role=button[name=/open menu/i]" },
      { "click": "role=menuitem[name=\"Manage\"]" },
      { "waitFor": "role=switch" }
    ],
    "clip": "div.justify-between.flex-wrap:has([role=switch])"
  }
]
```

## Out of scope

- The other fields of `VotableFeatureForm` and the legacy `Form`, `Sheet`, `Dialog`, `MultiSelectFormField` and
  `AutoForm` (their own items, e.g. 3706, 3707).
- `AutoFormSwitch`'s composition, beyond the import switch.
- The `@radix-ui/react-switch` dependency, the legacy `theme.css` and the `@filigran/ui` aliases (cleanup item 3708).
- `EditModeContentObserver`'s `[role="switch"]` selector: the design system `Switch` keeps `role="switch"`.

## Accessibility and i18n

- `EpicFilter`'s switch gains an accessible name (`Epic.ShowFinished`), through the design system `<label for>`;
  `EpicList.test.tsx` queries `getByRole('switch')`, which still matches.
- `ServiceSlug` and `VotableFeatureForm` keep their names (`Service.Management.ShowPersonalSpaces`,
  `VotingRound.Feature.Active`) through the integrated label; `VotableFeatureForm.test.tsx`'s
  `getByLabelText('VotingRound.Feature.Active')` and `VotingRoundDetail.test.tsx`'s
  `findByLabelText('VotingRound.Feature.Active')` still resolve to the switch.
- `CookieConsentPreferences` keeps its three `aria-label`s.
- No new translation key.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/epic src/components/service/[slug] src/components/cookie-consent src/components/admin/voting-round`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3568-switch.md`

## Decisions

- **Integrated label where the text is the control's neighbour, `aria-label` otherwise.** The usage contract's
  RULE-01 has no "label as sibling" mode: a detached label means `aria-label` and no `label`. `EpicFilter`,
  `ServiceSlug` and `VotableFeatureForm` render their text right next to the control, so it becomes `label`;
  `CookieConsentPreferences` lays out a title, a description and links away from the control, so it keeps
  `aria-label`. This follows the Textarea spec's rule that the design system field owns its label.
- `VotableFeatureForm` drops the legacy `FormItem` / `FormControl` / `FormMessage` wrappers: `active` is a
  `z.boolean()` with a default, so no message can show, and the integrated label replaces `FormLabel`. Keeping
  `FormLabel` and `aria-label` side by side would also keep the name declared twice.
- The installed `Switch` spreads the caller's props on the Radix `Root` and applies `id` to it, so `AutoFormSwitch`
  keeps working under the legacy `FormControl` (id, `aria-describedby`, `aria-invalid` all land on the button).
- **An AutoForm adapter only changes its import**, plus what keeps it from breaking: moving an adapter onto the
  design system's integrated label, required marker and error is item 3707 (epic 3). `Input`, `Number` and
  `Checkbox` already went further and stay as they are; the other adapters follow this rule.

## To validate

- `VotableFeatureForm`: the "Active" text moves from above the switch (legacy `FormLabel`) to its right, in the
  design system label typography, while the neighbouring fields keep `FormLabel` until their own migration.
  Alternative: keep `FormLabel` above a label-less `Switch` with `aria-label`.
- `EpicFilter` and `ServiceSlug`: the text next to the switch takes the design system label typography and colour
  (`content-compact-medium`, `text-input-placeholder`) instead of `text-sm` / the inherited body text, and the gap
  becomes the design system's. Alternative: keep the sibling text and name the switch with `aria-labelledby`.
- `CookieConsentPreferences`: disabled switches of required categories render at the design system's 40% opacity
  instead of the legacy 50%, and keep their `aria-label` with no visible integrated label.

## Deferred findings

- Tests: `EpicList.test.tsx:243` queries `getByRole('switch')` without `{ name: 'Epic.ShowFinished' }`, so the new
  accessible name is not asserted; tightening it rewrites an existing test, which `testing-validation` reserves for a
  human.
- Tests, existing gaps: no test toggles `VotableFeatureForm`'s `active` switch and checks the submitted value;
  `ServiceSlug`, the `CookieConsentPreferences` dialog and `AutoFormSwitch` have no component test.
- i18n, existing: `ja.json` `Epic.ShowFinished` is `表示終了` ("end of display"), now the switch's accessible name.
- `ServiceSlug.tsx` still fetches with Relay; `frontend.md` asks to move a touched component to react-query, out of
  this item's scope.
- `apps/frontend/package.json` keeps `@radix-ui/react-switch`, now used only through the design system (cleanup
  item 3708).
