---
key: 3556-input
issue: 3556
epic: epic-1-primitives
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [Input, InputProps]
target_module: "@filigran/design-system"
target_symbols: [Input, InputProps, RadioGroup, Radio]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/servers/Input.tsx]
---

# Input → `@filigran/design-system`

## Intent

Every single-line field moves to the design system `Input`, which owns its label, required marker and error message.
The two legacy `Input type="radio"` lists move to the design system `RadioGroup` + `Radio`, the component of their role.
Values, validation, submission, placeholders and accessible names stay the same for users, except the required ` *`
suffix of names on the design system `Input`.

## Props mapping

Same rule as the Textarea spec: the react-hook-form `FormField` stays; around the field, the legacy `FormItem`,
`FormLabel`, `FormControl` and `FormMessage` go, their roles move to `label`, `required` and `error`, and `error` takes
the raw `fieldState.error?.message` that `FormMessage` showed. Every placeholder stays (e2e and
`ds-migration/screenshot.mjs` locate fields by it).

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `FormLabel` + `<Input placeholder {...field} />` (`type="password"` on one) + `FormMessage` | `<Input label placeholder error={fieldState.error?.message} {...field} />` | 12 (`VotableFeatureForm` title and short description, `VotingRoundForm`, `SolutionCategoryForm`, `UserForm`, `AdminUserUpdateForm` ×2, `UserAdminForm` ×4, `PlatformUpdateSheet` name) |
| Same, no `FormMessage` | `<Input label placeholder {...field} />`, no `error` | 4 (`LoginForm` ×2, `organization/OrganizationForm`, `UseCaseForm`) |
| `FormLabel` + `<Input type="number" min={0} {...field} />` + `FormMessage` (string value) | `<Input label type="number" min={0} error {...field} />` | 1 (`VotableFeatureForm` position) |
| `FormLabel` + `<Input {...field} placeholder type="number" min={0} onChange={parseInt} />` (number value) | `<Input label {...field} value={Number.isFinite(field.value) ? String(field.value) : ''} placeholder type="number" min={0} onChange={parseInt} />` | 1 (`TrialsTabQuotasPlatformUpdateForm`) |
| `FormLabel` + `<Input value={platformUrl} disabled />` | `<Input label={t('Register.Details.ProductURL')} value={platformUrl} disabled />` | 1 (`PlatformUpdateSheet`) |
| `EpicFieldLabel required` + `<Input {...field} value ?? '' placeholder />` + `FormMessageWithCharacterCount` | `div.flex.flex-col.gap-s` + `<Input label={t('Epic.Form.Title')} required {...field} value ?? '' placeholder error />` + `CharacterCounter`, as the textareas; `FormMessageWithCharacterCount` is deleted (no user left); no `maxLength` | 1 (`EpicForm` title) |
| `EpicFieldLabel` + `FormControl` + `<AutocompleteInput …/>` + `FormMessage` | `<AutocompleteInput label={t('Epic.Form.SlackLink')} error …/>`; `AutocompleteInput` props become the design system `InputProps` minus `value`, `onChange`, `type`, and it renders the design system `Input` with its combobox ARIA unchanged | 1 + wrapper |
| `SearchInput`: `<Input {...props} startIcon={<SearchIcon className="size-4" />} />`, typed legacy `InputProps` | Same on the design system `Input` and `InputProps`, plus `aria-label` defaulting to `placeholder`; the 7 callers passing `containerClass` pass `className` (the design system puts it on its wrapper) | 1 wrapper, 7 callers |
| `<Input ref value onChange onKeyDown placeholder />` inside `SelectContent` | Same + `aria-label={labels.editableFieldPlaceholder}` | 1 (`SelectWithEditableField`) |
| Per organization: `FormItem` + `<Input type="radio" className aria-labelledby checked onChange value={name} />` + `FormLabel id` (name, type, italic "Recommended") + muted description `<p>` + `FormMessage` | One `FormItem` > `FormControl` > `<RadioGroup aria-label={t('Register.OrganizationForm.Description')} value={field.value} onValueChange={field.onChange}>` + per organization `<Radio value={organization.id} label={<>name (type){!isPersonal && <span className="italic"> - Recommended</span>}</>} description={t(descriptionKey)} />`, then one `FormMessage`; the title `<p>` stays. `platformName`'s `inputProps.className` goes | 1 (`register/OrganizationForm`) |
| Per platform: `<Input id type="radio" disabled checked onChange value className />` + `FormLabel htmlFor`, wrapped in a `Tooltip` when disabled | `FormItem` > `FormControl` > `<RadioGroup aria-label={the DeployQuestionTag text} value={field.value} onValueChange={field.onChange}>` + `<Radio id={platform.id} value={platform.url} disabled={isDisabled} label={platform.title} />`; a disabled one sits in `<TooltipTrigger asChild><span className="flex">`, never in a button; `FormMessage` unchanged | 1 (`ChoosePlatformForm`) |
| `AutoFormInput` / `AutoFormNumber`: `AutoFormLabel` + `FormControl` + `<Input type {...fieldProps} />` + tooltip + `FormMessage` | `FormItem` kept (context of `useFormField`) + `<Input label={showLabel ? text : undefined} aria-label={showLabel ? undefined : text} required={isRequired} error={useFormField().error?.message} type {...fieldProps} />` (spread last, as before) + tooltip; `AutoFormLabel`, `FormControl` and `FormMessage` go. `text` = `fieldConfigItem?.label \|\| label` | 2 (legacy, every AutoForm string and number field) |
| `ColorPicker`: `<Input maxLength={7} onChange ref value />` + absolute swatch | Design system `Input` with `aria-label={t('UseCaseForm.Color')}`, same props; the swatch stays on the field row (top-anchored, not centred on field + counter) | 1 (legacy) |
| `TagInput`: `<Input … className="h-5 w-fit flex-1 border-0 bg-transparent …" />` inside its own field | Native `<input>` with the same props and the legacy base classes merged once in a local constant | 6 (legacy) |

