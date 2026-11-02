import { IntegrationListUrlFiltersSync } from '@/components/service/integrations/[serviceInstanceId]/IntegrationListUrlFiltersSync';
import { INTEGRATION_TYPE_PARAM } from '@/components/service/integrations/[serviceInstanceId]/integration-list-url-filters.utils';
import { useIntegrationListStorage } from '@/components/service/integrations/[serviceInstanceId]/use-integration-list-storage';
import testRender from '@/utils/test/test-render';
import { IntegrationType } from '@graphql/generated';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const PATHNAME = '/mock';
const INTEGRATION_TYPES_KEY =
  'integrationTypePrivateOpenCTIIntegrationFeedsList';
const SEARCH_KEY = 'searchPrivateOpenCTIIntegrationFeedsList';
const PAGE_SIZE_KEY = 'pageSizePrivateOpenCTIIntegrationFeedsList';
const DISPLAY_MODE_KEY = 'displayModePrivateOpenCTIIntegrationFeedsList';
const SEARCH = JSON.stringify('siem');
const PAGE_SIZE = JSON.stringify(20);
const DISPLAY_MODE = JSON.stringify('list');

describe('IntegrationListUrlFiltersSync', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.history.replaceState({}, '', PATHNAME);
  });

  it('should store the filters of the url when the page loads with filters in the url', () => {
    // Given
    window.history.replaceState(
      {},
      '',
      `${PATHNAME}?${INTEGRATION_TYPE_PARAM}=${IntegrationType.Connector}`
    );

    // When
    testRender(<IntegrationListUrlFiltersSync />);

    // Then
    expect(
      JSON.parse(window.sessionStorage.getItem(INTEGRATION_TYPES_KEY) ?? 'null')
    ).toEqual({ [IntegrationType.Connector]: [] });
  });

  it('should keep the search and display settings when applying the filters of the url', () => {
    // Given
    window.sessionStorage.setItem(SEARCH_KEY, SEARCH);
    window.localStorage.setItem(PAGE_SIZE_KEY, PAGE_SIZE);
    window.localStorage.setItem(DISPLAY_MODE_KEY, DISPLAY_MODE);
    window.history.replaceState(
      {},
      '',
      `${PATHNAME}?${INTEGRATION_TYPE_PARAM}=${IntegrationType.Connector}`
    );

    // When
    testRender(<IntegrationListUrlFiltersSync />);

    // Then
    expect(window.sessionStorage.getItem(SEARCH_KEY)).toBe(SEARCH);
    expect(window.localStorage.getItem(PAGE_SIZE_KEY)).toBe(PAGE_SIZE);
    expect(window.localStorage.getItem(DISPLAY_MODE_KEY)).toBe(DISPLAY_MODE);
  });

  it('should write the filters in the url when a filter changes', () => {
    // Given
    testRender(<IntegrationListUrlFiltersSync />);
    const { result } = renderHook(() => useIntegrationListStorage());

    // When
    act(() => {
      result.current.setIntegrationTypes({ [IntegrationType.Connector]: [] });
    });

    // Then
    expect(window.location.search).toBe(
      `?${INTEGRATION_TYPE_PARAM}=${IntegrationType.Connector}`
    );
  });
});
