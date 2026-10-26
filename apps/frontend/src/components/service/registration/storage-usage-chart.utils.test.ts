import { splitByteSize } from '@/components/service/registration/storage-usage-chart.utils';
import { describe, expect, it } from 'vitest';

describe('splitByteSize', () => {
  it.each`
    bytes                | value    | unit
    ${0}                 | ${0}     | ${'byte'}
    ${999}               | ${999}   | ${'byte'}
    ${1_000}             | ${1}     | ${'kilobyte'}
    ${1_500_000}         | ${1.5}   | ${'megabyte'}
    ${12_300_000_000}    | ${12.3}  | ${'gigabyte'}
    ${4_000_000_000_000} | ${4}     | ${'terabyte'}
    ${2e18}              | ${2_000} | ${'petabyte'}
  `('should express $bytes bytes as $value $unit', ({ bytes, value, unit }) => {
    const result = splitByteSize(bytes);

    expect(result.unit).toBe(unit);
    expect(result.value).toBeCloseTo(value);
  });
});
