import type { DatePickerChangeContext } from '@filigran/design-system';

export const toDatePickerValue = (value: unknown): Date | null =>
  value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;

// Unparseable text must fail the form's date validation instead of being saved as no date.
export const fromDatePickerChange = (
  date: Date | null,
  context: DatePickerChangeContext
): Date | undefined =>
  context.validationError === 'invalidDate'
    ? new Date(Number.NaN)
    : (date ?? undefined);
