---
key: 3707-auto-form
issue: 3707
epic: epic-3-candidates
kind: candidate # ds | candidate | adoption | cleanup
legacy_symbols: [AutoForm, AutoFormSubmit]
target_module: "@/components/ui/auto-form"
target_symbols: [AutoForm]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/auto-form/AutoForm.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/index.ts, apps/frontend/src/components/filigran-ui/components/auto-form/types.ts, apps/frontend/src/components/filigran-ui/components/auto-form/config.ts, apps/frontend/src/components/filigran-ui/components/auto-form/utils.ts, apps/frontend/src/components/filigran-ui/components/auto-form/dependencies.ts, apps/frontend/src/components/filigran-ui/components/auto-form/common/Label.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/common/Tooltip.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/Checkbox.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/Date.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/Date.test.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/Enum.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/Enum.test.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/File.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/File.test.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/Input.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/Number.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/Object.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/RadioGroup.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/Switch.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/Textarea.tsx, apps/frontend/src/components/filigran-ui/components/auto-form/fields/Textarea.test.tsx, apps/frontend/src/components/filigran-ui/index.ts]
---

# AutoForm → `@/components/ui/auto-form`, rebuilt on the Form, Label and Accordion candidates and the design system fields

## Intent

The design system ships no schema-driven form. The legacy `AutoForm` (a `zod` schema walked into `react-hook-form`
fields) is the last component of `filigran-ui/`: 23 forms import it from `@filigran/ui`. Previous items already moved
its field renderers onto the design system (`Input`, `Textarea`, `Checkbox`, `Switch`, `RadioGroup` / `Radio`,
`Select`, `DatePicker`, `FileSelect`, `Button`) and onto the `Form` and `Accordion` candidates. It is rebuilt as a
candidate in `src/components/ui/auto-form/` on the same engine, keeping every option a caller uses and the mapping
from `zod` types to fields; the options no caller uses go. What users get stays: the same fields, labels, required
markers, errors, values and submit behaviour. No visual change is expected.

## The component

`src/components/ui/auto-form/`, the package layout plus the engine files moved from the legacy folder:

- `AutoForm.tsx` (`'use client'`): `AutoForm`, same generic `SchemaType extends ZodObjectOrWrapped`, its props
  extracted into an exported `AutoFormProps<SchemaType>`: `formSchema`, `values`, `onValuesChange`, `onSubmit`,
  `fieldConfig`, `children` (node, or a function of the `formState`), `className`. Body as the legacy: `zodResolver`,
  default values from the schema, `form.watch` → `onValuesChange`, submit through `safeParse`; a `div.w-full` >
  `Form` > `form` with `cn('space-y-5', className)` from the app's `cn` (`@/lib/utils`).
  - Dropped, no caller: `AutoFormSubmit`, `onParsedValuesChange`, `dependencies` (`DependencyType`,
    `dependencies.ts`), `intlTranslation`.
- `AutoFormObject.tsx` (the legacy `fields/Object.tsx`): same walk. A `zod` field resolves its renderer from
  `fieldConfig.fieldType` (a key of `INPUT_COMPONENTS` or a component), else the `DEFAULT_ZOD_HANDLERS` (`boolean` →
  checkbox, `date`, `enum` → select, `number`), else `fallback` (`Input`). An array field renders only through a
  component `fieldType` (the legacy array branch, `label={key}`, `value ?? []`); a nested object renders as an
  `AccordionItem` with an `AccordionTrigger` named after the field and its fields inside `AccordionContent
  className="p-2"`. The root stays `Accordion type="multiple" className="space-y-5"` from `@/components/ui/accordion`.
  - Dropped: `renderParent`, `order` (`sortFieldsByOrder`: every field at 0 kept the schema order), the dependency
    overrides (`isHidden`, `isDisabled`, `overrideOptions`), the no-op `processSchemaItem`, the unused `form` prop, the
    commented `AutoFormArray`, the `border-none` classes (the Accordion candidate draws no border), and the hard-coded
    English "Array not implemented yet" block: an array without a component `fieldType` renders nothing.
