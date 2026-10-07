import { LogicalMultiSelectSelection } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import {
  DocumentMetadataKeyCode,
  FilterKey,
  LogicalOperator,
} from '@graphql/generated';
import { useMemo } from 'react';

type SimpleFiltersParams = {
  serviceInstanceSlug:
    | ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS
    | ServiceSlug.OPEN_AEV_SCENARIOS
    | ServiceSlug.OPEN_CTI_PLAYBOOKS
    | ServiceSlug.OPEN_CTI_HUNT_PACKS
    | ServiceSlug.OPEN_CTI_CUSTOM_VIEWS;
  labels: LogicalMultiSelectSelection;
  entityTypes?: LogicalMultiSelectSelection;
};

type IntegrationFiltersParams = {
  serviceInstanceSlug: ServiceSlug.OPEN_CTI_INTEGRATIONS;
  labels: LogicalMultiSelectSelection;
  deployable: LogicalMultiSelectSelection;
  verified: LogicalMultiSelectSelection;
  integrationTypes: LogicalMultiSelectSelection;
  productVersions: LogicalMultiSelectSelection;
  licenseTypes?: LogicalMultiSelectSelection;
  solutionCategories?: LogicalMultiSelectSelection;
  connectorTypes?: LogicalMultiSelectSelection;
};

export type LogicalFiltersParams =
  SimpleFiltersParams | IntegrationFiltersParams;

export const useLogicalFiltersFromStorage = (params: LogicalFiltersParams) => {
  const { serviceInstanceSlug, labels } = params;
  const entityTypes = 'entityTypes' in params ? params.entityTypes : undefined;
  const deployable = 'deployable' in params ? params.deployable : undefined;
  const verified =
    DocumentMetadataKeyCode.Verified in params ? params.verified : undefined;
  const integrationTypes =
    'integrationTypes' in params ? params.integrationTypes : undefined;
  const productVersions =
    'productVersions' in params ? params.productVersions : undefined;
  const licenseTypes =
    'licenseTypes' in params ? params.licenseTypes : undefined;
  const solutionCategories =
    'solutionCategories' in params ? params.solutionCategories : undefined;
  const connectorTypes =
    'connectorTypes' in params ? params.connectorTypes : undefined;

  return useMemo(() => {
    if (serviceInstanceSlug === ServiceSlug.OPEN_CTI_INTEGRATIONS) {
      return {
        operator: LogicalOperator.And,
        children: [
          { leaf: { key: FilterKey.Label, value: Object.keys(labels) } },
          {
            leaf: {
              key: FilterKey.ManagerSupported,
              value: Object.keys(deployable!),
            },
          },
          {
            leaf: {
              key: FilterKey.Verified,
              value: Object.keys(verified!),
            },
          },
          {
            leaf: {
              key: FilterKey.IntegrationType,
              value: Object.keys(integrationTypes!),
            },
          },
          {
            leaf: {
              key: FilterKey.ProductVersion,
              value: Object.keys(productVersions!),
            },
          },
          {
            leaf: {
              key: FilterKey.SolutionCategory,
              value: Object.keys(solutionCategories ?? {}),
            },
          },
          {
            leaf: {
              key: FilterKey.LicenseType,
              value: Object.keys(licenseTypes ?? {}),
            },
          },
          {
            leaf: {
              key: FilterKey.ConnectorType,
              value: Object.keys(connectorTypes ?? {}),
            },
          },
        ],
      };
    }
    return {
      operator: LogicalOperator.And,
      children: [
        {
          leaf: { key: FilterKey.Label, value: Object.keys(labels) },
        },
        ...(entityTypes
          ? [
              {
                leaf: {
                  key: FilterKey.EntityType,
                  value: Object.keys(entityTypes),
                },
              },
            ]
          : []),
      ],
    };
  }, [
    serviceInstanceSlug,
    labels,
    entityTypes,
    deployable,
    verified,
    integrationTypes,
    productVersions,
    licenseTypes,
    solutionCategories,
    connectorTypes,
  ]);
};
