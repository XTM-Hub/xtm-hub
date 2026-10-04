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
let refreshing: Promise<Map<string, number>> | undefined;

const refresh = async (): Promise<Map<string, number>> => {
  try {
    const ids = await IntegrationCoverageDomain.loadSearchableIntegrationIds();
    const counts = await TelemetryApp.countEventsByDocumentIds(
      TelemetryEventType.DOWNLOAD,
      ids
    );
    snapshot = { counts, loadedAt: Date.now() };
  } catch (error) {
    logApp.warn(
      '[COVERAGE] Unable to load download counts, ranking ties by name',
      { error }
    );
    // A failed load is retried at the next period, not by every search
    snapshot = { counts: snapshot?.counts ?? new Map(), loadedAt: Date.now() };
  }
  return snapshot.counts;
};

export const IntegrationCoveragePopularity = {
  /**
   * Download count of every searchable integration; an integration published
   * since the last load counts 0 until the next one. Stale counts are served
   * while they reload in the background.
   */
  loadDownloadCounts: async (): Promise<Map<string, number>> => {
    const isFresh =
      !!snapshot &&
      Date.now() - snapshot.loadedAt < COVERAGE_DOWNLOAD_COUNTS_REFRESH_MS;
    if (snapshot && isFresh) {
      return snapshot.counts;
    }
    refreshing ??= refresh().finally(() => {
      refreshing = undefined;
    });
    return snapshot ? snapshot.counts : refreshing;
  },

  clear: (): void => {
    snapshot = undefined;
    refreshing = undefined;
  },
};
