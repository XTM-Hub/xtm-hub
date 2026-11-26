import {
  isAnalyticsEnabled,
  subscribeAnalyticsEnabled,
} from '@/lib/analytics/analytics.client';
import { useSyncExternalStore } from 'react';

const getServerSnapshot = (): boolean => false;

export const useAnalyticsEnabled = (): boolean =>
  useSyncExternalStore(
    subscribeAnalyticsEnabled,
    isAnalyticsEnabled,
    getServerSnapshot
  );