- `fields/`: `Input`, `Number`, `Textarea`, `Checkbox`, `Switch`, `RadioGroup`, `Enum`, `Date`, `File`, moved with
  their design system field unchanged, except:
  - `AutoFormTooltip` goes (`description` has no caller), and the bare wrapper `div`s that only held it with the
    `FormItem` (`Checkbox`, `Switch`, `RadioGroup`); `Input` loses its single-child `flex-row` wrapper, its `FormItem`
    keeps `w-full`.
  - `showLabel` goes (`Input`, `Number`, `Textarea`, `File`): the label is always drawn; `popoverContentClassName`
    goes (`Enum`).
  - `Switch` and `RadioGroup` draw `<FormLabel required={isRequired}>{text}</FormLabel>` instead of `AutoFormLabel`
    and its 14px `text-destructive` " *" span: the `Label` star, as 3706 planned.
  - `Enum` imports `cn` from `@/lib/utils`.
- `config.ts` (`INPUT_COMPONENTS`, `DEFAULT_ZOD_HANDLERS`), `types.ts` (`FieldConfig`, `FieldConfigItem` with
  `label`, `fieldType`, `inputProps` only, `AutoFormInputComponentProps`), `utils.ts` (moved; `sortFieldsByOrder`,
  `hasEffects`, `unwrapEffects` dropped, no caller).
- `AutoForm.meta.ts`: `AutoFormMeta`, typed `ComponentMeta` (type import only), on the model of `Form.meta.ts`:
  description (a `zod` object schema rendered as `react-hook-form` fields drawn by the design system fields; the
  `zod` type to field mapping; `fieldConfig` labels, `inputProps` and `fieldType`), `status: 'beta'`, `category:
  'inputs'`, `version: '0.1.0'`, `radixPrimitive: 'none'`, variants `default`, examples (a schema with a required
  string, an optional boolean and an enum; a `fieldType: 'radio'` and a component `fieldType`; `children` as a render
  function), `props`, `accessibility` with `wcagStatus: 'pending'`, no contrast pair of its own (the fields carry
  theirs) and notes (each field labelled, required star `aria-hidden` with `aria-required`, `aria-invalid` and the
  error as the field description, nested objects as accordion buttons).
- `AutoForm.test.tsx` (`testRender`, real `zod` and `react-hook-form`), lean: required and optional strings as
  textboxes named by their `fieldConfig` label or the beautified key (`firstName` → "First Name"), `aria-required`
  only on the required one; `boolean` → checkbox, `number` → spinbutton; `values` prefills and `onSubmit` gets the
  parsed values; `onValuesChange` fires on typing; `children` as a function gets the `formState`; `fieldType: 'radio'`
  draws one radio per enum value and the label star `aria-hidden`; `fieldType: 'switch'` draws a switch named by its
  label; a component `fieldType` on an array field receives the field; a nested object opens from its accordion
  trigger; `className` on the `form`.
- `fields/{Date,Enum,File,Textarea}.test.tsx`: moved, import from `@/components/ui/auto-form`, bodies unchanged.
- `index.ts`: exports `AutoForm` and the types `AutoFormProps`, `FieldConfig`, `FieldConfigItem`,
  `AutoFormInputComponentProps`, never the meta.

## Props mapping

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `import { AutoForm } from '@filigran/ui'` | `import { AutoForm } from '@/components/ui/auto-form'` | 23 |
| `<AutoForm formSchema values onSubmit fieldConfig>{children}</AutoForm>` | unchanged | 23 |
| `onValuesChange={(values, form) => …}` | unchanged | 9 |
| `children` as `({ isValid })` / `({ isDirty })` render function | unchanged | 3 |
| `className="mt-l"` / `"mt-xl"` / `"space-y-m"` | unchanged | 3 |
| `fieldConfig` `label`, `inputProps` (`placeholder`, `disabled`, `readOnly`, `accept`, `maxLength`) | unchanged | 23 |
| `fieldType: 'radio'` / `'file'` | unchanged (`RadioGroup`, `FileSelect`) | 6, 8 |
| `fieldType: ({ field }) => …` on scalar and array fields | unchanged | 20 |
| Field tests importing from `@/components/filigran-ui/components/auto-form` | `@/components/ui/auto-form` | 4 |

## Files in scope

