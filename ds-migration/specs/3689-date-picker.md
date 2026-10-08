---
key: 3689-date-picker
issue: 3689
epic: epic-2-composites
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [DatePicker, Calendar, CalendarProps]
target_module: "@filigran/design-system"
target_symbols: [DatePicker]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/DatePicker.tsx, apps/frontend/src/components/filigran-ui/components/clients/Calendar.tsx]
---

# DatePicker → `@filigran/design-system`

## Intent

The legacy `DatePicker` (a secondary `Button` showing the date, opening a react-day-picker `Calendar` in a popover)
moves to the design system `DatePicker`: an editable text field in the Input shell, with a calendar button and its
own calendar panel. The legacy `Calendar`, used by nothing else, goes with it. The subscription start and end dates
keep their values, defaults, validation and submission.

## Props mapping

Rules shared by every row:

- **The field owns its label and error**, as for `Input`, `Textarea` and `Select`: around a date field of a
  react-hook-form `FormField`, `FormItem`, `FormLabel` and `FormMessage` go, and the empty fragment with them; the
  label moves to `label`, the `FormMessage` text to `error={fieldState.error?.message}`.
- **The value goes through two pure helpers**, in a new `apps/frontend/src/components/ui/date-picker-field.utils.ts`
  with its test: `toDatePickerValue(value)` gives the field value when it is a valid `Date`, else `null` (contract
  RULE-02: `undefined` would make the picker uncontrolled, and an Invalid Date is never passed);
  `fromDatePickerChange(date, context)` gives `new Date(Number.NaN)` when `context.validationError === 'invalidDate'`,
  else `date ?? undefined`. Unparseable text thus fails the form's `z.coerce.date()`, instead of being stored as no
  date (RULE-04).
- **`locale` is the app locale**, `useLocale()` from `next-intl` (RULE-06), as `useDateFormatter` formats dates.
- **`popoverContentClassName` goes**: the design system panel is its own `Paper` and takes no class.
- Placeholder, panel and button names keep the design system defaults.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<>` `FormItem` > `FormLabel` + `<DatePicker popoverContentClassName date={field.value} setDate={field.onChange} />` + `FormMessage` (required `start_date`) | `<DatePicker label={t('OrganizationInServiceAction.StartDate')} locale={locale} value={toDatePickerValue(field.value)} onChange={(date, context) => field.onChange(fromDatePickerChange(date, context))} error={fieldState.error?.message} />`; `render` destructures `fieldState` | 1 (`ServiceSlugOrgaForm` start date) |
| Same, optional `end_date` | Same with `label={t('OrganizationInServiceAction.EndDate')}` and `clearable` (RULE-07) | 1 (`ServiceSlugOrgaForm` end date) |
| `AutoFormDate`: `FormItem` > `AutoFormLabel` + `FormControl` > `<DatePicker date setDate popoverContentClassName={fieldProps.popoverContentClassName} />` + tooltip + `FormMessage` | Same composition; inside `FormControl`, `<DatePicker aria-label={fieldConfigItem?.label \|\| label} locale={useLocale()} value={toDatePickerValue(field.value)} onChange={(date, context) => field.onChange(fromDatePickerChange(date, context))} />`; the `popoverContentClassName` read goes | 1 (legacy, AutoForm `date` handler; no schema uses it today) |

## Files in scope

- `apps/frontend/src/components/service/[slug]/ServiceSlugOrgaForm.tsx`
- `apps/frontend/src/components/filigran-ui/components/auto-form/fields/Date.tsx`
- `apps/frontend/src/components/ui/date-picker-field.utils.ts` and `date-picker-field.utils.test.ts` (new): `it.each`
  over a valid date, `undefined`, an Invalid Date; a pick, a clear, `invalidDate`, a bound error (`minDate`) keeping
  the date; `null` and an ISO string also give `null`
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop the `Calendar` and `DatePicker` exports)
- `apps/frontend/src/components/filigran-ui/components/clients/DatePicker.tsx`, `clients/Calendar.tsx` (delete)
- No unit test finds these fields. No e2e locator: `service.pageModel.ts` opens the subscription sheet but never
  touches a date, and the sheet stays the last `body > [role="dialog"]` while the calendar is closed.

## Screens

```json
[
  {
    "name": "subscribe-organization-sheet",
    "path": "/app/admin/service",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "role=row[name=/OpenCTI Integrations Library/] >> td:last-child >> role=button" },
      { "click": "role=menuitem[name=\"Manage\"]" },
      { "click": "role=button[name=\"Subscribe organization\"]" },
      { "waitFor": "role=dialog >> text=Start date" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "start-date-calendar-open",
    "path": "/app/admin/service",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "role=row[name=/OpenCTI Integrations Library/] >> td:last-child >> role=button" },
      { "click": "role=menuitem[name=\"Manage\"]" },
      { "click": "role=button[name=\"Subscribe organization\"]" },
      { "waitFor": "role=dialog >> text=Start date" },
      { "click": "role=dialog >> [aria-haspopup=\"dialog\"] >> nth=1" },
      { "waitFor": "role=grid" }
    ]
  }
]
```

## Out of scope

- The legacy `Form`, `MultiSelect`, `Popover`, `Sheet` and `AutoForm` around these fields (items 3706, 3707, …).
- The `react-day-picker` and `date-fns` dependencies, the legacy `theme.css` and the `@filigran/ui` aliases (cleanup 3708).
- Moving `ServiceSlugOrgaForm` off Relay: the change does not touch its data fetching.

## Accessibility and i18n

- The trigger was a button named by the formatted date or `Pick a date`; the field is now a text input named by its
  `<label for>` (`Start date`, `End date (optional)`), with a calendar button named `Open calendar`, and a clear
  button `Clear date` on the end date while it holds a value. The AutoForm date field is named by `aria-label`.
- `error` sets `aria-invalid` and `aria-describedby` on the input.
- No new translation key: the picker's button, panel and select names stay the design system's English defaults, like
  the `Combobox` and `SearchField` controls; month and weekday names follow the app locale.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui src/components/service src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3689-date-picker.md`

