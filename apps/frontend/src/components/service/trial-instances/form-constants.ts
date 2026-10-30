import {
  DeploymentRequestPlatformRegion,
  DeploymentRequestUseCase,
  PlatformIdentifier,
} from '@graphql/generated';

export const REGIONS_VALUES = Object.values(DeploymentRequestPlatformRegion);
export const REGIONS = Object.values(DeploymentRequestPlatformRegion).map(
  (region) => ({
    value: region,
    label: region.toUpperCase(),
  })
);

export const USE_CASES_BY_PLATFORM_IDENTIFIER: Record<
  PlatformIdentifier,
  DeploymentRequestUseCase[]
> = {
  [PlatformIdentifier.Openaev]: Object.values(DeploymentRequestUseCase).filter(
    (v) => v.startsWith('oaev_')
  ),
  [PlatformIdentifier.Opencti]: Object.values(DeploymentRequestUseCase).filter(
    (v) => !v.startsWith('oaev_')
  ),
  [PlatformIdentifier.Xtmone]: [],
};

export const XTM_PLATFORM_TRIAL_PRODUCTS = [
  PlatformIdentifier.Xtmone,
  PlatformIdentifier.Opencti,
  PlatformIdentifier.Openaev,
];

// XTM One is part of every trial but has no use case to collect
export const PRODUCTS_WITH_USE_CASE = XTM_PLATFORM_TRIAL_PRODUCTS.filter(
  (platformIdentifier) =>
    USE_CASES_BY_PLATFORM_IDENTIFIER[platformIdentifier].length > 0
);
