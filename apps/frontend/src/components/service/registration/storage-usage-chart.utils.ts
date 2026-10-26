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