## Files in scope

- `apps/frontend/src/components/login/LoginForm.tsx`
- `apps/frontend/src/components/organization/OrganizationForm.tsx`, `organization/OrganizationList.tsx`
- `apps/frontend/src/components/admin/use-case/UseCaseForm.tsx`, `admin/solution-category/SolutionCategoryForm.tsx`
- `apps/frontend/src/components/admin/voting-round/VotableFeatureForm.tsx`, `VotingRoundForm.tsx`
- `apps/frontend/src/components/admin/user/forms/UserForm.tsx`, `forms/admin/AdminUserUpdateForm.tsx`, `forms/admin/UserAdminForm.tsx`
- `apps/frontend/src/components/admin/user/UserList.tsx`, `admin/user/pending-user/PendingUserList.tsx`
- `apps/frontend/src/components/trials/tab/TrialsTab.tsx`, `trials/tab/quotas/TrialsTabQuotasPlatformUpdateForm.tsx`
- `apps/frontend/src/components/service/components/PlatformUpdateSheet.tsx`, `service/components/header/ServiceListHeader.tsx`, `service/AdminServiceTab.tsx`
- `apps/frontend/src/components/service/registration/SelectWithEditableField.tsx`
- `apps/frontend/src/components/service/document/one-click-deploy/ChoosePlatformForm.tsx`
- `apps/frontend/src/components/organization/[slug]/subscribed-services/OrganizationSubscribedServices.tsx`
- `apps/frontend/src/components/registration/register/OrganizationForm.tsx`
- `apps/frontend/src/components/epic/EpicForm.tsx`
- `apps/frontend/src/components/ui/SearchInput.tsx`, `ui/AutocompleteInput.tsx`
- `apps/frontend/src/components/filigran-ui/components/auto-form/fields/Input.tsx`, `fields/Number.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/ColorPicker.tsx`, `clients/tag-input/TagInput.tsx`
- `apps/frontend/src/components/filigran-ui/components/servers/index.ts` (drop the `Input` export)
- `apps/frontend/src/components/filigran-ui/components/servers/Input.tsx` (delete)
- `apps/e2e/tests/model/integration.pageModel.ts`, `apps/e2e/tests/tests_files/custom-dashboards.spec.ts`: the
  required `*` left the accessible name of the AutoForm fields they locate
