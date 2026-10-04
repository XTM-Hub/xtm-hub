import { logApp } from '../../../../../utils/app-logger.util';
import { TelemetryApp } from '../../../../telemetry/telemetry.app';
import { TelemetryEventType } from '../../../../telemetry/telemetry.types';
import { IntegrationCoverageDomain } from './integration-coverage.domain';

/**
 * How long the download counts that order score ties are reused. Coverage
 * searches without facets are not rate limited (the OpenCTI collection gaps
 * call them), so a search never aggregates the telemetry itself: the counts
 * of the whole catalog are loaded at most once per period and API node.
 */
export const COVERAGE_DOWNLOAD_COUNTS_REFRESH_MS = 10 * 60 * 1000;

let snapshot: { counts: Map<string, number>; loadedAt: number } | undefined;
let refreshing: Promise<void> | undefined;
// A load started before a clear never stores its counts after it
let generation = 0;

const refresh = async (): Promise<void> => {
  const startedGeneration = generation;
  let next: { counts: Map<string, number>; loadedAt: number };
  try {
    const ids = await IntegrationCoverageDomain.loadSearchableIntegrationIds();
    const counts = await TelemetryApp.countEventsByDocumentIds(
      TelemetryEventType.DOWNLOAD,
      ids
    );
    next = { counts, loadedAt: Date.now() };
  } catch (error) {
    logApp.warn(
      '[COVERAGE] Unable to load download counts, ranking ties by name',
      { error }
    );
    // A failed load is retried at the next period, not by every search
    next = { counts: snapshot?.counts ?? new Map(), loadedAt: Date.now() };
  }
  if (startedGeneration === generation) {
    snapshot = next;
  }
};

export const IntegrationCoveragePopularity = {
  /**
   * Download count of every searchable integration; an integration published
   * since the last load counts 0 until the next one. A search never waits for
   * the telemetry: the counts load in the background, stale ones are served
   * meanwhile, and before the first load completes every count is 0 (ties are
   * then ordered by name).
   */
  loadDownloadCounts: async (): Promise<Map<string, number>> => {
    const isFresh =
      !!snapshot &&
      Date.now() - snapshot.loadedAt < COVERAGE_DOWNLOAD_COUNTS_REFRESH_MS;
    if (snapshot && isFresh) {
      return snapshot.counts;
    }
    if (!refreshing) {
      const current: Promise<void> = refresh().finally(() => {
        if (refreshing === current) {
          refreshing = undefined;
        }
      });
      refreshing = current;
    }
    return snapshot ? snapshot.counts : new Map();
  },

  /** Resolves once the background load in progress, if any, completed. */
  waitForRefresh: async (): Promise<void> => {
    await refreshing;
  },

  clear: (): void => {
    generation += 1;
    snapshot = undefined;
    refreshing = undefined;
  },
};
