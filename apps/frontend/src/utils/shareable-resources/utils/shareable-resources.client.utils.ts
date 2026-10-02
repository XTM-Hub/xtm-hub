import { hasProperty } from '@/utils/has-property';
import { encodeRedirectValue } from '@/utils/redirect';
import {
  OPENCTI_INTEGRATION_URL_CONFIGS,
  serviceConfigMap,
} from '@/utils/shareable-resources/shareable-resources.consts';
import {
  isConnectorResource,
  PublicDocumentData,
  ServiceInfo,
  ServiceSlug,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { DocumentMetadataKeyCode, IntegrationType } from '@graphql/generated';

export function getServiceInfo(
  serviceInstance: { id: string; slug: ServiceSlug },
  documentId: string
): ServiceInfo | undefined {
  const config = serviceConfigMap[serviceInstance.slug];

  if (!config) {
    return undefined;
  }

  return {
    link: `/redirect/${config.redirectPath}?service_instance_id=${encodeRedirectValue(serviceInstance.id)}&document_id=${encodeRedirectValue(documentId)}`,
    description: config.description,
  };
}

/**
 * Maps each metadata field to its real value type so `docHasMetadata` can
 * narrow correctly instead of defaulting to `unknown`.
 *
 * `integration_type`/`license_type` are widened to `string`/`string | null`
 * instead of the `IntegrationType`/`LicenseType` enums: Relay generates its
 * own local literal-union type per fragment for these fields, and
 * intersecting it with the schema enum collapses to `never`. Cast to the
 * enum at call sites that need it.
 */
type DocumentMetadataValueType = {
  integration_type: string;
  product_version: string | null;
  manager_supported: boolean;
  verified: boolean;
  playbook_supported: boolean;
  feed_url: string | null;
  vendor_url: string;
  github_url: string | null;
  datasheet_url: string | null;
  blogpost_url: string | null;
  demo_url: string | null;
  license_type: string | null;
  solution_categories: ReadonlyArray<{ id: string; name: string }> | null;
  container_image: string | null;
  source_code: string | null;
  subscription_link: string | null;
  minimum_deployable_version: string | null;
  contact: string | null;
  entity_types: readonly string[] | null;
};

export const docHasMetadata = <
  T,
  K extends string,
  V = K extends keyof DocumentMetadataValueType
    ? DocumentMetadataValueType[K]
    : unknown,
>(
  documentData: T,
  metadataKey: K
): documentData is T & Record<K, V> =>
  hasProperty<T, K, V>(documentData, metadataKey) &&
  documentData[metadataKey] !== null &&
  documentData[metadataKey] !== undefined;

/**
 * Safely reads `entity_types` off any document shape, for handing to
 * `getEntityTypes`/`ShareableResourceEntityTypes`.
 */
export const getDocumentEntityTypes = (
  document: documentItem_fragment$data | PublicDocumentData
): readonly string[] | null =>
  docHasMetadata(document, DocumentMetadataKeyCode.EntityTypes)
    ? document.entity_types
    : null;

export const isResourceDownloadable = (
  document: documentItem_fragment$data | PublicDocumentData
): boolean => {
  return (
    !hasProperty<typeof document, 'integration_type', IntegrationType>(
      document,
      'integration_type'
    ) || document.integration_type !== IntegrationType.ThirdPartyIntegration
  );
};

const DEPLOYABLE_RESOURCE_TYPES: string[] = [
  ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
  ShareableResourceType.OPENCTI_CUSTOM_VIEW,
  ShareableResourceType.OPENAEV_SCENARIO,
  ShareableResourceType.OPENCTI_PLAYBOOK,
];

export const isResourceDeployable = (
  document: documentItem_fragment$data | PublicDocumentData
): boolean => {
  if (!document.active) {
    return false;
  }

  if (isConnectorResource(document)) {
    return true;
  }

  const integrationType = docHasMetadata(
    document,
    DocumentMetadataKeyCode.IntegrationType
  )
    ? document.integration_type
    : null;

  if (integrationType) {
    return integrationType in OPENCTI_INTEGRATION_URL_CONFIGS;
  }

  return DEPLOYABLE_RESOURCE_TYPES.includes(document.type);
};
