import { describe, expect, it } from 'vitest';
import { huntScheduleError } from './hunt-pack.schedule';

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
});
