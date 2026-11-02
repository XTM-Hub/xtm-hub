import { ServiceInstanceCardData } from '@/components/service/ServiceInstanceCard';
import { useTranslate } from '@/hooks/use-translate';
import {
  APP_PATH,
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
} from '@/utils/path/constant';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { serviceList_fragment$data } from '@generated/serviceList_fragment.graphql';
import {
  PlatformIdentifier,
  SeoServiceInstanceItemFragment,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';

export const isExternalService = (
  service_definition_identifier: ServiceDefinitionIdentifier
) =>
  [
    ServiceDefinitionIdentifier.Link,
    ServiceDefinitionIdentifier.OpenctiRegistration,
    ServiceDefinitionIdentifier.OpenaevRegistration,
  ].includes(service_definition_identifier);

export const platformIdentifierMappedByShareableResourceType: Record<
  ShareableResourceType,
  PlatformIdentifier
> = {
  [ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD]: PlatformIdentifier.Opencti,
  [ShareableResourceType.OPENCTI_CUSTOM_VIEW]: PlatformIdentifier.Opencti,
  [ShareableResourceType.OPENCTI_INTEGRATION]: PlatformIdentifier.Opencti,
  [ShareableResourceType.OPENAEV_SCENARIO]: PlatformIdentifier.Openaev,
  [ShareableResourceType.OPENCTI_PLAYBOOK]: PlatformIdentifier.Opencti,
};

const buildDocumentUrl = (
  serviceInstanceId: string,
  logoDocumentId: string | null | undefined
) => {
  if (logoDocumentId)
    return `url(/document/images/${serviceInstanceId}/${logoDocumentId})`;
  return null;
};

const computeUrl = (
  instance: serviceList_fragment$data | SeoServiceInstanceItemFragment,
  seo?: boolean
) => {
  const instanceLink = instance.links?.[0]?.url;
  const serviceDefinitionIdentifier = instance.service_definition!
    .identifier as ServiceDefinitionIdentifier;
  if (isExternalService(serviceDefinitionIdentifier) && instanceLink)
    return instanceLink as string;
  if (seo) {
    return `/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${instance.slug}`;
  }
  return `/${APP_PATH}/service/${serviceDefinitionIdentifier}/${instance.id}`;
};

const computeIllustrationDocumentUrl = (
  instanceId: string,
  illustrationDocumentId: string | null | undefined
) => {
  if (illustrationDocumentId)
    return `/document/images/${instanceId}/${illustrationDocumentId}`;
  return null;
};

export const localizedCardName = (
  instance: { slug?: string | null; name: string },
  t: ReturnType<typeof useTranslate>
) => {
  const key = `Service.Cards.${instance.slug}.Name`;
  return instance.slug && t.has(key) ? t(key) : instance.name;
};

export const localizedCardDescription = (
  instance: { slug?: string | null; description?: string | null },
  t: ReturnType<typeof useTranslate>
) => {
  const key = `Service.Cards.${instance.slug}.Description`;
  return instance.slug && t.has(key) ? t(key) : instance.description!;
};

export const seoServiceInstanceToInstanceCardData = (
  instance: SeoServiceInstanceItemFragment,
  t: ReturnType<typeof useTranslate>
): ServiceInstanceCardData => {
  return {
    id: instance.id,
    name: localizedCardName(instance, t),
    slug: instance.slug as string,
    description: localizedCardDescription(instance, t),
    displayLinkArrow: isExternalService(
      instance.service_definition!.identifier as ServiceDefinitionIdentifier
    ),
    illustrationDocumentUrl: computeIllustrationDocumentUrl(
      instance.id,
      instance.illustration_document_id
    ),
    logoBackgroundImageUrl: buildDocumentUrl(
      instance.id,
      instance.logo_document_id
    ),
    url: computeUrl(instance, true),
  };
};
