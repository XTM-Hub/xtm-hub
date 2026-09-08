import GuardCapacityComponent from '@/components/AdminGuard';
import { PortalContext } from '@/components/me/AppPortalContext';
import {
  CONTRACT_LABEL_BY_CONTRACT,
  translateServiceDefinitionIdentifier,
} from '@/components/registration/PlatformIdentifierMapping';
import { registeredPlatformByServiceInstanceIdFragment } from '@/components/registration/register/register.graphql';
import { PlatformUpdateSheet } from '@/components/service/components/PlatformUpdateSheet';
import { UnregisterButton } from '@/components/service/registration/UnregisterButton';
import { TrialsManageUsersDialog } from '@/components/service/trial-instances/manage-users/TrialsManageUsersDialog';
import { TrialCancelSheet } from '@/components/service/trial-instances/TrialCancelSheet';
import { isWithinLastMonths, useDateFormatter } from '@/utils/date';
import { formatTitleCase } from '@/utils/format/case';
import { Button } from '@filigran/ui/servers';
import { registeredPlatformByServiceInstanceId_fragment$key } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import {
  DeploymentRequestHubStatus,
  OrganizationCapability,
  PlatformContract,
  PlatformIdentifier,
  PortalCapability,
} from '@graphql/generated';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useContext, useState } from 'react';
import { useFragment } from 'react-relay';

interface RegistrationDetailsProps {
  registeredPlatform: registeredPlatformByServiceInstanceId_fragment$key;
}