## Decisions

- **`Calendar` is deleted with `DatePicker`**: `DatePicker.tsx` is its only importer, and the design system ships no
  standalone calendar (contract: the grid is the library's own).
- **Typed text is new, so its failure is handled**: the legacy trigger could only hold a picked date. The installed
  `DatePicker` (`dist/components/date-picker/DatePicker.mjs`) keeps the typed text when the controlled value turns
  `null`, so mapping `invalidDate` to `undefined` would silently save an optional end date as none. The Invalid Date
  sentinel makes `z.coerce.date()` fail and disables `Validate`; the helpers keep it off the picker's `value`.
- **`clearable` on the end date only**: it is the optional field (RULE-07), and the legacy calendar cleared it by
  clicking the selected day, which the design system grid does not do. The start date is required by the schema.
- **`locale` from `next-intl`**: without it the picker reads the browser locale, which can differ from the user's
  language preference and from the dates shown by `useDateFormatter`.
- **An AutoForm adapter only changes its import**, plus what keeps it from breaking (Input and Select specs): a name
  (`aria-label`, as `AutoFormEnum`), the controlled `value` and the shared change mapping.
- **`AutoFormDate` reads its error with `useFormField()`** (epic review, see 3566): the picker takes `label`,
  `required` and `error`, as `AutoFormInput`.

## To validate

- The date becomes an editable field in the Input shell: the locale's numeric pattern (day, month and year order
  per language) instead of the English `Oct 8, 2026`, the pattern as placeholder instead of `Pick a date`, the calendar icon at the end
  instead of the start, and the design system panel (month and year selects, today and selected-day borders, no
  outside days). Alternative: none without restyling.
- The end date gains a clear button; the start date has none. On the edit sheet it does not remove a stored end
  date (see Deferred findings). Alternative: `clearable` on both, or neither.
- The picker's button and panel names stay in English in every locale while month names follow the locale.
  Alternative: new keys in en, fr and ja for `openCalendarLabel`, `clearLabel`, `previousMonthLabel`,
  `nextMonthLabel`, `monthSelectLabel` and `yearSelectLabel`, in one pass with the `Combobox` and `SearchField` names.

## Deferred findings

- `ServiceSlugOrgaForm` has no unit test: the start and end date wiring, the invalid text error and the submission
  are uncovered; only the helpers are tested.
- A date typed but unparseable disables `Validate` with no message: the form validates on submit only
  (`useForm` without `mode`) and disables its submit button while invalid, so `fieldState.error` never fills before a
  submit. The legacy form already did this for an empty organization or a deselected start date; showing field
  errors means a validation mode for the whole form, or a translated invalid-date message.
- Editing a subscription and clearing its end date keeps the stored one while the toast says success: the form sends
  `end_date: undefined` and `subscription.app.ts` only writes a defined end date. The legacy calendar had the same gap
  through deselecting the day; the clear button makes it visible. The fix needs `null` sent and accepted by the backend.
- Typed text accepts any year from 100 (`10/08/202` saves year 202) and the `en` pattern is month first
  (`08/10/2026` is 10 August); neither field sets a `minDate`. A lower bound or an end-after-start check is form logic
  for a later item.
- `PrivateNavigation.test.tsx` intermittently leaks `ReferenceError: window is not defined`: the 100 ms
  `useDebounceValue` of the closed-menu popover (`NavigationSections.tsx`) can fire after jsdom teardown when the
  file's last hover test ends. The full suite failed on it once and passed on rerun with the same tree. The fix
  (fake timers or waiting for the popover to settle in that test) belongs with the navigation code, not this item.
