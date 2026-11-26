import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { FilterKey, LogicalOperator } from '@graphql/generated';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLogicalFiltersFromStorage } from './use-logical-filters-from-storage';

describe('useLogicalFiltersFromStorage', () => {
  const labelValue = 'label-a';
  const entityTypeValue = 'Threat-Actor';
  const integrationTypeValue = 'csv_feed';
  const productVersionValue = 'v6.8';
  const trueValue = 'true';
  const solutionCategoryValue = 'ti_ops';
  const licenseTypeValue = 'oss';

  it('should return all integration leaves when service slug is OpenCTI integrations', () => {
    // Given
    const params = {
      serviceInstanceSlug: ServiceSlug.OPEN_CTI_INTEGRATIONS,
      labels: { [labelValue]: [] },
      deployable: { [trueValue]: [] },
      verified: { [trueValue]: [] },
      integrationTypes: { [integrationTypeValue]: [] },
      productVersions: { [productVersionValue]: [] },
      solutionCategories: { [solutionCategoryValue]: [] },
      licenseTypes: { [licenseTypeValue]: [] },
    };

    // When
    const { result } = renderHook(() => useLogicalFiltersFromStorage(params));

    // Then
    expect(result.current).toEqual({
      operator: LogicalOperator.And,
      children: [
        {
          leaf: {
            key: FilterKey.Label,
            value: [labelValue],
          },
        },
        {
          leaf: {
            key: FilterKey.ManagerSupported,
            value: [trueValue],
          },
        },
        {
          leaf: {
            key: FilterKey.Verified,
            value: [trueValue],
          },
        },
        {
          leaf: {
            key: FilterKey.IntegrationType,
            value: [integrationTypeValue],
          },
        },
        {
          leaf: {
            key: FilterKey.ProductVersion,
            value: [productVersionValue],
          },
        },
        {
          leaf: {
            key: FilterKey.SolutionCategory,
            value: [solutionCategoryValue],
          },
        },
        {
          leaf: {
            key: FilterKey.LicenseType,
            value: [licenseTypeValue],
          },
        },
      ],
    });
  });

  it('should keep optional integration leaves empty when no value is provided', () => {
    // Given
    const params = {
      serviceInstanceSlug: ServiceSlug.OPEN_CTI_INTEGRATIONS,
      labels: {},
      deployable: {},
      verified: {},
      integrationTypes: {},
      productVersions: {},
    };

    // When
    const { result } = renderHook(() => useLogicalFiltersFromStorage(params));

    // Then
    expect(result.current.children).toContainEqual({
      leaf: {
        key: FilterKey.SolutionCategory,
        value: [],
      },
    });
    expect(result.current.children).toContainEqual({
      leaf: {
        key: FilterKey.LicenseType,
        value: [],
      },
    });
  });

  it('should include entity type leaf when service slug is not OpenCTI integrations and entity types exist', () => {
    // Given
    const params = {
      serviceInstanceSlug: ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS,
      labels: { [labelValue]: [] },
      entityTypes: { [entityTypeValue]: [] },
    };

    // When
    const { result } = renderHook(() => useLogicalFiltersFromStorage(params));

    // Then
    expect(result.current).toEqual({
      operator: LogicalOperator.And,
      children: [
        {
          leaf: {
            key: FilterKey.Label,
            value: [labelValue],
          },
        },
        {
          leaf: {
            key: FilterKey.EntityType,
            value: [entityTypeValue],
          },
        },
      ],
    });
  });

  it('should not include entity type leaf when service slug is not OpenCTI integrations and entity types are missing', () => {
    // Given
    const params = {
      serviceInstanceSlug: ServiceSlug.OPEN_AEV_SCENARIOS,
      labels: { [labelValue]: [] },
    };

    // When
    const { result } = renderHook(() => useLogicalFiltersFromStorage(params));

    // Then
    expect(result.current).toEqual({
      operator: LogicalOperator.And,
      children: [
        {
          leaf: {
            key: FilterKey.Label,
            value: [labelValue],
          },
        },
      ],
    });
    expect(result.current.children).not.toContainEqual({
      leaf: {
        key: FilterKey.EntityType,
        value: [entityTypeValue],
      },
    });
  });
});