- `apps/frontend/src/components/ui/auto-form/` (new): `AutoForm.tsx`, `AutoForm.meta.ts`, `AutoForm.test.tsx`,
  `AutoFormObject.tsx`, `config.ts`, `types.ts`, `utils.ts`, `index.ts`,
  `fields/{Checkbox,Date,Enum,File,Input,Number,RadioGroup,Switch,Textarea}.tsx`,
  `fields/{Date,Enum,File,Textarea}.test.tsx`
- Call sites, import switch only (under `apps/frontend/src/components/`): `competitor/CompetitorForm`,
  `registration/register/OrganizationForm`, `registration/registerFromHub/ConnectFromHubForm`, `profile/form/Edit`,
  `profile/form/RequestTransferPersonalSpace`, `admin/role/{SsoGroupRolePortalForm,RolePortalForm}`,
  `service/custom-views/[serviceInstanceId]/CustomViewForm`, `service/opencti-playbooks/[serviceInstanceId]/OpenctiPlaybookForm`,
  `service/custom-dashboards/[serviceInstanceId]/CustomDashboardForm`, `service/openaev-scenarios/[serviceInstanceId]/OpenaevScenarioForm`,
  `service/integrations/forms/{ConnectorForm,StreamForm,TaxiiFeedForm,ThirdPartyIntegrationForm,CsvFeedForm,RssFeedForm}`,
  `service/document/one-click-deploy/ChoosePlatformForm`, `service/document/ui/LibraryUpdateMetadata`,
  `service/components/header/IntegrationsCsvExportDialog`, `service/trial-instances/TrialCancelSheet`,
  `service/trial-instances/banner/xtm-platform-trial/PrivateXtmPlatformTrialBanner`,
  `service/trial-instances/xtm-platform-trial/shared/BundleCancelSheet`
- Delete the whole `apps/frontend/src/components/filigran-ui/components/auto-form/` folder and
  `filigran-ui/index.ts` (its last export). `filigran-ui/lib/utils.ts` and `theme.css` stay for cleanup 3708.

