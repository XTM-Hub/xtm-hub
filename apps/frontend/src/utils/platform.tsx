import { PlatformHoverAction } from '@/components/service/ServiceInstanceCard';
import { useTranslate } from '@/hooks/use-translate';
import { APP_PATH } from '@/utils/path/constant';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { registerRegisteredPlatformListFragment$data } from '@generated/registerRegisteredPlatformListFragment.graphql';
import {
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  PlatformContract,
  PlatformIdentifier,
} from '@graphql/generated';

export const getPlatformIdentifier = (type: string): PlatformIdentifier => {
  return type === ShareableResourceType.OPENAEV_SCENARIO
    ? PlatformIdentifier.Openaev
    : PlatformIdentifier.Opencti;
};

export const isTrial = (
  platform: registerRegisteredPlatformListFragment$data['registeredPlatforms'][number]
) => {
  return (
    platform.deployment_request?.type === DeploymentRequestDeploymentType.Trial
  );
};

export const isEeCapableContract = (
  contract: PlatformContract | string | null | undefined
): boolean =>
  contract === PlatformContract.Ee || contract === PlatformContract.Trial;

export const buildPlatformHoverLinks = (
  platform: registerRegisteredPlatformListFragment$data['registeredPlatforms'][number],
  t: ReturnType<typeof useTranslate>
): PlatformHoverAction[] | undefined => {
  const isTrialActive =
    platform.deployment_request?.hub_status ===
    DeploymentRequestHubStatus.Active;
  const shouldDisplayPlatformLink = isTrialActive || !isTrial(platform);

  const actions: PlatformHoverAction[] = [
    {
      id: 'platform-details',
      label: t('Service.RegisteredPlatforms.PlatformDetails'),
      href: `/${APP_PATH}/service/${platform.identifier}/${platform.subscription?.service_instance?.id}`,
      variant: 'secondary',
    },
  ];
  if (shouldDisplayPlatformLink) {
    actions.push({
      id: 'platform-link',
      label: t('Service.RegisteredPlatforms.GoToMyPlatform'),
      href: platform.url,
      target: '_blank',
    });
  }

  return actions;
};
