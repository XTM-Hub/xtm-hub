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

// Bit i of the masks is set when the platform contributed during week i,
// week 0 being the 7 days ending on the request day.
export interface PulsePresence {
  weeks: number;
  inWindow: boolean;
  sectorWeeks: number;
  sectorInWindow: boolean;
}

export interface PulseKeyPresence extends PulseKeyRef, PulsePresence {}

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
  firstSeen: string;
}

// The rules a trending snapshot was published under: a snapshot is only
// served while they are the ones in force.
export interface PulsePublicationPolicy {
  version: number;
  kThreshold: number;
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

export interface PulsePlatformTotal {
  platform: number;
  objectType: PulseObjectType;
  eventKind: PulseEventKind;
  total: number;
  sectorTotal: number;
  inSector: boolean;
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
