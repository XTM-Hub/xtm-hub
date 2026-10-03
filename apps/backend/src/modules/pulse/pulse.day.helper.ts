import { PULSE_DAY_PATTERN } from './pulse.const';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseDay = (day: string): Date => new Date(`${day}T00:00:00.000Z`);

const formatDay = (date: Date): string => date.toISOString().slice(0, 10);

// Single time source of the service, replaced in tests to move across days.
export const PulseClock = {
  now: (): Date => new Date(),
};

// Days are UTC calendar days exchanged as YYYY-MM-DD strings; Date objects
// never reach the database so the server timezone cannot shift them.
export const PulseDay = {
  isValid: (value: string): boolean => {
    if (!PULSE_DAY_PATTERN.test(value)) {
      return false;
    }
    const parsed = parseDay(value);
    return !Number.isNaN(parsed.getTime()) && formatDay(parsed) === value;
  },

  today: (now: Date): string => formatDay(now),

  addDays: (day: string, days: number): string =>
    formatDay(new Date(parseDay(day).getTime() + days * MS_PER_DAY)),

  // Calendar months, clamped to the last day of the target month.
  addMonths: (day: string, months: number): string => {
    const date = parseDay(day);
    const targetMonthStart = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
    );
    const lastDayOfTargetMonth = new Date(
      Date.UTC(
        targetMonthStart.getUTCFullYear(),
        targetMonthStart.getUTCMonth() + 1,
        0
      )
    ).getUTCDate();
    targetMonthStart.setUTCDate(
      Math.min(date.getUTCDate(), lastDayOfTargetMonth)
    );
    return formatDay(targetMonthStart);
  },

  // First day still inside the retention period ending on `day`.
  retentionStart: (day: string, retentionMonths: number): string =>
    PulseDay.addMonths(day, -retentionMonths),

  // Only the current UTC day and the previous one are accepted on the wire.
  isAcceptedRequestDay: (day: string, now: Date): boolean => {
    const today = PulseDay.today(now);
    return day === today || day === PulseDay.addDays(today, -1);
  },
};
