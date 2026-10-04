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
