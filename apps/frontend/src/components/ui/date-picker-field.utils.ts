import type { useTranslate } from '@/hooks/use-translate';
import type {
  DatePickerChangeContext,
  DatePickerProps,
} from '@filigran/design-system';

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

type DatePickerLabels = Pick<
  DatePickerProps,
  | 'openCalendarLabel'
  | 'clearLabel'
  | 'calendarLabel'
  | 'previousMonthLabel'
  | 'nextMonthLabel'
  | 'monthSelectLabel'
  | 'yearSelectLabel'
  | 'hoursLabel'
  | 'minutesLabel'
  | 'secondsLabel'
  | 'periodLabel'
  | 'confirmLabel'
>;

// The design system names its own controls in English unless given these.
export const getDatePickerLabels = (
  t: ReturnType<typeof useTranslate>,
  label?: string
): DatePickerLabels => ({
  openCalendarLabel: t('DesignSystem.DatePicker.OpenCalendar'),
  clearLabel: t('DesignSystem.DatePicker.Clear'),
  calendarLabel: label
    ? t('DesignSystem.DatePicker.FieldCalendar', { label })
    : t('DesignSystem.DatePicker.Calendar'),
  previousMonthLabel: t('DesignSystem.DatePicker.PreviousMonth'),
  nextMonthLabel: t('DesignSystem.DatePicker.NextMonth'),
  monthSelectLabel: t('DesignSystem.DatePicker.Month'),
  yearSelectLabel: t('DesignSystem.DatePicker.Year'),
  hoursLabel: t('DesignSystem.DatePicker.Hours'),
  minutesLabel: t('DesignSystem.DatePicker.Minutes'),
  secondsLabel: t('DesignSystem.DatePicker.Seconds'),
  periodLabel: t('DesignSystem.DatePicker.Period'),
  confirmLabel: t('DesignSystem.DatePicker.Confirm'),
});