Existing call-site tests (`ConnectFromHubForm.test.tsx`, `ConnectProductFromHubModal.test.tsx`, the forms' own tests)
keep passing unchanged. No e2e locator changes: the textbox, checkbox and radio names and the
`input[type="file"][accept*="application/json"]` the page models use are drawn by the same design system fields.

## Screens

The integration sheet holds every built-in renderer a caller reaches but the select: inputs, the published checkbox,
the JSON `FileSelect` and the license `RadioGroup` (scrolled to it). The custom dashboard sheet shows the checkbox and
the JSON `FileSelect` in a sheet with no radio, and the profile form the optional inputs (no star) outside a sheet. The
only select (`ConnectFromHubForm`) is unreachable for the development admin, whose workspace denies connecting a
product: `Enum.test.tsx` covers it.

```json
[
  {
    "name": "integration-create-license",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "li:has-text(\"Start your 30-day free trial\") >> role=button[name=\"Close\"]" },
      { "click": "role=button[name=\"OpenCTI\"]" },
      { "click": "role=link[name=\"Integrations\"]" },
      { "click": "role=button[name=\"Add new Integration\"]" },
      { "click": "role=menuitem[name=\"TAXII Feeds\"]" },
      { "hover": "role=dialog >> role=radio[name=\"Commercial\"]" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "custom-dashboard-published",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "li:has-text(\"Start your 30-day free trial\") >> role=button[name=\"Close\"]" },
      { "click": "role=button[name=\"OpenCTI\"]" },
      { "click": "role=link[name=\"Custom Dashboards\"]" },
      { "click": "role=button[name=\"Add new dashboard\"]" },
      { "hover": "role=dialog >> role=checkbox[name=\"Is the Custom Dashboard published?\"]" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "profile-form",
    "path": "/app/profile",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "waitFor": "input[placeholder=\"First name\"]" }
    ],
    "clip": "form:has(input[placeholder=\"First name\"])"
  }
]
```

## Out of scope

- The custom `fieldType` components of the callers (`useServiceFormFields`, `CountryField`, `TierField`, the trial and
  platform radio fields…) and the forms around `AutoForm`.
- The `zod` walk itself (`zodToHtmlInputProps`, `getDefaultValues`, `getBaseSchema`): moved as is.
- `react-hook-form`, `@hookform/resolvers`, `zod` in `package.json`; the `@filigran/ui` and `@filigran/ui/auto-form`
  aliases in `tsconfig.json` and `vitest.config.ts`, left dangling as 3706 left `@filigran/ui/clients` (cleanup 3708).

## Accessibility and i18n

- Kept: every field's label, `aria-required`, `aria-invalid` and error description, drawn by the design system fields;
  the nested-object accordion buttons.
- `Switch` and `RadioGroup` labels: the star becomes the `aria-hidden` `Label` star, so a required one loses its
  trailing " *" from the label text. No caller makes them required today.
- No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui src/components/service src/components/admin src/components/registration src/components/profile src/components/competitor`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3707-auto-form.md`

## Decisions

- **Same engine, moved**: the `zod` walk, `react-hook-form` binding and field renderers already sit on the design
  system and the Form candidate; the rebuild moves them out of `filigran-ui/` and trims what no caller uses.
- **Type coverage kept, unused options dropped**: every `zod` type to field mapping stays (including `Textarea`,
  `Switch`, `Number`, `Date` and nested objects, which no caller reaches today) because it is what `AutoForm` is;
  configuration options with no caller go, as the Carousel and DataTable candidates dropped theirs.
- **Nested objects on the Accordion candidate**, the dependency declared for this item.
- **`radixPrimitive: 'none'`**: `AutoForm` wraps no Radix primitive itself; the Accordion and Form candidates do.
- **Tests moved with their renderers**: the four field tests stay next to the files they cover.

## To validate

- `Switch` and `RadioGroup` required labels take the `Label` star (12px label, `text-3` star, `aria-hidden`) instead of
  the legacy 14px `text-destructive` " *". Alternative: the design system fields' own `required` prop, which
  `RadioGroup` does not have.
- `description` (helper text under a field) is dropped, no caller. Alternative: keep it as each design system field's
  helper text (`helperText` / `SelectHelperText`), for the upstream proposal.

## Deferred findings

- `Enum` falls back to the hard-coded English "Select an option" when no `placeholder` is set; its only caller sets
  one.
- The array branch names a component `fieldType` with the raw key (`label={key}`) and reads `required` from
  `inputProps` only, unlike scalar fields (carried over from the legacy).
- `zodToHtmlInputProps` reads Zod 3 shapes (`typeName`, `checks[].kind`), so under Zod 4 no `minLength`, `maxLength`,
  `pattern` or `type="email"` reaches the inputs; only `required` does (carried over from the legacy).
- `RadioGroup` uses each enum value as the radio label, untranslated ("Free", "Commercial").
- A `fieldType` set to `'checkbox'` or `'switch'` on a required boolean draws no required marker on `Checkbox`.
- `FieldConfig` applies `z.infer` to an already inferred type, so array, nested object, `Date` and `FileList` keys get
  `{}`: their config (a mistyped `label`, a string `fieldType` on an array) is not type-checked (carried over).
- The `Checkbox` and `Switch` renderers draw no `FormMessage`: a rejected boolean blocks submit with no visible error,
  and `aria-describedby` points at a message element that does not exist (carried over).
- The label fallback to the schema description reads `_def.description`, which Zod 4 `.describe()` never sets: the
  label is always the `fieldConfig` label or the beautified key (carried over).
- `zodToHtmlInputProps` marks `.default()` and Zod 4 pipes as required, and the `Date` renderer ignores `inputProps`
  (carried over).
- `onSubmit` runs `safeParse` again on the output `zodResolver` already parsed: a transform that is not idempotent
  makes submit a silent no-op (carried over).
- The `RadioGroup` renderer's `FormLabel htmlFor` targets the group `div`, which is not labelable; the group is named
  by `aria-label` only (carried over).
- Before an upstream proposal, the `Date`, `File` and `Enum` renderers still depend on `next-intl`,
  `@/hooks/use-translate` and `@/utils/design-system/*`.
- Instruction drift (`hub-review`): `.claude/rules/design-system.md`, `.claude/rules/frontend.md` and `AGENTS.md` still
  name `@filigran/ui` as the fallback import, which now resolves to deleted files until cleanup 3708 removes the
  aliases.
