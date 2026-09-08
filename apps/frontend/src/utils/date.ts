import { DateTimeFormatOptions, useFormatter } from 'next-intl';
import { useCallback, useMemo } from 'react';

// Define FormatDateStyle as a type instead of an enum
export type FormatDateStyle =
  'DATE_NUMERIC' | 'DATETIME_NUMERIC' | 'DATE_FULL' | 'DATE_MEDIUM';

// Map each variant to its respective DateTime format options
export type DateStyleFunctionMap = {
  [key in FormatDateStyle]: DateTimeFormatOptions;
};

const DATE_STYLE_FORMAT: DateStyleFunctionMap = {
  DATE_NUMERIC: {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  },
  DATETIME_NUMERIC: {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  },
  DATE_FULL: {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  },
  DATE_MEDIUM: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
};

export const daysUntil = (targetDate: Date) => {
  const now = new Date();

  const diffInMs = targetDate.getTime() - now.getTime();

  return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
};

export const useDateFormatter = () => {
  const format = useFormatter();
  const timeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  return useCallback(
    (
      date?: Date | string | null,
      dateStyle: FormatDateStyle = 'DATE_NUMERIC'
    ) => {
      if (!date) {
        return null;
      }

      return format.dateTime(new Date(date), {
        ...DATE_STYLE_FORMAT[dateStyle],
        timeZone,
      });
    },
    [format, timeZone]
  );
};

export const isWithinLastMonths = (
  date: Date | string,
  months: number
): boolean => {
  const threshold = new Date();
  threshold.setMonth(threshold.getMonth() - months);
  return new Date(date) > threshold;
};
