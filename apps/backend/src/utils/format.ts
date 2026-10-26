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
