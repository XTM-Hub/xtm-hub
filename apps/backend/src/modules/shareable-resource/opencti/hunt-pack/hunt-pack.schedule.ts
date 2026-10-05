// Same rules as the hunt schedule validation of OpenCTI: manual, standing, or
// a 5-field cron expression evaluated in UTC that fires, and never more often
// than the minimum interval (the OpenCTI default, a platform may change it).
const HUNT_SCHEDULE_KEYWORDS = ['manual', 'standing'];
const MIN_SCHEDULE_INTERVAL_MINUTES = 15;
const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};
const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
// A schedule repeats at least once a year: 5 years of days bound the search
const MAX_SEARCH_DAYS = 366 * 5;
// Listing every value of every field takes about 360 characters: a longer
// schedule is refused before it is split.
export const MAX_SCHEDULE_LENGTH = 512;
const DAY_MINUTES = 24 * 60;
// Lengths of the months, February in common and leap years
const MONTH_LENGTHS = [
  [31],
  [28, 29],
  [31],
  [30],
  [31],
  [30],
  [31],
  [31],
  [30],
  [31],
  [30],
  [31],
];

interface FieldSpec {
  min: number;
  max: number;
  names?: string[];
  namesOffset?: number;
}

const FIELDS: FieldSpec[] = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12, names: MONTH_NAMES, namesOffset: 1 },
  { min: 0, max: 7, names: DAY_NAMES, namesOffset: 0 },
];

interface ParsedField {
  values: Set<number>;
  restricted: boolean;
}

interface ParsedCron {
  minutes: number[];
  hours: number[];
  daysOfMonth: Set<number>;
  months: Set<number>;
  daysOfWeek: Set<number>;
  dayOfMonthRestricted: boolean;
  dayOfWeekRestricted: boolean;
}

const parseValue = (raw: string, spec: FieldSpec): number => {
  const nameIndex = spec.names?.indexOf(raw.toUpperCase()) ?? -1;
  if (nameIndex >= 0) {
    return nameIndex + (spec.namesOffset ?? 0);
  }
  if (!/^\d+$/.test(raw)) {
    throw new Error(`invalid value "${raw}"`);
  }
  const value = Number(raw);
  if (value < spec.min || value > spec.max) {
    throw new Error(`value ${value} out of range ${spec.min}-${spec.max}`);
  }
  return value;
};

const parseRange = (
  rangePart: string,
  hasStep: boolean,
  spec: FieldSpec
): [number, number] => {
  if (rangePart === '*' || rangePart === '?') {
    return [spec.min, spec.max];
  }
  if (!rangePart.includes('-')) {
    const start = parseValue(rangePart, spec);
    return [start, hasStep ? spec.max : start];
  }
  const bounds = rangePart.split('-');
  if (bounds.length !== 2) {
    throw new Error(`invalid range "${rangePart}"`);
  }
  const start = parseValue(bounds[0] ?? '', spec);
  const end = parseValue(bounds[1] ?? '', spec);
  if (start > end) {
    throw new Error(`invalid range "${rangePart}"`);
  }
  return [start, end];
};

const parseField = (field: string, spec: FieldSpec): ParsedField => {
  const values = new Set<number>();
  for (const part of field.split(',')) {
    if (part.length === 0) {
      throw new Error('empty list element');
    }
    const [rangePart = '', stepPart, ...rest] = part.split('/');
    if (
      rest.length > 0 ||
      (stepPart !== undefined &&
        (!/^\d+$/.test(stepPart) || Number(stepPart) === 0))
    ) {
      throw new Error(`invalid step in "${part}"`);
    }
    const step = stepPart === undefined ? 1 : Number(stepPart);
    const [start, end] = parseRange(rangePart, stepPart !== undefined, spec);
    for (let value = start; value <= end; value += step) {
      values.add(value);
    }
  }
  return { values, restricted: field !== '*' && field !== '?' };
};

const parseCron = (expression: string): ParsedCron => {
  const normalized =
    MACROS[expression.trim().toLowerCase()] ?? expression.trim();
  const parts = normalized.split(/\s+/);
  if (parts.length !== FIELDS.length) {
    throw new Error('a cron expression has 5 fields');
  }
  const [minutes, hours, daysOfMonth, months, daysOfWeek] = FIELDS.map(
    (spec, index) => {
      try {
        return parseField(parts[index] ?? '', spec);
      } catch (error) {
        throw new Error(`field ${index + 1}: ${(error as Error).message}`, {
          cause: error,
        });
      }
    }
  );
  if (!minutes || !hours || !daysOfMonth || !months || !daysOfWeek) {
    throw new Error('a cron expression has 5 fields');
  }
  const sorted = (values: Set<number>) =>
    Array.from(values).sort((a, b) => a - b);
  return {
    minutes: sorted(minutes.values),
    hours: sorted(hours.values),
    daysOfMonth: daysOfMonth.values,
    months: months.values,
    daysOfWeek: new Set(Array.from(daysOfWeek.values, (day) => day % 7)),
    dayOfMonthRestricted: daysOfMonth.restricted,
    dayOfWeekRestricted: daysOfWeek.restricted,
  };
};

