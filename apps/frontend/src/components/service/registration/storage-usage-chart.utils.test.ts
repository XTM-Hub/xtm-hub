import {
  hasStorageCapacity,
  splitByteSize,
  storageLimitLineValue,
  storageUsageStatus,
} from '@/components/service/registration/storage-usage-chart.utils';
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

describe('storageUsageStatus', () => {
  it.each`
    percent | level            | severity      | colorClass
    ${0}    | ${'Within'}      | ${'low'}      | ${'text-feedback-success-primary'}
    ${50}   | ${'Within'}      | ${'low'}      | ${'text-feedback-success-primary'}
    ${50.1} | ${'Approaching'} | ${'high'}     | ${'text-feedback-warning-primary'}
    ${80}   | ${'Approaching'} | ${'high'}     | ${'text-feedback-warning-primary'}
    ${80.1} | ${'Approaching'} | ${'high'}     | ${'text-feedback-error-primary'}
    ${99.9} | ${'Approaching'} | ${'high'}     | ${'text-feedback-error-primary'}
    ${100}  | ${'Over'}        | ${'critical'} | ${'text-feedback-error-primary'}
    ${120}  | ${'Over'}        | ${'critical'} | ${'text-feedback-error-primary'}
  `(
    'should rate a $percent% storage usage as $level and colour it with $colorClass',
    ({ percent, level, severity, colorClass }) => {
      expect(storageUsageStatus(percent)).toEqual({
        level,
        severity,
        colorClass,
      });
    }
  );
});

describe('hasStorageCapacity', () => {
  it.each`
    case                     | storage             | expected
    ${'the limit is set'}    | ${{ limit: 1_000 }} | ${true}
    ${'the limit is zero'}   | ${{ limit: 0 }}     | ${false}
    ${'the limit is null'}   | ${{ limit: null }}  | ${false}
    ${'there is no storage'} | ${null}             | ${false}
  `('should return $expected when $case', ({ storage, expected }) => {
    expect(hasStorageCapacity(storage)).toBe(expected);
  });
});

describe('storageLimitLineValue', () => {
  it.each`
    case                            | storage                            | expected
    ${'the usage is above 90%'}     | ${{ percent: 90.1, limit: 1_000 }} | ${1_000}
    ${'the usage is over capacity'} | ${{ percent: 120, limit: 1_000 }}  | ${1_000}
    ${'the usage is exactly 90%'}   | ${{ percent: 90, limit: 1_000 }}   | ${null}
    ${'the usage is below 90%'}     | ${{ percent: 50, limit: 1_000 }}   | ${null}
    ${'the percentage is unknown'}  | ${{ percent: null, limit: 1_000 }} | ${null}
    ${'the limit is unknown'}       | ${{ percent: 95, limit: null }}    | ${null}
    ${'the limit is zero'}          | ${{ percent: 95, limit: 0 }}       | ${null}
    ${'there is no storage'}        | ${null}                            | ${null}
  `('should return $expected when $case', ({ storage, expected }) => {
    expect(storageLimitLineValue(storage)).toBe(expected);
  });
});