- Tests of the touched folders, only where a query no longer matches; `register/OrganizationForm.test.tsx` asserts
  the radio order on `getAttribute('value')` (`org-pro-1`, `org-pro-2`, `org-personal`) instead of the names

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
      { "click": "role=button[name=\"Create epic\"]" },
      { "waitFor": "role=dialog >> [aria-invalid=\"true\"]" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "profile-form",
    "path": "/app/profile",
    "steps": [{ "waitFor": "input[placeholder=\"First name\"]" }],
    "clip": "form:has(input[placeholder=\"First name\"])"
  },
  {
    "name": "admin-user-search",
    "path": "/app/admin/user",
    "steps": [{ "waitFor": "input[placeholder=\"Search user...\"]" }],
    "clip": "div.flex-col-reverse:has(input[placeholder=\"Search user...\"])"
  }
]
```

## Out of scope

- `SearchInput` → `SearchField` (item 3551), `ColorPicker` (3547) and `TagInput` (3701): only their legacy `Input` goes.
- The other fields of these forms and the legacy `Form`, `Label`, `Tooltip` and `AutoForm` (items 3706, 3691, 3564, 3707);
  `EpicFieldLabel` stays for the fields that still use it.
- The raw zod messages (`'This is not a valid email.'`, `'Name is required'`, untranslated keys): shown as before.
- `CommandInput` (cmdk) and `FileInput`: not the legacy component. The legacy `theme.css` and the `@filigran/ui` aliases.

## Accessibility and i18n

- Names kept through the design system `<label for>`, except the required ` *` suffix (`getByLabelText` in the
  touched tests, e2e `getByLabel`); every placeholder kept (e2e `email`, `password`, `First name`, `Last name`,
  `Name`, `Email`, `Search...`, `Add a domain`). `SearchInput` and `SelectWithEditableField` gain an `aria-label`
  equal to the text the browser already used. `error` sets `aria-invalid` and `aria-describedby`; `required` sets `aria-required`.
- The design system `Input` renders the required `*` `aria-hidden`, outside the `<label>`, so the required fields it
  renders, AutoForm string and number fields included, lose their ` *` name suffix (`'Name *'` becomes `'Name'`) and
  the e2e locators follow. AutoForm fields still on `AutoFormLabel` keep it.
- Registration radios keep their exact names (e2e `'Filigran (Organizational workspace) - Recommended'`); the
  description moves to `aria-describedby`. Both radio groups gain a name from existing keys. Radix arrow keys replace
  the native ones.
- No new translation key.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/login src/components/organization src/components/admin src/components/trials src/components/registration src/components/service src/components/epic src/components/ui src/components/profile src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `yarn workspace @xtm-hub/test_e2e lint`
- `yarn workspace @xtm-hub/test_e2e format:check`
- `node ds-migration/validate.mjs ds-migration/specs/3556-input.md`

## Decisions

- **The design system field owns its label and error**, as decided for `Textarea`: its `aria-invalid` is set after
  the caller's props (`dist/components/input/Input.mjs`), so a bare `Input` under `FormControl` loses it, and
  `className` lands on its wrapper.
- **`error` only where `FormMessage` rendered**: adding it elsewhere would show raw zod messages users never saw.
- **`type="number"`, not `isTypeNumber`**: the contract maps `@filigran/ui <Input />` 1:1, and the drawn stepper's
  arrows carry English default labels that would need two new keys.
- **Radios to `RadioGroup` + `Radio`**: the design system `Input` has no `radio` type; the Radio spec's rule applies
  (integrated `label`, `description`, group `aria-label`, `FormControl` around the group).
- **`TagInput` keeps a native `<input>`**: its entry sits borderless inside its own field; the design system field
  cannot render that without restyling, and 3701 replaces the whole component.
- **`EpicForm` title keeps the external counter** with no `maxLength`: the design system one would cap typing at 160
  and replace the translated `Epic.Form.CharacterCount`; zod stays the validator.
- No screen for the two radio lists: they need a platform registration callback or registered platforms, which the
  development seed has not. `register/OrganizationForm.test.tsx` and the e2e `registration.spec.ts` cover them.

## To validate

- Every field takes the design system look (36px, `bg-input-default`, its label typography and error colour) while
  neighbouring legacy fields keep `FormLabel` / `FormMessage` until their item. Alternative: none without restyling.
- `LoginForm`, `organization/OrganizationForm`, `UseCaseForm` and `TrialsTabQuotasPlatformUpdateForm` show no error
  and, on a failed submit, lose the red label and `aria-invalid` they had. Alternative: pass `error`, exposing raw
  zod messages.
- Number fields keep the browser spinner. Alternative: `isTypeNumber` with the drawn stepper and two new keys.
- Registration and one-click deploy radios become the 16px design system radio, the description goes under the label
  instead of a muted indented paragraph, disabled platforms use the design system disabled colour.
- `ColorPicker`'s hex field shows the design system `N/7` counter (contract RULE-09). Alternative: drop `maxLength`.
- The library SEO title and description fields (`LibraryUpdateMetadata`, AutoForm with `inputProps.maxLength`) show
  the same `N/155` counter. Alternative: drop `maxLength` and let zod alone cap them.
- One-click deploy: a disabled platform's tooltip trigger is a focusable `span` (`tabIndex={0}`), an extra tab stop
  inside the radio group, so keyboard users still reach the reason it is disabled.
- The service slug field's read-only `opacity-50` now dims its label too (it lands on the wrapper).
- `RegisterOrganizationForm` platform name drops its `bg-grayblue-700 border-none` override.
- `TagInput`'s inner entry stays native with the legacy classes until 3701.

## Deferred findings

- AutoForm: the `*` and native `required` follow `fieldProps.required`, not `isRequired`, so a field required only by
  a dependency shows no `*` (the legacy `AutoFormLabel` showed one). To settle with item 3707.
- `ColorPicker`: the hex field and the swatch button share the name `UseCaseForm.Color`. To settle with 3547.
- `AutocompleteInput`: the suggestion list is positioned under the design system field's whole wrapper, so when the
  Slack link shows an error the list opens under the message instead of under the field. Anchoring it needs a popover
  primitive; to settle with the AutoForm or Popover item.
- Upstream: `InputProps['type']` is `text | password | number | email`, while AutoForm's `zodToHtmlInputProps` can
  produce `url`; it is cast and still reaches the DOM. A design system request.
- Tests: this spec only fixes queries that no longer match. No unit test asserts the `error` message and
  `aria-invalid` on the migrated form fields, picking a non-default registration organization, `ChoosePlatformForm`
  (no test file), the `TrialsTabQuotasPlatformUpdateForm` number conversion, the AutoForm `showLabel: false` /
  `required` / error path, `SearchInput`'s default `aria-label`, `AutocompleteInput`'s `label` and `error`, the new
  `aria-label`s of `SelectWithEditableField` and `ColorPicker`, or the `EpicForm` title counter. E2e covers names
  and the default submissions only.