const matchesDay = (
  cron: ParsedCron,
  month: number,
  dayOfMonth: number,
  dayOfWeek: number
) => {
  if (!cron.months.has(month)) {
    return false;
  }
  const dayOfMonthMatch = cron.daysOfMonth.has(dayOfMonth);
  const dayOfWeekMatch = cron.daysOfWeek.has(dayOfWeek);
  // When both day fields are restricted, either one matching is enough
  if (cron.dayOfMonthRestricted && cron.dayOfWeekRestricted) {
    return dayOfMonthMatch || dayOfWeekMatch;
  }
  if (cron.dayOfMonthRestricted) {
    return dayOfMonthMatch;
  }
  return !cron.dayOfWeekRestricted || dayOfWeekMatch;
};

const isDayMatching = (cron: ParsedCron, date: Date) =>
  matchesDay(cron, date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCDay());

const nextOccurrence = (cron: ParsedCron, after: Date): Date | null => {
  const start = new Date(after.getTime());
  start.setUTCSeconds(0, 0);
  start.setUTCMinutes(start.getUTCMinutes() + 1);
  const day = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  );
  for (let dayIndex = 0; dayIndex < MAX_SEARCH_DAYS; dayIndex += 1) {
    if (isDayMatching(cron, day)) {
      for (const hour of cron.hours) {
        for (const minute of cron.minutes) {
          const occurrence = new Date(day.getTime());
          occurrence.setUTCHours(hour, minute);
          if (occurrence.getTime() >= start.getTime()) {
            return occurrence;
          }
        }
      }
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return null;
};

// Whether two consecutive days can both match. Over the 400-year Gregorian
// cycle every month starts on every day of the week, February in common and
// leap years alike, so each month, length and first weekday is tried once:
// at most about 5,000 comparisons, whatever the schedule.
const hasConsecutiveMatchingDays = (cron: ParsedCron): boolean => {
  for (let month = 1; month <= 12; month += 1) {
    if (cron.months.has(month)) {
      const nextMonth = (month % 12) + 1;
      for (const length of MONTH_LENGTHS[month - 1] ?? []) {
        for (let firstWeekday = 0; firstWeekday < 7; firstWeekday += 1) {
          const weekday = (day: number) => (firstWeekday + day - 1) % 7;
          for (let day = 1; day < length; day += 1) {
            if (
              matchesDay(cron, month, day, weekday(day)) &&
              matchesDay(cron, month, day + 1, weekday(day + 1))
            ) {
              return true;
            }
          }
          if (
            matchesDay(cron, month, length, weekday(length)) &&
            matchesDay(cron, nextMonth, 1, weekday(length + 1))
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
};

// Whether two occurrences can be closer than the minimum interval, over the
// whole recurrence like OpenCTI: two times of a day, or the last time of a
// day and the first time of the next one. Matching days further apart are at
// least a day and a minute apart, so only consecutive days matter.
const firesMoreOftenThanTheMinimum = (cron: ParsedCron): boolean => {
  const times = cron.hours.flatMap((hour) =>
    cron.minutes.map((minute) => hour * 60 + minute)
  );
  for (let index = 1; index < times.length; index += 1) {
    if (
      (times[index] ?? 0) - (times[index - 1] ?? 0) <
      MIN_SCHEDULE_INTERVAL_MINUTES
    ) {
      return true;
    }
  }
  const first = times[0];
  const last = times[times.length - 1];
  if (first === undefined || last === undefined) {
    return false;
  }
  return (
    DAY_MINUTES - last + first < MIN_SCHEDULE_INTERVAL_MINUTES &&
    hasConsecutiveMatchingDays(cron)
  );
};

/** Why OpenCTI would refuse this hunt schedule, or null when it accepts it. */
export const huntScheduleError = (schedule: string): string | null => {
  if (HUNT_SCHEDULE_KEYWORDS.includes(schedule)) {
    return null;
  }
  if (schedule.length > MAX_SCHEDULE_LENGTH) {
    return `the schedule is not a valid cron expression: it exceeds ${MAX_SCHEDULE_LENGTH} characters`;
  }
  let cron: ParsedCron;
  try {
    cron = parseCron(schedule);
  } catch (error) {
    return `the schedule is not a valid cron expression: ${(error as Error).message}`;
  }
  if (!nextOccurrence(cron, new Date(Date.UTC(2024, 0, 1)))) {
    return 'the schedule never fires';
  }
  if (firesMoreOftenThanTheMinimum(cron)) {
    return `the schedule fires more than once every ${MIN_SCHEDULE_INTERVAL_MINUTES} minutes`;
  }
  return null;
};
