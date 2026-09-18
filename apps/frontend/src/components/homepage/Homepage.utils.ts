import { ServiceDefinitionIdentifierToPlatformIdentifier } from '@/components/registration/PlatformIdentifierMapping';
import { daysUntil } from '@/utils/date';
import { APP_PATH } from '@/utils/path/constant';
import {
  DocumentImageType,
  HomepageDocumentFragment,
  PlatformContract,
  PlatformIdentifier,
  RegisteredPlatformsQuery,
} from '@graphql/generated';

type RegisteredPlatformForHomepage =
  RegisteredPlatformsQuery['registeredPlatforms'][number];

export type HomepageRoadmapTitleProduct = PlatformIdentifier | 'default';

export interface HomepageRegisteredPlatformCardViewModel {
  id: string;
  platformIdentifier: PlatformIdentifier;
  title: string;
  registrationDate: string | null | undefined;
  contract: PlatformContract;
  remainingTrialDays: number | undefined;
  href: string | undefined;
}

export const buildDistinctPlatformIdentifiersFromServiceDefinition = (
  registeredPlatforms: RegisteredPlatformsQuery['registeredPlatforms']
): PlatformIdentifier[] => {
  const platformSet = new Set<PlatformIdentifier>();
  for (const registeredPlatform of registeredPlatforms) {
    const platform =
      ServiceDefinitionIdentifierToPlatformIdentifier[
        registeredPlatform.identifier
      ];
    if (platform) {
      platformSet.add(platform);
    }
  }

  return Array.from(platformSet) ?? [];
};

export const resolveRemainingTrialDays = (
  endDate: string | null | undefined
): number | undefined => {
  if (!endDate) {
    return undefined;
  }

  const remainingDays = daysUntil(new Date(endDate));

  return remainingDays < 0 ? 0 : remainingDays;
};

export const mapRegisteredPlatformsToHomepageCards = (
  registeredPlatforms: RegisteredPlatformForHomepage[]
): HomepageRegisteredPlatformCardViewModel[] => {
  return registeredPlatforms.flatMap((platform) => {
    const platformIdentifier: PlatformIdentifier | undefined =
      ServiceDefinitionIdentifierToPlatformIdentifier[platform.identifier];
    if (!platformIdentifier) {
      return [];
    }

    const serviceInstanceId = platform.subscription?.service_instance_id;

    return [
      {
        id: platform.id,
        platformIdentifier,
        title: platform.title,
        registrationDate: platform.subscription?.start_date,
        contract: platform.contract,
        remainingTrialDays:
          platform.contract === PlatformContract.Trial
            ? resolveRemainingTrialDays(platform.subscription?.end_date)
            : undefined,
        href: serviceInstanceId
          ? `/${APP_PATH}/service/${platform.identifier}/${serviceInstanceId}`
          : undefined,
      },
    ];
  });
};

export const findLogoUrl = (
  resource: HomepageDocumentFragment
): string | undefined => {
  const logo = resource.children_documents?.find(
    (doc) => doc.image_type === DocumentImageType.Logo
  );
  return logo && resource.service_instance_id
    ? `/document/images/${String(resource.service_instance_id)}/${logo.id}`
    : undefined;
};
