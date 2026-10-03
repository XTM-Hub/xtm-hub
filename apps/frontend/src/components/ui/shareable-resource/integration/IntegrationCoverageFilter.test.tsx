import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  buildCoverageOptions,
  IntegrationCoverageFilter,
} from './IntegrationCoverageFilter';

const setObjectTypesMock = vi.fn();
const setSectorsMock = vi.fn();
const setRegionsMock = vi.fn();

vi.mock('@/hooks/use-service-list-local-storage', () => ({
  ServiceListLocalStorageKey: {
    OpenCTIIntegrationFeeds: 'feeds',
  },
  useServiceListLocalStorage: () => ({
    objectTypes: {},
    setObjectTypes: setObjectTypesMock,
    sectors: { Energy: [] },
    setSectors: setSectorsMock,
    regions: {},
    setRegions: setRegionsMock,
  }),
}));

describe('buildCoverageOptions', () => {
  it('should list the facet values and the current selection, sorted and deduplicated', () => {
    // Given / When
    const options = buildCoverageOptions({ Malware: 3, Indicator: 5 }, [
      'Vulnerability',
      'Malware',
    ]);

    // Then
    expect(options).toEqual([
      { label: 'Indicator', value: 'Indicator' },
      { label: 'Malware', value: 'Malware' },
      { label: 'Vulnerability', value: 'Vulnerability' },
    ]);
  });

  it('should be empty without facets nor selection', () => {
    expect(buildCoverageOptions(undefined, [])).toEqual([]);
  });
});

describe('IntegrationCoverageFilter', () => {
  it('renders the covered object types of the matched population', () => {
    // Given / When
    testRender(
      <IntegrationCoverageFilter
        family="objectType"
        facetCounts={{ Malware: 2, Indicator: 4 }}
      />
    );

    // Then
    expect(
      screen.getByText('Service.OpenctiIntegrations.Filter.ObjectType.Label')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /Malware/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /Indicator/ })
    ).toBeInTheDocument();
  });

  it('keeps a selected sector listed even when it left the facets', () => {
    // Given / When
    testRender(
      <IntegrationCoverageFilter
        family="sector"
        facetCounts={{ Finance: 1 }}
      />
    );

    // Then
    expect(
      screen.getByRole('checkbox', { name: /Energy/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /Finance/ })
    ).toBeInTheDocument();
  });

  it('updates the region selection', async () => {
    // Given
    const { user } = testRender(
      <IntegrationCoverageFilter
        family="region"
        facetCounts={{ France: 1 }}
      />
    );

    // When
    await user.click(screen.getByRole('checkbox', { name: /France/ }));

    // Then
    expect(setRegionsMock).toHaveBeenCalledWith({ France: [] });
    expect(setSectorsMock).not.toHaveBeenCalled();
  });
});
