import { ServiceDefinitionIdentifierToPlatformIdentifier } from '@/components/registration/PlatformIdentifierMapping';
import { ServiceInstanceCardData } from '@/components/service/ServiceInstanceCard';
import { daysUntil } from '@/utils/date';
import {
  APP_PATH,
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
} from '@/utils/path/constant';
import { buildPlatformHoverLinks, isTrial } from '@/utils/platform';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { registerRegisteredPlatformListFragment$data } from '@generated/registerRegisteredPlatformListFragment.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { serviceList_fragment$data } from '@generated/serviceList_fragment.graphql';
import {
  DeploymentRequestHubStatus,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
  ServiceInstanceCreationStatus,
} from '@graphql/generated';
import { useTranslations } from 'next-intl';

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

export const isExpired = (endDate: Date | undefined | null): boolean => {
  return endDate ? new Date(endDate) < new Date() : false;
};

export const getDisplayDays = (
  platform: registerRegisteredPlatformListFragment$data['registeredPlatforms'][number]
) => {
  if (!isTrial(platform)) {
    return undefined;
  }

  if (
    !platform.subscription?.end_date ||
    [
      DeploymentRequestHubStatus.Expired,
      DeploymentRequestHubStatus.Cancelled,
    ].includes(
      platform.deployment_request?.hub_status as DeploymentRequestHubStatus
    )
  ) {
    return platform.deployment_request?.hub_status;
  }

  if (
    platform.deployment_request?.hub_status ===
    DeploymentRequestHubStatus.Queued
  ) {
    return 'Requested';
  }
  if (
    platform.subscription?.service_instance?.creation_status ===
    ServiceInstanceCreationStatus.Pending
  ) {
    return 'Provisioning';
  }

  const target = new Date(platform.subscription?.end_date);

  const diffInDays = daysUntil(target);
  if (diffInDays <= 0) {
    return 'Expired';
  }
  return `${diffInDays} days remaining`;
};

const buildDocumentUrl = (
  serviceInstanceId: string,
  logoDocumentId: string | null | undefined
) => {
  if (logoDocumentId)
    return `url(/document/images/${serviceInstanceId}/${logoDocumentId})`;
  return null;
};

const freeTrialStaticData = (
  platformIdentifier: PlatformIdentifier,
  t: ReturnType<typeof useTranslations>
) => {
  return {
    description: t(
      `Service.Trials.Display.${platformIdentifier}.FreeTrialDescription`
    ),
    name: t(`Service.Trials.Display.${platformIdentifier}.Title`),
    logoBackgroundImageUrl: `url(/${platformIdentifier}_free-trial-logo.png)`,
    illustrationDocumentUrl: `/opencti_free-trial-illustration.png`,
    ordering: -2,
  };
};

export const registeredPlatformToServiceInstanceCardData = (
  platform: registerRegisteredPlatformListFragment$data['registeredPlatforms'][number],
  t: ReturnType<typeof useTranslations>
): ServiceInstanceCardData => {
  const cardBackgroundByServiceMap: Partial<
    Record<ServiceDefinitionIdentifier, string>
  > = {
    [ServiceDefinitionIdentifier.OpenctiRegistration]:
      'bg-gradient-to-br from-[#05105A] via-[#095298] to-[#05105A]',
    [ServiceDefinitionIdentifier.OpenaevRegistration]:
      'bg-gradient-to-br from-[#0F1E38] via-[#0A6D6A] to-[#0F1E38]',
  };
  const platformIdentifier = platform.identifier as ServiceDefinitionIdentifier;
  const commonValues = {
    id: platform.id,
    url: platform.url,
    disableCard:
      [
        DeploymentRequestHubStatus.Expired,
        DeploymentRequestHubStatus.Cancelled,
      ].includes(
        platform.deployment_request?.hub_status as DeploymentRequestHubStatus
      ) || isExpired(platform.subscription?.end_date),
    hoverLinks: buildPlatformHoverLinks(platform, t),
  };
  if (isTrial(platform)) {
    return {
      ...commonValues,
      ...freeTrialStaticData(
        ServiceDefinitionIdentifierToPlatformIdentifier[platformIdentifier] ??
          PlatformIdentifier.Opencti,
        t
      ),
      displayedServiceStatus: getDisplayDays(platform),
    };
  }

  return {
    ...commonValues,
    name: platform.title,
    description: t('Register.Details.Description'),
    illustrationDocumentUrl: platform.illustration_document_id
      ? `/document/visualize/${platform.id}/${platform.illustration_document_id}`
      : `/${platformIdentifier}-private-platform-illustration.png`,
    isCustomIllustrationDocument: !!platform.illustration_document_id,
    logoBackgroundImageUrl: `url(/${platformIdentifier}-private-platform-logo.png)`,
    fullBackgroundImage: true,
    cardTitleOverride: platform.tenant_name
      ? `${platform.title} - ${platform.tenant_name}`
      : platform.title,
    card_background: cardBackgroundByServiceMap[platformIdentifier] ?? null,
    ordering: -1, // registered platforms are displayed at the first position, after free trials
  };
};

const computeUrl = (
  instance: serviceList_fragment$data | seoServiceInstanceFragment$data,
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
  t: ReturnType<typeof useTranslations>
) => {
  const key = `Service.Cards.${instance.slug}.Name`;
  return instance.slug && t.has(key) ? t(key) : instance.name;
};

export const localizedCardDescription = (
  instance: { slug?: string | null; description?: string | null },
  t: ReturnType<typeof useTranslations>
) => {
  const key = `Service.Cards.${instance.slug}.Description`;
  return instance.slug && t.has(key) ? t(key) : instance.description!;
};

export const seoServiceInstanceToInstanceCardData = (
  instance: seoServiceInstanceFragment$data,
  t: ReturnType<typeof useTranslations>
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
    ordering: 0,
  };
};
