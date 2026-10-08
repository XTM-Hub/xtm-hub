import { CONTRACT_LABEL_BY_CONTRACT } from '@/components/registration/PlatformIdentifierMapping';
import { registeredPlatformByServiceInstanceIdFragment } from '@/components/registration/register/register.graphql';
import { TrialCancelSheet } from '@/components/service/trial-instances/TrialCancelSheet';
import { useTranslate } from '@/hooks/use-translate';
import { isWithinLastMonths, useDateFormatter } from '@/utils/date';
import { formatTitleCase } from '@/utils/format/case';
import { Button } from '@filigran/design-system';
import { registeredPlatformByServiceInstanceId_fragment$key } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import {
  DeploymentRequestHubStatus,
  PlatformContract,
} from '@graphql/generated';
import { useState } from 'react';
import { useFragment } from 'react-relay';

interface RegistrationDetailsProps {
  registeredPlatform: registeredPlatformByServiceInstanceId_fragment$key;
}

export const RegistrationDetails = ({
  registeredPlatform,
}: RegistrationDetailsProps) => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const [openCancelSheet, setOpenCancelSheet] = useState(false);

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

  const isTrialActive =
    isTrial &&
    platform.deployment_request?.hub_status ===
      DeploymentRequestHubStatus.Active;

  const userHasTrialAccess = Boolean(platform.myGroups?.length);

  const isConnectionStatusOk = isWithinLastMonths(
    new Date(platform.last_connectivity_check),
    1
  );

  const isLastConnectivityCheckDisplayed =
    !isTrial ||
    platform?.deployment_request?.hub_status ===
      DeploymentRequestHubStatus.Active;

  console.log('platform', platform);
  return (
    <section className="flex justify-between p-xl">
      <ul className="text-sm flex flex-col gap-l">
        {platform.title && (
          <li>
            <span className="mr-xs text-default-secondary">
              {t('Register.Details.ProductName')}:
            </span>
            {platform.title}
          </li>
        )}
        <li>
          <span className="mr-xs text-default-secondary">
            {t('Register.Details.ProductURL')}:
          </span>
          <span>{platform.url ? platform.url : '-'}</span>
        </li>
        {platform.deployment_request?.hub_status && (
          <li>
            <span className="mr-xs text-default-secondary">
              {t('Register.Details.Status')}:
            </span>
            {formatTitleCase(platform.deployment_request?.hub_status)}
            {isCancellable && (
              <Button
                priority="tertiary"
                variant="destructive"
                className="m-0 p-0 ml-4 h-full underline"
                onClick={() => setOpenCancelSheet(true)}>
                {t('Utils.Cancel')}
              </Button>
            )}
          </li>
        )}
        {isTrial ? (
          <>
            <li>
              <span className="mr-xs text-default-secondary">
                {t('Register.Details.StartDate')}:
              </span>
              {platform.subscription?.start_date &&
              platform.subscription.end_date
                ? formatDate(platform.subscription.start_date)
                : '-'}
            </li>
            <li>
              <span className="mr-xs text-default-secondary">
                {t('Register.Details.EndDate')}:
              </span>
              {platform.subscription?.end_date
                ? formatDate(platform.subscription?.end_date)
                : '-'}
            </li>
          </>
        ) : (
          <>
            <li>
              <span className="mr-xs text-default-secondary">
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
            <span className="mr-xs text-default-secondary">
              {t('Register.Details.Region')}:
            </span>
            {t(`Region.${platform.deployment_request.region.toUpperCase()}`)}
          </li>
        )}
        <li>
          <span className="mr-xs text-default-secondary">
            {t('Register.Details.License')}:
          </span>
          {t(CONTRACT_LABEL_BY_CONTRACT[platform.contract])}
        </li>
        {isLastConnectivityCheckDisplayed && (
          <>
            <li>
              <span className="mr-xs text-default-secondary">
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
              <span className="mr-xs text-default-secondary">
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
              <span className="mr-xs text-default-secondary">
                {t('Register.Details.Access')}:
              </span>
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

      {platform.deployment_request && (
        <TrialCancelSheet
          deploymentRequestId={platform.deployment_request.id}
          isCancellationDefinitive={isCancellationDefinitive}
          open={openCancelSheet}
          setOpen={setOpenCancelSheet}
        />
      )}
    </section>
  );
};
