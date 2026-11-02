import {
  clearFiltersStorage,
  removeLegacyFiltersLocalStorage,
  USER_LIST_ORGANIZATION_FILTER_KEY,
} from '@/utils/filters-storage.utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORED_VALUE = JSON.stringify({ siem: [] });
const PRIVATE_SERVICE_LIST_KEY = 'labelPrivateOpenCTIIntegrationFeedsList';
const PUBLIC_SERVICE_LIST_KEY = 'searchPublicOpenAEVScenariosList';
const KEPT_KEYS = [
  'orderByUserList',
  'pageSizePrivateOpenCTIIntegrationFeedsList',
];
const FILTER_KEYS = [
  PRIVATE_SERVICE_LIST_KEY,
  PUBLIC_SERVICE_LIST_KEY,
  USER_LIST_ORGANIZATION_FILTER_KEY,
];

describe('filters storage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each`
    cleanup                            | storage                  | storageName
    ${clearFiltersStorage}             | ${window.sessionStorage} | ${'sessionStorage'}
    ${removeLegacyFiltersLocalStorage} | ${window.localStorage}   | ${'localStorage'}
  `(
    'should only remove the filter entries from the $storageName',
    ({ cleanup, storage }: { cleanup: () => void; storage: Storage }) => {
      // Given
      for (const key of [...FILTER_KEYS, ...KEPT_KEYS]) {
        storage.setItem(key, STORED_VALUE);
      }

      // When
      cleanup();

      // Then
      for (const key of FILTER_KEYS) {
        expect(storage.getItem(key)).toBeNull();
      }
      for (const key of KEPT_KEYS) {
        expect(storage.getItem(key)).toBe(STORED_VALUE);
      }
    }
  );

  it.each`
    cleanup                            | storageName
    ${clearFiltersStorage}             | ${'sessionStorage'}
    ${removeLegacyFiltersLocalStorage} | ${'localStorage'}
  `(
    'should not throw when the browser blocks the $storageName',
    ({
      cleanup,
      storageName,
    }: {
      cleanup: () => void;
      storageName: 'sessionStorage' | 'localStorage';
    }) => {
      // Given
      vi.spyOn(window, storageName, 'get').mockImplementation(() => {
        throw new DOMException('Storage is blocked', 'SecurityError');
      });

      // When / Then
      expect(cleanup).not.toThrow();
    }
  );
});
