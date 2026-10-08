import GuardCapacityComponent from '@/components/AdminGuard';
import { PortalContext } from '@/components/me/AppPortalContext';
import { translateServiceDefinitionIdentifier } from '@/components/registration/PlatformIdentifierMapping';
import { PlatformUpdateSheet } from '@/components/service/components/PlatformUpdateSheet';
import { UnregisterButton } from '@/components/service/registration/UnregisterButton';
import { TrialsManageUsersDialog } from '@/components/service/trial-instances/manage-users/TrialsManageUsersDialog';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { Button } from '@filigran/design-system';
import { registeredPlatformByServiceInstanceId_fragment$data } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import {
  DeploymentRequestHubStatus,
  OrganizationCapability,
  PlatformContract,
  PortalCapability,
} from '@graphql/generated';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useContext, useState } from 'react';

interface ConnectedProductButtonsProps {
  platform: registeredPlatformByServiceInstanceId_fragment$data;
  direction?: 'row' | 'column';
}

export const ConnectedProductButtons = ({
  platform,
  direction = 'column',
}: ConnectedProductButtonsProps) => {
  const t = useTranslate();
  const searchParams = useSearchParams();
  const openForm = searchParams.get('openForm') === 'true';

  const [openPlatformSheet, setOpenPlatformSheet] = useState(false);

  const { hasOrganizationCapability, hasCapability } =
    useContext(PortalContext);

  const canUpdatePlatform =
    hasCapability?.(PortalCapability.Bypass) ||
    hasOrganizationCapability?.(
      OrganizationCapability.AdministrateOrganization
    ) ||
    hasOrganizationCapability?.(
      OrganizationCapability.ManagePlatformRegistration
    );

  const isTrial = platform.contract === PlatformContract.Trial;
  const serviceInstanceId = platform.subscription?.service_instance?.id;
  const displayUpdatePlatform =
    canUpdatePlatform && !isTrial && serviceInstanceId;

  const displayedIdentifier = translateServiceDefinitionIdentifier(
    platform.identifier
  );

  const userHasTrialAccess = Boolean(platform.myGroups?.length);
  const displayAccessPlatformButtonForTrial =
    userHasTrialAccess &&
    platform.url &&
    platform.deployment_request?.hub_status ===
      DeploymentRequestHubStatus.Active;

  return (
    <>
      <div
        className={cn(
          'flex gap-m',
          direction === 'column' ? 'flex-col' : 'flex-row'
        )}>
        {(displayAccessPlatformButtonForTrial || !isTrial) && (
          <Button asChild>
            <Link
              target="_blank"
              rel="noopener noreferrer"
              href={platform.url}>
              {t('Register.Details.Access')} {displayedIdentifier}
            </Link>
          </Button>
        )}

        {displayAccessPlatformButtonForTrial &&
          isTrial &&
          serviceInstanceId && (
            <GuardCapacityComponent
              capacityRestriction={[
                OrganizationCapability.AdministrateOrganization,
                OrganizationCapability.ManagePlatformRegistration,
              ]}>
              <TrialsManageUsersDialog
                serviceInstanceId={serviceInstanceId}
                organizationId={platform.subscription?.organization.id}
                defaultOpen={openForm}
              />
            </GuardCapacityComponent>
          )}
        {displayUpdatePlatform && (
          <Button
            priority="secondary"
            onClick={() => setOpenPlatformSheet(true)}>
            {t('Platform.Update')}
          </Button>
        )}
        <UnregisterButton platform={platform} />
      </div>

      {displayUpdatePlatform && (
        <PlatformUpdateSheet
          serviceInstanceId={serviceInstanceId}
          serviceInstanceName={platform.title}
          platformUrl={platform.url}
          serviceDefinitionIdentifier={platform.identifier}
          open={openPlatformSheet}
          setOpen={setOpenPlatformSheet}
        />
      )}
    </>
  );
};
