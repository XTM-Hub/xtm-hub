import type { ChipSeverity } from '@filigran/design-system';
import { SaasPlatformSla } from '@graphql/generated';

// The SaaS Manager sends the availability as a ratio: 1 is 100 %.
export const SLA_PERCENT_FORMAT = {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

// A percent shows two more digits of the ratio than its own fraction digits.
const SLA_RATIO_SCALE = 10 ** (SLA_PERCENT_FORMAT.maximumFractionDigits + 2);

export type SlaStatus = 'Met' | 'Missed' | 'Unknown';

export const SLA_STATUS_CLASS: Record<SlaStatus, string> = {
  Met: 'bg-feedback-success-primary',
  Missed: 'bg-feedback-alert-primary',
  Unknown: 'bg-feedback-neutral-primary',
};

export const SLA_STATUS_CHIP_SEVERITY: Record<SlaStatus, ChipSeverity> = {
  Met: 'low',
  Missed: 'medium',
  Unknown: 'neutral',
};

export interface SlaDay {
  date: Date;
  availability: number | null;
  status: SlaStatus;
}

export interface SlaMonth {
  start: Date;
  availability: number | null;
  status: SlaStatus;
  isCurrent: boolean;
  days: SlaDay[];
}

// Rated on the value as displayed, in integers to avoid float noise: 99.975 % shows as 99.98 % and meets it.
export const slaStatus = (
  availability: number | null,
  target: number
): SlaStatus => {
  if (availability === null) {
    return 'Unknown';
  }
  return Math.round(availability * SLA_RATIO_SCALE) >=
    Math.round(target * SLA_RATIO_SCALE)
    ? 'Met'
    : 'Missed';
};

// The backend owns the grid: its last month is the current one.
export const toSlaMonths = ({ target, months }: SaasPlatformSla): SlaMonth[] =>
  months.map(({ month, availability, days }, index) => ({
    start: new Date(month),
    availability,
    status: slaStatus(availability, target),
    isCurrent: index === months.length - 1,
    days: days.map((day) => ({
      date: new Date(day.day),
      availability: day.availability,
      status: slaStatus(day.availability, target),
    })),
  }));
