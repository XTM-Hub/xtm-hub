import {
  ServiceListFilterKey,
  ServiceListFilterMap,
} from '@/components/service/components/header/ServiceListHeader';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ServiceListFilterSection } from './ServiceListFilterSection';

const mocks = vi.hoisted(() => ({
  selectedFilters: [] as ServiceListFilterKey[],
}));

vi.mock('@/hooks/use-service-list-filters', () => ({
  useServiceListFilters: () => ({
    selectedFilters: mocks.selectedFilters,
  }),
}));

const buildFilters = (keys: ServiceListFilterKey[]): ServiceListFilterMap => {
  const filters: ServiceListFilterMap = {};
  for (const key of keys) {
    filters[key] = { node: <span>{key}</span>, reset: vi.fn() };
  }
  return filters;
};

describe('ServiceListFilterSection', () => {
  it('renders no AND separator for a single visible filter', () => {
    mocks.selectedFilters = [ServiceListFilterKey.IntegrationType];

    testRender(
      <ServiceListFilterSection
        filters={buildFilters([ServiceListFilterKey.IntegrationType])}
      />
    );

    expect(
      screen.getByText(ServiceListFilterKey.IntegrationType)
    ).toBeInTheDocument();
    expect(screen.queryByText('Utils.And')).not.toBeInTheDocument();
  });

  it('renders one AND separator between two visible filters', () => {
    mocks.selectedFilters = [
      ServiceListFilterKey.IntegrationType,
      ServiceListFilterKey.Verified,
    ];

    testRender(
      <ServiceListFilterSection
        filters={buildFilters([
          ServiceListFilterKey.IntegrationType,
          ServiceListFilterKey.Verified,
        ])}
      />
    );

    expect(screen.getAllByText('Utils.And')).toHaveLength(1);
  });

  it('does not render an orphaned AND separator when a selected filter key has no matching entry in the filter map', () => {
    // Reproduces the DecouplingConnectors scenario: "product_version" stays
    // selected in storage, but the current filter map only exposes
    // "opencti_version" in its place.
    mocks.selectedFilters = [
      ServiceListFilterKey.ProductVersion,
      ServiceListFilterKey.IntegrationType,
    ];

    testRender(
      <ServiceListFilterSection
        filters={buildFilters([ServiceListFilterKey.IntegrationType])}
      />
    );

    expect(
      screen.getByText(ServiceListFilterKey.IntegrationType)
    ).toBeInTheDocument();
    expect(screen.queryByText('Utils.And')).not.toBeInTheDocument();
  });
});
