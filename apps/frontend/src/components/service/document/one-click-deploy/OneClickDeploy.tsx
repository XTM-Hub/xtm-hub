import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import ConnectProductFromHubModal, {
  ConnectProductOrigin,
} from '@/components/registration/registerFromHub/ConnectProductFromHubModal';
import ChoosePlatformForm from '@/components/service/document/one-click-deploy/ChoosePlatformForm';
import EeBadge from '@/components/service/document/one-click-deploy/EeBadge';
import EeLearnMoreSheet from '@/components/service/document/one-click-deploy/EeLearnMoreSheet';
import OnePlatformDisplay from '@/components/service/document/one-click-deploy/OnePlatformDisplay';
import { useOneClickDeployTab } from '@/components/service/document/one-click-deploy/UseOneClickDeployTab';
import { DisabledActionTooltip } from '@/components/ui/DisabledActionTooltip';
import { useBuildCompatibilityTranslationKey } from '@/hooks/use-build-compatibility-translation-key';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import { useTranslate } from '@/hooks/use-translate';
import { trackEvent } from '@/lib/analytics/analytics.client';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  getPlatformIdentifier,
  isEeCapableContract,
  requiresEnterpriseEdition,
} from '@/utils/platform';
import {
  isIntegrationItem,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { Button, Dialog, DialogContent } from '@filigran/design-system';
import {
  DocumentItemFragment,
  useOneClickDeployMutation,
} from '@graphql/generated';
import { useCallback, useMemo, useState } from 'react';

interface OneClickDeployProps {
  documentData: DocumentItemFragment;
  requiredProductVersion?: string | null;
}

const OneClickDeploy = ({
  documentData,
  requiredProductVersion,
}: OneClickDeployProps) => {
  const t = useTranslate();
  const platformIdentifier = getPlatformIdentifier(documentData.type);
  const { platforms } = useRegisteredPlatforms(platformIdentifier, {
    onlyActive: true,
  });

  const { mutate: sendOneClickDeployEvent } =
    useOneClickDeployMutation(portalGraphqlClient);

  const [isOpen, setIsOpen] = useState(false);
  const [isEeSheetOpen, setIsEeSheetOpen] = useState(false);
  const [platformBasePath, setPlatformBasePath] = useState('');
  const [shouldOpenTab, setShouldOpenTab] = useState(false);
  const { openTab } = useOneClickDeployTab({ platformBasePath, documentData });
  const { platformToBeUpdated, incompatiblePlatformsCount } =
    useBuildCompatibilityTranslationKey({
      platforms,
      requiredProductVersion,
    });

  const requiresEe =
    documentData.type === ShareableResourceType.OPENCTI_PLAYBOOK ||
    requiresEnterpriseEdition(
      isIntegrationItem(documentData) ? documentData.license_type : null
    );

  const hasEeCapablePlatform = useMemo(
    () => platforms.some((platform) => isEeCapableContract(platform.contract)),
    [platforms]
  );
  const eeBlocked = requiresEe && !hasEeCapablePlatform;

  const onOneClickDeploy = useCallback(
    (basePath: string) => {
      const [platform] = platforms.filter(
        (platform) => platform.url === basePath
      );
      if (platform) {
        sendOneClickDeployEvent({
          input: {
            platform_identifier: platformIdentifier,
            service_instance_id: documentData.service_instance!.id,
            resource_id: documentData.id,
            resource_title: documentData.name ?? '',
            platform_service_instance_id: platform!.id,
          },
        });
      }
      setPlatformBasePath(basePath);
      setShouldOpenTab(true);
    },
    [
      platforms,
      sendOneClickDeployEvent,
      platformIdentifier,
      documentData.service_instance,
      documentData.id,
      documentData.name,
      setPlatformBasePath,
      setShouldOpenTab,
    ]
  );

  if (shouldOpenTab) {
    openTab();
    setShouldOpenTab(false);
  }

  const openEeSheet = useCallback(() => {
    trackEvent('ee_badge_click', {
      resource_id: documentData.id,
      resource_title: documentData.name ?? '',
      resource_type: documentData.type,
    });
    setIsEeSheetOpen(true);
  }, [documentData.id, documentData.name, documentData.type]);

  const alertContent = useMemo(() => {
    if (platforms.length === 1) {
      return (
        <OnePlatformDisplay
          documentData={documentData}
          platforms={platforms}
          oneClickDeploy={onOneClickDeploy}
          setIsOpen={setIsOpen}
        />
      );
    }
    if (platforms.length > 1) {
      return (
        <ChoosePlatformForm
          documentData={documentData}
          platforms={platforms}
          oneClickDeploy={onOneClickDeploy}
          setIsOpen={setIsOpen}
          translatedPlatformIdentifier={
            PlatformMetadataMapping[platformIdentifier].name ?? 'OpenCTI'
          }
          requiredProductVersion={requiredProductVersion}
          requiresEe={requiresEe}
        />
      );
    }
  }, [
    platforms,
    documentData,
    onOneClickDeploy,
    platformIdentifier,
    requiredProductVersion,
    requiresEe,
  ]);

  const isDeploymentDisabled = useMemo(() => {
    return (
      !eeBlocked && platforms.length === 1 && incompatiblePlatformsCount === 1
    );
  }, [eeBlocked, platforms, incompatiblePlatformsCount]);

  if (platforms.length === 0) {
    return (
      <ConnectProductFromHubModal
        isOpen={isOpen}
        onOpenChange={(isOpen) => {
          setIsOpen(isOpen);
        }}
        origin={ConnectProductOrigin.library}
      />
    );
  }
  const button = (
    <Button
      disabled={isDeploymentDisabled || eeBlocked}
      onClick={() => setIsOpen(true)}>
      {t('Service.ShareableResources.Deploy.DeployPlatform', {
        platformName:
          PlatformMetadataMapping[platformIdentifier].name ?? 'OpenCTI',
      })}
    </Button>
  );

  const buttonWithBadge = eeBlocked ? (
    <div className="relative inline-flex items-center mr-6">
      {button}
      <div className="absolute inset-y-0 right-0 flex items-center translate-x-1/2 z-10">
        <EeBadge onClick={openEeSheet} />
      </div>
    </div>
  ) : (
    button
  );

  const container = isDeploymentDisabled ? (
    <DisabledActionTooltip
      reason={t('Service.Connectors.Incompatible', {
        platformToBeUpdated,
        count: incompatiblePlatformsCount,
      })}>
      {buttonWithBadge}
    </DisabledActionTooltip>
  ) : (
    buttonWithBadge
  );

  return (
    <>
      {container}
      <Dialog
        open={isOpen}
        onOpenChange={setIsOpen}>
        <DialogContent
          size="lg"
          role="alertdialog"
          onInteractOutside={(e) => e.preventDefault()}
          hideCloseButton>
          {alertContent}
        </DialogContent>
      </Dialog>
      <EeLearnMoreSheet
        open={isEeSheetOpen}
        setOpen={setIsEeSheetOpen}
        platformIdentifier={platformIdentifier}
      />
    </>
  );
};

export default OneClickDeploy;
