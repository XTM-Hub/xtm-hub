import { ServiceListFilterKey } from '@/components/service/components/header/ServiceListHeader';
import { IntegrationProductVersionFilter } from '@/components/ui/shareable-resource/integration/IntegrationProductVersionFilter';
import { PrivateIntegrationProductVersionFilter } from '@/components/ui/shareable-resource/integration/PrivateIntegrationProductVersionFilter';
import { ServiceListLocalStorageKey } from '@/hooks/use-service-list-local-storage';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { testRenderHook } from '@/utils/test/test-render';
import { usePathname } from 'next/navigation';
import { isValidElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useShareableResourceMapping } from './use-shareable-resource-mapping';

const PUBLIC_PATHNAME = '/cybersecurity-solutions/opencti-integrations';
const PRIVATE_PATHNAME = '/app/service/opencti_integrations/instance-id';
const LABEL_TITLE = 'GenericActions.FilterUseCasesLabel';
const ENTITY_TYPE_TITLE = 'GenericActions.FilterEntityTypesLabel';

const renderMapping = (slug: ServiceSlug) =>
  testRenderHook(() => useShareableResourceMapping(slug)).result.current;

describe('useShareableResourceMapping', () => {
  it.each([
    [
      ServiceSlug.OPEN_CTI_INTEGRATIONS,
      ServiceListLocalStorageKey.OpenCTIIntegrationFeeds,
    ],
    [
      ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS,
      ServiceListLocalStorageKey.OpenCTICustomDashboards,
    ],
    [
      ServiceSlug.OPEN_CTI_CUSTOM_VIEWS,
      ServiceListLocalStorageKey.OpenCTICustomViews,
    ],
    [
      ServiceSlug.OPEN_AEV_SCENARIOS,
      ServiceListLocalStorageKey.OpenAEVScenarios,
    ],
    [
      ServiceSlug.OPEN_CTI_PLAYBOOKS,
      ServiceListLocalStorageKey.OpenCTIPlaybooks,
    ],
  ])(
    'should store the %s list state under the %s local storage key',
    (slug, expectedKey) => {
      // Given / When
      const { localStorageKey } = renderMapping(slug);

      // Then
      expect(localStorageKey).toBe(expectedKey);
    }
  );

  it.each([
    [
      ServiceSlug.OPEN_CTI_INTEGRATIONS,
      {
        [ServiceListFilterKey.ProductVersion]:
          'Service.OpenctiIntegrations.Filter.ProductVersion.Label',
        [ServiceListFilterKey.Label]: LABEL_TITLE,
        [ServiceListFilterKey.IntegrationType]:
          'Service.OpenctiIntegrations.Filter.Type.Label',
        [ServiceListFilterKey.ManagerSupported]:
          'Service.OpenctiIntegrations.Filter.ManagerSupported.Label',
        [ServiceListFilterKey.Verified]:
          'Service.OpenctiIntegrations.Filter.Verified.Label',
        [ServiceListFilterKey.SolutionCategory]:
          'Service.OpenctiIntegrations.Filter.SolutionCategory.Label',
        [ServiceListFilterKey.LicenseType]:
          'Service.OpenctiIntegrations.Filter.LicenseType.Label',
      },
    ],
    [
      ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS,
      { [ServiceListFilterKey.Label]: LABEL_TITLE },
    ],
    [
      ServiceSlug.OPEN_CTI_CUSTOM_VIEWS,
      {
        [ServiceListFilterKey.Label]: LABEL_TITLE,
        [ServiceListFilterKey.EntityType]: ENTITY_TYPE_TITLE,
      },
    ],
    [
      ServiceSlug.OPEN_AEV_SCENARIOS,
      { [ServiceListFilterKey.Label]: LABEL_TITLE },
    ],
    [
      ServiceSlug.OPEN_CTI_PLAYBOOKS,
      { [ServiceListFilterKey.Label]: LABEL_TITLE },
    ],
  ])('should offer the filters of the %s service', (slug, expectedTitles) => {
    // Given / When
    const { filters } = renderMapping(slug);

    // Then
    const titles = Object.fromEntries(
      Object.entries(filters).map(([key, filter]) => [key, filter.title])
    );
    expect(titles).toEqual(expectedTitles);
  });

  it.each([
    ['a public', PUBLIC_PATHNAME, IntegrationProductVersionFilter],
    ['a private', PRIVATE_PATHNAME, PrivateIntegrationProductVersionFilter],
  ])(
    'should offer the matching product version filter when browsing %s page',
    (_context, pathname, expectedFilter) => {
      // Given
      vi.mocked(usePathname).mockReturnValue(pathname);

      // When
      const { filters } = renderMapping(ServiceSlug.OPEN_CTI_INTEGRATIONS);

      // Then
      const { node } = filters[ServiceListFilterKey.ProductVersion]!;
      expect(isValidElement(node) && node.type).toBe(expectedFilter);
    }
  );
});
