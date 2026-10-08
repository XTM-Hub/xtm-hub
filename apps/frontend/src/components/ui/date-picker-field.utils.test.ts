import {
  fromDatePickerChange,
  getDatePickerLabels,
  toDatePickerValue,
} from '@/components/ui/date-picker-field.utils';
import type { useTranslate } from '@/hooks/use-translate';
import { describe, expect, it } from 'vitest';

const VALID_DATE = new Date('2026-10-08T00:00:00.000Z');
const INVALID_DATE = new Date(Number.NaN);
const ISO_DATE_STRING = '2026-10-08T00:00:00.000Z';

describe('toDatePickerValue', () => {
  it('should return the date when the value is a valid date', () => {
    // Given / When
    const result = toDatePickerValue(VALID_DATE);

    // Then
    expect(result).toBe(VALID_DATE);
  });

  it.each([
    { description: 'undefined', value: undefined },
    { description: 'null', value: null },
    { description: 'an Invalid Date', value: INVALID_DATE },
    { description: 'an ISO string', value: ISO_DATE_STRING },
  ])('should return null when the value is $description', ({ value }) => {
    // Given / When
    const result = toDatePickerValue(value);

    // Then
    expect(result).toBeNull();
  });
});

describe('fromDatePickerChange', () => {
  it.each([
    { description: 'a date is picked', validationError: null },
    { description: 'the date is outside a bound', validationError: 'minDate' },
  ] as const)(
    'should return the date when $description',
    ({ validationError }) => {
      // Given / When
      const result = fromDatePickerChange(VALID_DATE, { validationError });

      // Then
      expect(result).toBe(VALID_DATE);
    }
  );

  it('should return undefined when the field is cleared', () => {
    // Given / When
    const result = fromDatePickerChange(null, { validationError: null });

    // Then
    expect(result).toBeUndefined();
  });

  it('should return an Invalid Date when the text does not resolve to a date', () => {
    // Given / When
    const result = fromDatePickerChange(null, {
      validationError: 'invalidDate',
    });

    // Then
    expect(result?.getTime()).toBeNaN();
  });
});

describe('getDatePickerLabels', () => {
  const t = ((key: string, values?: { label?: string }) =>
    values?.label ? `${key}:${values.label}` : key) as unknown as ReturnType<
    typeof useTranslate
  >;

  it('should name every control of the field with its translation', () => {
    // Given / When
    const result = getDatePickerLabels(t);

    // Then
    expect(result).toEqual({
      openCalendarLabel: 'DesignSystem.DatePicker.OpenCalendar',
      clearLabel: 'DesignSystem.DatePicker.Clear',
      calendarLabel: 'DesignSystem.DatePicker.Calendar',
      previousMonthLabel: 'DesignSystem.DatePicker.PreviousMonth',
      nextMonthLabel: 'DesignSystem.DatePicker.NextMonth',
      monthSelectLabel: 'DesignSystem.DatePicker.Month',
      yearSelectLabel: 'DesignSystem.DatePicker.Year',
      hoursLabel: 'DesignSystem.DatePicker.Hours',
      minutesLabel: 'DesignSystem.DatePicker.Minutes',
      secondsLabel: 'DesignSystem.DatePicker.Seconds',
      periodLabel: 'DesignSystem.DatePicker.Period',
      confirmLabel: 'DesignSystem.DatePicker.Confirm',
    });
  });

  it('should name the calendar after the field when the field has a label', () => {
    // Given / When
    const result = getDatePickerLabels(t, 'Start date');

    // Then
    expect(result.calendarLabel).toBe(
      'DesignSystem.DatePicker.FieldCalendar:Start date'
    );
  });
});
