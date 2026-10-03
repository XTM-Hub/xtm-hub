import { describe, expect, it } from 'vitest';
import { PulseDay } from './pulse.day.helper';

const NOW = new Date('2026-10-03T23:59:59.000Z');
const TODAY = '2026-10-03';
const YESTERDAY = '2026-10-02';

describe('pulseDay', () => {
  describe('isValid', () => {
    it.each([
      { value: '2026-10-03', expected: true },
      { value: '2024-02-29', expected: true },
      { value: '2026-02-29', expected: false },
      { value: '2026-13-01', expected: false },
      { value: '2026-1-01', expected: false },
      { value: '2026-10-03T00:00:00Z', expected: false },
      { value: '', expected: false },
    ])('should return $expected for "$value"', ({ value, expected }) => {
      // When
      const result = PulseDay.isValid(value);

      // Then
      expect(result).toBe(expected);
    });
  });

  describe('today', () => {
    it('should return the UTC day whatever the local timezone', () => {
      // When
      const result = PulseDay.today(NOW);

      // Then
      expect(result).toBe(TODAY);
    });
  });

  describe('addDays', () => {
    it.each([
      { day: '2026-10-03', days: -1, expected: '2026-10-02' },
      { day: '2026-03-01', days: -1, expected: '2026-02-28' },
      { day: '2026-12-31', days: 1, expected: '2027-01-01' },
      { day: '2026-10-03', days: -83, expected: '2026-07-12' },
    ])(
      'should move $day by $days days to $expected',
      ({ day, days, expected }) => {
        // When
        const result = PulseDay.addDays(day, days);

        // Then
        expect(result).toBe(expected);
      }
    );
  });

  describe('retentionStart', () => {
    it.each([
      { day: '2026-10-03', months: 13, expected: '2025-09-03' },
      { day: '2026-03-31', months: 1, expected: '2026-02-28' },
      { day: '2024-03-31', months: 1, expected: '2024-02-29' },
      { day: '2026-01-15', months: 120, expected: '2016-01-15' },
    ])(
      'should keep $months months before $day from $expected',
      ({ day, months, expected }) => {
        // When
        const result = PulseDay.retentionStart(day, months);

        // Then
        expect(result).toBe(expected);
      }
    );
  });

  describe('isAcceptedRequestDay', () => {
    it.each([
      { day: TODAY, expected: true },
      { day: YESTERDAY, expected: true },
      { day: '2026-10-01', expected: false },
      { day: '2026-10-04', expected: false },
    ])('should return $expected for $day', ({ day, expected }) => {
      // When
      const result = PulseDay.isAcceptedRequestDay(day, NOW);

      // Then
      expect(result).toBe(expected);
    });
  });
});
