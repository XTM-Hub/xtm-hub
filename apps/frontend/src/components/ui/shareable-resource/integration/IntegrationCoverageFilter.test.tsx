import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  buildCoverageOptionCounts,
  buildCoverageOptions,
  createSeenCoverageValues,
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

  it('should merge values differing only by case, spelled as selected, with the facet count', () => {
    // Given / When
    const options = buildCoverageOptions({ Finance: 4, Energy: 1 }, [
      'finance',
    ]);
    const counts = buildCoverageOptionCounts(
      { Finance: 4, Energy: 1 },
      options
    );

    // Then
    expect(options).toEqual([
      { label: 'Energy', value: 'Energy' },
      { label: 'finance', value: 'finance' },
    ]);
    expect(counts).toEqual({ Energy: 1, finance: 4 });
    expect(buildCoverageOptionCounts(undefined, options)).toBeUndefined();
  });

  it('should show labels sorted by label, keeping the keys as values', () => {
    // Given / When
    const labels: Record<string, string> = {
      'IPv4-Addr': 'IPv4 address',
      'Attack-Pattern': 'Attack pattern',
      Url: 'URL',
    };
    const options = buildCoverageOptions(
      { Url: 1, 'IPv4-Addr': 2, 'Attack-Pattern': 3 },
      [],
      [],
      (value) => labels[value] ?? value
    );

    // Then
    expect(options).toEqual([
      { label: 'Attack pattern', value: 'Attack-Pattern' },
      { label: 'IPv4 address', value: 'IPv4-Addr' },
      { label: 'URL', value: 'Url' },
    ]);
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

  it('keeps a value the filters leave without integration listed, with a zero count and disabled', () => {
    // Given
    const { rerender } = testRender(
      <IntegrationCoverageFilter
        family="region"
        facetCounts={{ France: 1, Germany: 2 }}
      />
    );

    // When
    rerender(
      <IntegrationCoverageFilter
        family="region"
        facetCounts={{ France: 1 }}
      />
    );

    // Then
    expect(screen.getByRole('checkbox', { name: /Germany/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /France/ })).toBeEnabled();
  });

  it('keeps a value seen before its filter section was closed and reopened', () => {
    // Given - on one list page, the section shows Germany, then closes (the filter unmounts)
    const pageSeenValues = createSeenCoverageValues();
    const { unmount } = testRender(
      <IntegrationCoverageFilter
        family="region"
        facetCounts={{ France: 1, Germany: 2 }}
        seenValues={pageSeenValues}
      />
    );
    unmount();

    // When - another filter removed Germany from the facets, and the section opens again
    testRender(
      <IntegrationCoverageFilter
        family="region"
        facetCounts={{ France: 1 }}
        seenValues={pageSeenValues}
      />
    );

    // Then
    expect(screen.getByRole('checkbox', { name: /Germany/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /France/ })).toBeEnabled();
  });

  it('keeps a selected value enabled even without integration, so it can be unselected', () => {
    // Given / When
    testRender(
      <IntegrationCoverageFilter
        family="sector"
        facetCounts={{ Finance: 1 }}
      />
    );

    // Then
    expect(screen.getByRole('checkbox', { name: /Energy/ })).toBeEnabled();
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
