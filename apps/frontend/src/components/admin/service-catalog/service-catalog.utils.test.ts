import {
  getServiceCatalogTab,
  getServiceCatalogTabPath,
  ServiceCatalogTab,
} from '@/components/admin/service-catalog/service-catalog.utils';
import { describe, expect, it } from 'vitest';

describe('getServiceCatalogTab', () => {
  it.each`
    value                    | expectedTab
    ${'services'}            | ${ServiceCatalogTab.Services}
    ${'solution-categories'} | ${ServiceCatalogTab.SolutionCategories}
    ${'use-cases'}           | ${ServiceCatalogTab.UseCases}
    ${'unknown'}             | ${ServiceCatalogTab.Services}
    ${null}                  | ${ServiceCatalogTab.Services}
  `(
    'should select the $expectedTab tab when the tab parameter is $value',
    ({ value, expectedTab }) => {
      // Given / When
      const tab = getServiceCatalogTab(value);

      // Then
      expect(tab).toBe(expectedTab);
    }
  );
});

describe('getServiceCatalogTabPath', () => {
  it('should point to the service catalog page with the tab parameter', () => {
    // Given / When
    const path = getServiceCatalogTabPath(ServiceCatalogTab.UseCases);

    // Then
    expect(path).toBe('/app/admin/service-catalog?tab=use-cases');
  });
});