export const RegistrationDetails = ({
  registeredPlatform,
}: RegistrationDetailsProps) => {
  const t = useTranslations();
  const formatDate = useDateFormatter();
  const searchParams = useSearchParams();
  const openForm = searchParams.get('openForm') === 'true';

  const [openPlatformSheet, setOpenPlatformSheet] = useState(false);
  const [openCancelSheet, setOpenCancelSheet] = useState(false);

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

  const platform =
    useFragment<registeredPlatformByServiceInstanceId_fragment$key>(
      registeredPlatformByServiceInstanceIdFragment,
      registeredPlatform
    );

  const isCancellable =
    platform.deployment_request &&
    ![
      DeploymentRequestHubStatus.Expired,
      DeploymentRequestHubStatus.Cancelled,
    ].includes(
      platform.deployment_request?.hub_status as DeploymentRequestHubStatus
    );

  const isCancellationDefinitive =
    DeploymentRequestHubStatus.Active ===
    platform.deployment_request?.hub_status;

  const isTrial = platform.contract === PlatformContract.Trial;
  const serviceInstanceId = platform.subscription?.service_instance?.id;
  const displayUpdatePlatform =
    canUpdatePlatform && !isTrial && serviceInstanceId;

  const displayedIdentifier = translateServiceDefinitionIdentifier(
    platform.identifier
  );

  const isTrialActive =
    isTrial &&
    platform.deployment_request?.hub_status ===
      DeploymentRequestHubStatus.Active;

  const userHasTrialAccess = Boolean(platform.myGroups?.length);
  const displayAccessPlatformButtonForTrial =
    userHasTrialAccess &&
    platform.url &&
    platform.deployment_request?.hub_status ===
      DeploymentRequestHubStatus.Active;

  const isConnectionStatusOk = isWithinLastMonths(
    new Date(platform.last_connectivity_check),
    1
  );

  const isLastConnectivityCheckDisplayed =
    !isTrial ||
    platform?.deployment_request?.hub_status ===
      DeploymentRequestHubStatus.Active;

  return (
    <section className="flex justify-between p-xl border border-solid border-blue rounded">
      <ul className="text-sm flex flex-col gap-l">
        {platform.title && (
          <li>
            <span className="mr-xs">{t('Register.Details.ProductName')}:</span>
            {platform.title}
          </li>
        )}
        <li>
          <span className="mr-xs">{t('Register.Details.ProductURL')}:</span>
          <span>{platform.url ? platform.url : '-'}</span>
        </li>
        {platform.deployment_request?.hub_status && (
          <li>
            <span className="mr-xs">{t('Register.Details.Status')}:</span>
            {formatTitleCase(platform.deployment_request?.hub_status)}
            {isCancellable && (
              <Button
                variant="link-destructive"
                className="m-0 p-0 ml-4 h-full"
                onClick={() => setOpenCancelSheet(true)}>
                {t('Utils.Cancel')}
              </Button>
            )}
          </li>
        )}
        {isTrial ? (
          <>
            <li>
              <span className="mr-xs">{t('Register.Details.StartDate')}:</span>
              {platform.subscription?.start_date &&
              platform.subscription.end_date
                ? formatDate(platform.subscription.start_date)
                : '-'}
            </li>
            <li>
              <span className="mr-xs">{t('Register.Details.EndDate')}:</span>
              {platform.subscription?.end_date
                ? formatDate(platform.subscription?.end_date)
                : '-'}
            </li>
          </>
        ) : (
          <>
            <li>
              <span className="mr-xs">
                {t('Register.Details.ConnectedOn')}:
              </span>
              {platform.subscription?.start_date
                ? formatDate(platform.subscription.start_date)
                : '-'}
            </li>
          </>
        )}

        {platform.deployment_request?.region && (
          <li>
            <span className="mr-xs">{t('Register.Details.Region')}:</span>
            {t(`Region.${platform.deployment_request.region.toUpperCase()}`)}
          </li>
        )}
        <li>
          <span className="mr-xs">{t('Register.Details.License')}:</span>
          {t(CONTRACT_LABEL_BY_CONTRACT[platform.contract])}
        </li>
        {isLastConnectivityCheckDisplayed && (
          <>
            <li>
              <span className="mr-xs">
                {t('Register.Details.ConnectionStatus.Title')}:
              </span>
              <span
                className={
                  isConnectionStatusOk
                    ? 'text-alert-success-primary'
                    : 'text-destructive'
                }>
                {isConnectionStatusOk ? (
                  t('Register.Details.ConnectionStatus.Connected')
                ) : (
                  <span>
                    {t('Register.Details.ConnectionStatus.NotConnected')}
                    {'. '}
                  </span>
                )}
              </span>
              {!isConnectionStatusOk && (
                <span>
                  {t('Register.Details.ConnectionStatus.NotConnectedDetails')}
                </span>
              )}
            </li>
            <li>
              <span className="mr-xs">
                {t('Register.Details.LastConnectionCheck')}:
              </span>
              {platform.last_connectivity_check
                ? formatDate(platform.last_connectivity_check)
                : '-'}
            </li>
          </>
        )}
        {isTrialActive && (
          <li>
            <span>
              <span className="mr-xs">{t('Register.Details.Access')}:</span>
              {userHasTrialAccess ? (
                <span>
                  {(platform.myGroups ?? [])
                    .map((group) => group.name)
                    .filter(Boolean)
                    .join(', ')}
                </span>
              ) : (
                <span>
                  <span className="text-destructive mr-xs">
                    {t('RegistrationDetails.NoAccess')}
                  </span>
                  {t('RegistrationDetails.NoAccessContact', {
                    email: platform.deployment_request?.requester_email ?? '',
                  })}
                </span>
              )}
            </span>
          </li>
        )}
      </ul>

      <div className="flex flex-col gap-m">
        {(displayAccessPlatformButtonForTrial || !isTrial) && (
          <Button>
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
            variant="secondary"
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
      {platform.deployment_request && (
        <TrialCancelSheet
          platformIdentifier={
            platform.deployment_request
              .platform_identifier as PlatformIdentifier
          }
          deploymentRequestId={platform.deployment_request.id}
          isCancellationDefinitive={isCancellationDefinitive}
          open={openCancelSheet}
          setOpen={setOpenCancelSheet}
        />
      )}
    </section>
  );
};
