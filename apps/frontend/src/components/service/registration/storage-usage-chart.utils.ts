import type { ChipSeverity } from '@filigran/design-system';

// Decimal steps, to match the Intl unit names (a kilobyte is 1000 bytes).
const BYTE_UNITS = [
  'byte',
  'kilobyte',
  'megabyte',
  'gigabyte',
  'terabyte',
  'petabyte',
] as const;
const BYTE_UNIT_STEP = 1000;

export type ByteUnit = (typeof BYTE_UNITS)[number];

export const splitByteSize = (
  bytes: number
): { value: number; unit: ByteUnit } => {
  let value = bytes;
  let unit: ByteUnit = 'byte';
  for (const largerUnit of BYTE_UNITS.slice(1)) {
    if (Math.abs(value) < BYTE_UNIT_STEP) {
      break;
    }
    value /= BYTE_UNIT_STEP;
    unit = largerUnit;
  }
  return { value, unit };
};

const STORAGE_USAGE_WARNING_PERCENT = 50;
// The percentage turns red before the storage is full, ahead of the Over capacity label.
const STORAGE_USAGE_ERROR_COLOR_PERCENT = 80;
const STORAGE_USAGE_OVER_PERCENT = 100;
const STORAGE_LIMIT_LINE_PERCENT = 90; // The red line appears only if the user is above 90 % of usage

export type StorageUsageLevel = 'Within' | 'Approaching' | 'Over';

export interface StorageUsageStatus {
  level: StorageUsageLevel;
  severity: ChipSeverity;
  colorClass: string;
}

const STORAGE_USAGE_SEVERITIES: Record<StorageUsageLevel, ChipSeverity> = {
  Within: 'low',
  Approaching: 'high',
  Over: 'critical',
};

const storageUsageLevel = (percent: number): StorageUsageLevel => {
  if (percent >= STORAGE_USAGE_OVER_PERCENT) {
    return 'Over';
  }
  if (percent > STORAGE_USAGE_WARNING_PERCENT) {
    return 'Approaching';
  }
  return 'Within';
};

const storageUsageColorClass = (percent: number): string => {
  if (percent > STORAGE_USAGE_ERROR_COLOR_PERCENT) {
    return 'text-feedback-error-primary';
  }
  if (percent > STORAGE_USAGE_WARNING_PERCENT) {
    return 'text-feedback-warning-primary';
  }
  return 'text-feedback-success-primary';
};

export const storageUsageStatus = (percent: number): StorageUsageStatus => {
  const level = storageUsageLevel(percent);
  return {
    level,
    severity: STORAGE_USAGE_SEVERITIES[level],
    colorClass: storageUsageColorClass(percent),
  };
};

// A limit of 0 means the SaaS Manager knows no capacity: the usage cannot be measured against it.
export const hasStorageCapacity = <T extends { limit?: number | null }>(
  storage: T | null | undefined
): storage is T & { limit: number } => (storage?.limit ?? 0) > 0;

export const hasStorageUsage = <
  T extends { used?: number | null; limit?: number | null },
>(
  storage: T | null | undefined
): storage is T & { used: number; limit: number } =>
  hasStorageCapacity(storage) && typeof storage.used === 'number';

export const storageLimitLineValue = (
  storage: { percent?: number | null; limit?: number | null } | null | undefined
): number | null =>
  typeof storage?.percent === 'number' &&
  storage.percent > STORAGE_LIMIT_LINE_PERCENT &&
  typeof storage.limit === 'number' &&
  storage.limit > 0
    ? storage.limit
    : null;
