import { describe, expect, it } from 'vitest';
import { coverageValuesSchema, MAX_COVERAGE_VALUES } from './CoverageFields';

describe('coverageValuesSchema', () => {
  it('should accept up to the backend maximum of values', () => {
    const values = Array.from(
      { length: MAX_COVERAGE_VALUES },
      (_, index) => `Sector ${index}`
    );

    expect(coverageValuesSchema.safeParse(values).success).toBe(true);
    expect(coverageValuesSchema.safeParse(undefined).success).toBe(true);
  });

  it('should reject more values than the backend accepts', () => {
    const values = Array.from(
      { length: MAX_COVERAGE_VALUES + 1 },
      (_, index) => `Sector ${index}`
    );

    expect(coverageValuesSchema.safeParse(values).success).toBe(false);
  });

  it('should reject a value longer than 128 characters', () => {
    expect(coverageValuesSchema.safeParse(['a'.repeat(128)]).success).toBe(
      true
    );
    expect(coverageValuesSchema.safeParse(['a'.repeat(129)]).success).toBe(
      false
    );
  });
});
