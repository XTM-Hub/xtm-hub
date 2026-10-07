import { describe, expect, it, vi } from 'vitest';
import { huntScheduleError, MAX_SCHEDULE_LENGTH } from './hunt-pack.schedule';

describe('huntScheduleError', () => {
  it.each`
    schedule
    ${'manual'}
    ${'standing'}
    ${'@daily'}
    ${'@HOURLY'}
    ${'*/15 * * * *'}
    ${'0,30 9-17 * * MON-FRI'}
    ${'0 0 ? * MON'}
    ${'0 6 1-15 JAN,JUL *'}
    ${'0 0 29 2 *'}
    ${'0 12 * * 7'}
    ${'45 23 * * *'}
    ${'0 0,23 * * *'}
    ${'45 23 * * 0,1'}
  `('accepts $schedule', ({ schedule }) => {
    expect(huntScheduleError(schedule)).toBeNull();
  });

  it.each`
    schedule            | error
    ${'Manual'}         | ${'5 fields'}
    ${'every hour'}     | ${'5 fields'}
    ${'99 99 99 99 99'} | ${'out of range'}
    ${'0 24 * * *'}     | ${'out of range'}
    ${'0 0 * FOO *'}    | ${'invalid value'}
    ${'0 0 10-5 * *'}   | ${'invalid range'}
    ${'*/0 * * * *'}    | ${'invalid step'}
    ${'0 0 1,,2 * *'}   | ${'empty list element'}
    ${'0 0 30 2 *'}     | ${'never fires'}
    ${'*/5 * * * *'}    | ${'more than once every 15 minutes'}
    ${'0,5 * * * *'}    | ${'more than once every 15 minutes'}
  `('refuses $schedule', ({ schedule, error }) => {
    expect(huntScheduleError(schedule)).toContain(error);
  });

  it.each`
    case                                                    | schedule
    ${'a Monday 23:59 followed by the 1st at 00:00'}        | ${'0,59 0,23 1 * MON'}
    ${'the 31st at 23:55 followed by the 1st at 00:00'}     | ${'0,55 0,23 1,31 * *'}
    ${'a Sunday 23:55 then Monday 00:00 (day 7 and day 1)'} | ${'0,55 0,23 * * 7,1'}
  `(
    'refuses $case: the interval is computed over the whole calendar',
    ({ schedule }) => {
      expect(huntScheduleError(schedule)).toContain(
        'more than once every 15 minutes'
      );
    }
  );

  // Day-by-day oracle over 28 years: between 1901 and 2099 the calendar
  // repeats every 28 years, every month starting on every weekday in common
  // and leap years
  const consecutiveDaysByScan = (
    daysOfMonth: string,
    months: string,
    daysOfWeek: string
  ) => {
    const values = (field: string) =>
      field === '*' ? null : new Set(field.split(',').map(Number));
    const [dom, month, dow] = [daysOfMonth, months, daysOfWeek].map(values);
    const matches = (date: Date) => {
      if (month && !month.has(date.getUTCMonth() + 1)) return false;
      const domMatch = !dom || dom.has(date.getUTCDate());
      const dowMatch = !dow || dow.has(date.getUTCDay());
      return dom && dow ? domMatch || dowMatch : domMatch && dowMatch;
    };
    const day = new Date(Date.UTC(2001, 0, 1));
    let matched = false;
    let previous = false;
    for (let index = 0; index < 28 * 366; index += 1) {
      const current = matches(day);
      if (current && previous) return 'consecutive';
      matched ||= current;
      previous = current;
      day.setUTCDate(day.getUTCDate() + 1);
    }
    return matched ? 'apart' : 'never';
  };

  const DAYS_OF_MONTH = [
    '*',
    '1',
    '15',
    '29',
    '30',
    '31',
    '1,31',
    '28,29',
    '1,30',
    '1,28',
  ];
  const MONTHS = ['*', '2', '2,3', '1,12', '4,5', '12', '1'];
  const DAYS_OF_WEEK = ['*', '1', '0,1', '1,6', '5'];

  it('tells consecutive matching days exactly as a day-by-day scan', () => {
    const mismatches: string[] = [];
    for (const daysOfMonth of DAYS_OF_MONTH) {
      for (const months of MONTHS) {
        for (const daysOfWeek of DAYS_OF_WEEK) {
          // 23:55 and 00:00 are 5 minutes apart only on consecutive days
          const schedule = `0,55 0,23 ${daysOfMonth} ${months} ${daysOfWeek}`;
          const expected = {
            consecutive: 'more than once every 15 minutes',
            apart: null,
            never: 'never fires',
          }[consecutiveDaysByScan(daysOfMonth, months, daysOfWeek)];
          const error = huntScheduleError(schedule);
          const agrees =
            expected === null ? error === null : !!error?.includes(expected);
          if (!agrees) {
            mismatches.push(`${schedule}: ${error} instead of ${expected}`);
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('accepts a schedule that lists every hour, day, month and weekday', () => {
    const list = (min: number, max: number) =>
      Array.from({ length: max - min + 1 }, (_, index) => min + index).join(
        ','
      );
    const schedule = `0,15,30,45 ${list(0, 23)} ${list(1, 31)} ${list(1, 12)} ${list(0, 7)}`;

    expect(schedule.length).toBeLessThanOrEqual(MAX_SCHEDULE_LENGTH);
    expect(huntScheduleError(schedule)).toBeNull();
  });

  it('refuses a schedule of millions of entries before splitting it', () => {
    const schedule = `${'0,'.repeat(2_000_000)}0 * * * *`;
    const split = vi.spyOn(String.prototype, 'split');

    const error = huntScheduleError(schedule);
    const splitCalls = split.mock.calls.length;
    split.mockRestore();

    expect(splitCalls).toBe(0);
    expect(error).toContain(`exceeds ${MAX_SCHEDULE_LENGTH} characters`);
  });
});
