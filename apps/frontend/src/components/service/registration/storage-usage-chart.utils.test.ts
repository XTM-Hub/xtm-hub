import {
  hasStorageCapacity,
  hasStorageUsage,
  splitByteSize,
  storageLimitLineValue,
  storageUsageStatus,
} from '@/components/service/registration/storage-usage-chart.utils';
import { describe, expect, it } from 'vitest';

describe('splitByteSize', () => {
  it.each`
    bytes                 | value    | unit
    ${0}                  | ${0}     | ${'Byte'}
    ${1_023}              | ${1_023} | ${'Byte'}
    ${1_024}              | ${1}     | ${'Kibibyte'}
    ${1_572_864}          | ${1.5}   | ${'Mebibyte'}
    ${13_207_024_435}     | ${12.3}  | ${'Gibibyte'}
    ${4 * 1_024 ** 4}     | ${4}     | ${'Tebibyte'}
    ${2_000 * 1_024 ** 5} | ${2_000} | ${'Pebibyte'}
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

describe('hasStorageUsage', () => {
  it.each`
    case                         | storage                         | expected
    ${'the usage is measurable'} | ${{ used: 500, limit: 1_000 }}  | ${true}
    ${'nothing is used yet'}     | ${{ used: 0, limit: 1_000 }}    | ${true}
    ${'the usage is unknown'}    | ${{ used: null, limit: 1_000 }} | ${false}
    ${'the limit is zero'}       | ${{ used: 500, limit: 0 }}      | ${false}
    ${'there is no storage'}     | ${null}                         | ${false}
  `('should return $expected when $case', ({ storage, expected }) => {
    expect(hasStorageUsage(storage)).toBe(expected);
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
