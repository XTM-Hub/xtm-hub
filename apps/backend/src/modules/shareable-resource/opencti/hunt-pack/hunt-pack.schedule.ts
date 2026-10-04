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
const MINUTE_MS = 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * MINUTE_MS;

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

const isDayMatching = (cron: ParsedCron, date: Date) => {
  if (!cron.months.has(date.getUTCMonth() + 1)) {
    return false;
  }
  const dayOfMonthMatch = cron.daysOfMonth.has(date.getUTCDate());
  const dayOfWeekMatch = cron.daysOfWeek.has(date.getUTCDay());
  // When both day fields are restricted, either one matching is enough
  if (cron.dayOfMonthRestricted && cron.dayOfWeekRestricted) {
    return dayOfMonthMatch || dayOfWeekMatch;
  }
  if (cron.dayOfMonthRestricted) {
    return dayOfMonthMatch;
  }
  return !cron.dayOfWeekRestricted || dayOfWeekMatch;
};

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

/** Why OpenCTI would refuse this hunt schedule, or null when it accepts it. */
export const huntScheduleError = (schedule: string): string | null => {
  if (HUNT_SCHEDULE_KEYWORDS.includes(schedule)) {
    return null;
  }
  let cron: ParsedCron;
  try {
    cron = parseCron(schedule);
  } catch (error) {
    return `the schedule is not a valid cron expression: ${(error as Error).message}`;
  }
  // A week of consecutive occurrences catches irregular lists such as 0,5
  let previous = nextOccurrence(cron, new Date(Date.UTC(2024, 0, 1)));
  if (!previous) {
    return 'the schedule never fires';
  }
  const horizon = previous.getTime() + WEEK_MS;
  while (previous.getTime() < horizon) {
    const next: Date | null = nextOccurrence(cron, previous);
    if (!next) {
      return null;
    }
    if (
      (next.getTime() - previous.getTime()) / MINUTE_MS <
      MIN_SCHEDULE_INTERVAL_MINUTES
    ) {
      return `the schedule fires more than once every ${MIN_SCHEDULE_INTERVAL_MINUTES} minutes`;
    }
    previous = next;
  }
  return null;
};
