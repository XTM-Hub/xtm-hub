import {
  PulseEventKind,
  PulseObjectType,
  PulsePrevalenceBucket,
  PulseRegionBucket,
  PulseSectorBucket,
  PulseTrendDirection,
} from '../../__generated__/resolvers-types';

// `k` is the hex at-rest key, `t` the object type: the identity of a key in
// every Pulse table.
export interface PulseKeyRef {
  k: string;
  t: PulseObjectType;
}

export interface PulseLedgerRecord extends PulseKeyRef {
  e: PulseEventKind;
  c: number;
}

export interface PulseAggregateIncrement extends PulseKeyRef {
  p: number;
  created: number;
  sighted: number;
  detected: number;
  hunted: number;
  referenced: number;
}

export interface PulseTotalIncrement {
  t: PulseObjectType;
  e: PulseEventKind;
  c: number;
}

export interface PulsePlatformRecord {
  id: number;
  sector_bucket: PulseSectorBucket;
  region_bucket: PulseRegionBucket;
  first_contribution_day: string;
  last_contribution_day: string;
}

// Distinct platforms per week over the trend series, newest first (week 0 is
// the 7 days ending on the request day), and over the activity window, for the
// network and for the sector of the caller.
export interface PulsePresenceSummary {
  weekly: number[];
  platformsInWindow: number;
  sectorWeekly: number[];
  sectorPlatformsInWindow: number;
}

export interface PulseKeyPresence extends PulseKeyRef, PulsePresenceSummary {}

export interface PulseSeenRange {
  firstSeen: string;
  lastSeen: string;
}

export interface PulseTrendingCount extends PulseKeyRef {
  recent: number;
  prev1: number;
  prev2: number;
}

export interface PulseTrendingSnapshotItem extends PulseKeyRef {
  recent: number;
  baseline: number;
  growth: number;
  prevalence: PulsePrevalenceBucket;
  // Null when no week of the history reaches k: the day stays withheld while
  // the item itself is published.
  firstSeen: string | null;
}

// The rules a trending snapshot was published under: a snapshot is only
// served while they are the ones in force.
export interface PulsePublicationPolicy {
  version: number;
  kThreshold: number;
  // Bounds the history behind first seen days: a snapshot computed under
  // another retention would publish days the current one excludes.
  retentionMonths: number;
}

export interface PulseStoredTrendingSnapshot {
  policy: PulsePublicationPolicy;
  // Data generation the items were computed from (see PulseDataGeneration).
  generation: number;
  items: PulseTrendingSnapshotItem[];
}

export interface PulseDigestCandidate extends PulseKeyRef {
  platformsInWindow: number;
  // Distinct platforms of the recent week and of the baseline weeks, newest first.
  weekly: number[];
}

export interface PulseDigestSnapshotItem extends PulseKeyRef {
  prevalence: PulsePrevalenceBucket;
  trend: PulseTrendDirection;
}

export interface PulseStoredDigestSnapshot {
  policy: PulsePublicationPolicy;
  size: number;
  // Data generation the items were computed from (see PulseDataGeneration).
  generation: number;
  items: PulseDigestSnapshotItem[];
}

// One (type, kind) pair reported over a benchmark period: the caller's events
// (network-wide, and in its current sector only) and the medians of the
// per-platform totals, before k is applied (null for an empty population).
export interface PulseBenchmarkMetricRow {
  objectType: PulseObjectType;
  eventKind: PulseEventKind;
  callerTotal: number;
  callerSectorTotal: number;
  networkMedian: number | null;
  sectorMedian: number | null;
}

export interface PulseBenchmarkMetrics {
  networkPlatforms: number;
  sectorPlatforms: number;
  metrics: PulseBenchmarkMetricRow[];
}

export interface PulseBenchmarkTopItemRow extends PulseKeyRef {
  myCount: number;
  median: number;
}

export interface PulseRateLimitBucket {
  startSeconds: number;
  count: number;
}

export const pulseKeyId = ({ k, t }: PulseKeyRef): string => `${k}:${t}`;
