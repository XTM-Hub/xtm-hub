import { CONTRACT_LABEL_BY_CONTRACT } from '@/components/registration/PlatformIdentifierMapping';
import { registeredPlatformByServiceInstanceIdFragment } from '@/components/registration/register/register.graphql';
import { useTranslate } from '@/hooks/use-translate';
import { isWithinLastMonths, useDateFormatter } from '@/utils/date';
import { formatTitleCase } from '@/utils/format/case';
import { registeredPlatformByServiceInstanceId_fragment$key } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import {
  DeploymentRequestHubStatus,
  PlatformContract,
} from '@graphql/generated';
import { useFragment } from 'react-relay';

interface RegistrationDetailsProps {
  registeredPlatform: registeredPlatformByServiceInstanceId_fragment$key;
}

export const RegistrationDetails = ({
  registeredPlatform,
}: RegistrationDetailsProps) => {
  const t = useTranslate();
  const formatDate = useDateFormatter();

  const platform =
    useFragment<registeredPlatformByServiceInstanceId_fragment$key>(
      registeredPlatformByServiceInstanceIdFragment,
      registeredPlatform
    );

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

  return (
    <section className="flex justify-between p-6">
      <ul className="text-sm flex flex-col gap-4">
        {platform.title && (
          <li>
            <span className="mr-1 text-default-secondary">
              {t('Register.Details.ProductName')}:
            </span>
            {platform.title}
          </li>
        )}
        <li>
          <span className="mr-1 text-default-secondary">
            {t('Register.Details.ProductURL')}:
          </span>
          <span>{platform.url ? platform.url : '-'}</span>
        </li>
        {platform.deployment_request?.hub_status && (
          <li>
            <span className="mr-1 text-default-secondary">
              {t('Register.Details.Status')}:
            </span>
            {formatTitleCase(platform.deployment_request?.hub_status)}
          </li>
        )}
        {isTrial ? (
          <>
            <li>
              <span className="mr-1 text-default-secondary">
                {t('Register.Details.StartDate')}:
              </span>
              {platform.subscription?.start_date &&
              platform.subscription.end_date
                ? formatDate(platform.subscription.start_date, 'DATE_MEDIUM')
                : '-'}
            </li>
            <li>
              <span className="mr-1 text-default-secondary">
                {t('Register.Details.EndDate')}:
              </span>
              {platform.subscription?.end_date
                ? formatDate(platform.subscription?.end_date, 'DATE_MEDIUM')
                : '-'}
            </li>
          </>
        ) : (
          <>
            <li>
              <span className="mr-1 text-default-secondary">
                {t('Register.Details.ConnectedOn')}:
              </span>
              {platform.subscription?.start_date
                ? formatDate(platform.subscription.start_date, 'DATE_MEDIUM')
                : '-'}
            </li>
          </>
        )}

        {platform.deployment_request?.region && (
          <li>
            <span className="mr-1 text-default-secondary">
              {t('Register.Details.Region')}:
            </span>
            {t(`Region.${platform.deployment_request.region.toUpperCase()}`)}
          </li>
        )}
        <li>
          <span className="mr-1 text-default-secondary">
            {t('Register.Details.License')}:
          </span>
          {t(CONTRACT_LABEL_BY_CONTRACT[platform.contract])}
        </li>
        {isLastConnectivityCheckDisplayed && (
          <>
            <li>
              <span className="mr-1 text-default-secondary">
                {t('Register.Details.ConnectionStatus.Title')}:
              </span>
              <span
                className={
                  isConnectionStatusOk
                    ? 'text-feedback-success-primary'
                    : 'text-feedback-error-primary'
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
              <span className="mr-1 text-default-secondary">
                {t('Register.Details.LastConnectionCheck')}:
              </span>
              {platform.last_connectivity_check
                ? formatDate(platform.last_connectivity_check, 'DATE_MEDIUM')
                : '-'}
            </li>
          </>
        )}
        {isTrialActive && (
          <li>
            <span>
              <span className="mr-1 text-default-secondary">
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
                  <span className="text-feedback-error-primary mr-1">
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

        <li>
          <span className="mr-1 text-default-secondary">
            {t('Register.Details.PlatformVersion')}:
          </span>
          {platform.version || '-'}
        </li>
      </ul>
    </section>
  );
};
