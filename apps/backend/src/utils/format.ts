export const formatDateCompact = (date: Date): string => {
  const yy = String(date.getUTCFullYear()).slice(2);
  const MM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yy}${MM}${dd}${hh}${mm}${ss}`;
};

/** Normalizes a date string to ISO 8601 in UTC, or null when it is not a parseable date. */
export const toIsoDate = (value: unknown): string | null => {
  if (typeof value !== 'string' || value === '') {
    return null;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};

/**
 * Midnight UTC on the first day of the month of the date, shifted by monthOffset months, as a timestamp. Date.UTC
 * carries a negative or overflowing month over to the year.
 */
export const toUtcMonthStart = (date: Date, monthOffset = 0): number =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1);

/** Midnight UTC on the day of the date, as a timestamp. */
export const toUtcDayStart = (date: Date): number =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

export const toFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** A percentage as a ratio (100 is 1), without the float noise of the division: 99.9 is 0.999, not 0.9990000000000001. */
export const percentToRatio = (percent: number): number =>
  Number((percent / 100).toPrecision(15));

export const formatName = (name: string | undefined | null): string => {
  if (!name) {
    return '';
  }

  return name
    .toLowerCase()
    .trim()
    .replace(
      /(^|[\s-])([a-z])/g,
      (_, separator, letter) => separator + letter.toUpperCase()
    );
};
