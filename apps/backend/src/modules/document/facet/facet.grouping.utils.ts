import {
  DocumentMetadataKeyCode,
  Filter,
  FilterKey,
  LogicalFilterInput,
} from '../../../__generated__/resolvers-types';
import { OPENCTI_INTEGRATION_DOCUMENT_TYPE } from '../../shareable-resource/opencti/integration/integration.model';

export type FacetField =
  | 'integration_type'
  | 'license_type'
  | 'manager_supported'
  | 'verified'
  | 'product_version'
  | 'solution_category'
  | 'use_case'
  | 'entity_type'
  | 'object_type'
  | 'sector'
  | 'region';

/** `metadataList` reads a JSON array stored under `metadataKey`, one bucket per element. */
export type FacetSource =
  'metadata' | 'useCase' | 'solutionCategory' | 'metadataList';

export type FacetSpec = {
  field: FacetField;
  filterKey: FilterKey;
  source: FacetSource;
  metadataKey?: DocumentMetadataKeyCode;
  /** Only computed when the request targets this document type, or no type at all. */
  documentType?: string;
};

export const FACET_SPECS: readonly FacetSpec[] = [
  {
    field: 'integration_type',
    filterKey: FilterKey.IntegrationType,
    source: 'metadata',
    metadataKey: DocumentMetadataKeyCode.IntegrationType,
  },
  {
    field: 'license_type',
    filterKey: FilterKey.LicenseType,
    source: 'metadata',
    metadataKey: DocumentMetadataKeyCode.LicenseType,
  },
  {
    field: 'manager_supported',
    filterKey: FilterKey.ManagerSupported,
    source: 'metadata',
    metadataKey: DocumentMetadataKeyCode.ManagerSupported,
  },
  {
    field: 'verified',
    filterKey: FilterKey.Verified,
    source: 'metadata',
    metadataKey: DocumentMetadataKeyCode.Verified,
  },
  {
    field: 'product_version',
    filterKey: FilterKey.ProductVersion,
    source: 'metadata',
    metadataKey: DocumentMetadataKeyCode.ProductVersion,
  },
  {
    field: 'solution_category',
    filterKey: FilterKey.SolutionCategory,
    source: 'solutionCategory',
  },
  {
    field: 'use_case',
    filterKey: FilterKey.Label,
    source: 'useCase',
  },
  {
    field: 'entity_type',
    filterKey: FilterKey.EntityType,
    source: 'metadataList',
    metadataKey: DocumentMetadataKeyCode.EntityTypes,
  },
  {
    field: 'object_type',
    filterKey: FilterKey.ObjectType,
    source: 'metadataList',
    metadataKey: DocumentMetadataKeyCode.CoveredObjectTypes,
    documentType: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
  },
  {
    field: 'sector',
    filterKey: FilterKey.Sector,
    source: 'metadataList',
    metadataKey: DocumentMetadataKeyCode.CoveredSectors,
    documentType: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
  },
  {
    field: 'region',
    filterKey: FilterKey.Region,
    source: 'metadataList',
    metadataKey: DocumentMetadataKeyCode.CoveredRegions,
    documentType: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
  },
] as const;

export const stripFilterKeyFromLogicalFilter = (
  logicalFilter: LogicalFilterInput | null | undefined,
  filterKey: FilterKey
): LogicalFilterInput | undefined => {
  if (!logicalFilter) {
    return undefined;
  }

  if (logicalFilter.leaf) {
    return logicalFilter.leaf.key === filterKey ? undefined : logicalFilter;
  }

  if (!logicalFilter.children?.length) {
    return undefined;
  }

  const children = logicalFilter.children
    .map((child) => stripFilterKeyFromLogicalFilter(child, filterKey))
    .filter((child): child is LogicalFilterInput => child !== undefined);

  if (!children.length) {
    return undefined;
  }

  if (children.length === 1) {
    return children[0];
  }

  return {
    operator: logicalFilter.operator,
    children,
  };
};

const stableLeaf = (leaf: Filter): string =>
  (Object.keys(leaf) as Array<keyof Filter>)
    .sort()
    .map((key) => `${key}=${JSON.stringify(leaf[key])}`)
    .join('&');

export const canonicalSignature = (
  node: LogicalFilterInput | null | undefined
): string => {
  if (!node) {
    return '0';
  }

  if (node.leaf) {
    return `L${stableLeaf(node.leaf)}`;
  }

  if (!node.children?.length) {
    return '0';
  }

  return `N(${String(node.operator)};${node.children
    .map(canonicalSignature)
    .join(',')})`;
};

export type FacetGroup = {
  strippedFilter: LogicalFilterInput | undefined;
  specs: FacetSpec[];
};

export const isFacetSpecApplicable = (
  spec: FacetSpec,
  documentType: string | null | undefined
): boolean =>
  !spec.documentType || !documentType || spec.documentType === documentType;

export const groupFacetsBySignature = (
  logicalFilters: LogicalFilterInput | null | undefined,
  documentType?: string | null
): FacetGroup[] => {
  const groups = new Map<string, FacetGroup>();

  for (const spec of FACET_SPECS) {
    if (!isFacetSpecApplicable(spec, documentType)) {
      continue;
    }
    const strippedFilter = stripFilterKeyFromLogicalFilter(
      logicalFilters,
      spec.filterKey
    );
    const signature = canonicalSignature(strippedFilter);

    const existing = groups.get(signature);
    if (existing) {
      existing.specs.push(spec);
    } else {
      groups.set(signature, { strippedFilter, specs: [spec] });
    }
  }

  return [...groups.values()];
};
