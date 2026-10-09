'use client';

import { registeredPlatformByServiceInstanceIdFragment } from '@/components/registration/register/register.graphql';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { computePeriodProgress, useDateFormatter } from '@/utils/date';
import { ProgressBar } from '@filigran/design-system';
import { registeredPlatformByServiceInstanceId_fragment$key } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import { useRegisteredSaasPlatformMetadataQuery } from '@graphql/generated';
import { registrationKeys } from '@graphql/registration/registration.keys';
import { useId } from 'react';
import { useFragment } from 'react-relay';

interface RegistrationMetadataProps {
  registeredPlatform: registeredPlatformByServiceInstanceId_fragment$key;
}

export const RegistrationMetadata = ({
  registeredPlatform,
}: RegistrationMetadataProps) => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const contractLabelId = useId();
  const daysLeftId = useId();

  const platform =
    useFragment<registeredPlatformByServiceInstanceId_fragment$key>(
      registeredPlatformByServiceInstanceIdFragment,
      registeredPlatform
    );

  const variables = { platformId: platform.platform_id };
  const { data } = useRegisteredSaasPlatformMetadataQuery(
    portalGraphqlClient,
    variables,
    { queryKey: registrationKeys.registeredSaasPlatformMetadata(variables) }
  );
  const metadata = data?.registeredSaasPlatformMetadata;

  if (!metadata) {
    return null;
  }

  const { daysLeft, elapsedPercent } = computePeriodProgress(
    metadata.startDate,
    metadata.endDate
  );

  return (
    <section className="flex justify-between p-xl">
      <ul className="text-sm flex flex-col gap-l">
        <li>
          <span className="mr-xs text-default-secondary">
            {t('Register.Metrics.Metadata.Hostname')}:
          </span>
          {metadata.hostname}
        </li>
        <li>
          <span className="mr-xs text-default-secondary">
            {t('Register.Metrics.Metadata.SubscribedPlan')}:
          </span>
          {metadata.subscribedPlan}
        </li>
        <li className="flex flex-col gap-s">
          <span>
            <span
              id={contractLabelId}
              className="mr-xs text-default-secondary">
              {t('Register.Metrics.Metadata.Contract')}:
            </span>
            {formatDate(metadata.startDate)} → {formatDate(metadata.endDate)}
          </span>
          <div className="flex items-center gap-s">
            <ProgressBar
              value={elapsedPercent}
              aria-labelledby={`${contractLabelId} ${daysLeftId}`}
              className="flex-1"
            />
            <span
              id={daysLeftId}
              className="shrink-0">
              {t('Register.Metrics.Metadata.DaysLeft', { days: daysLeft })}
            </span>
          </div>
        </li>
        <li>
          <span className="mr-xs text-default-secondary">
            {t('Register.Metrics.Metadata.RegionalArea')}:
          </span>
          {metadata.regionalArea}
        </li>
        <li>
          <span className="mr-xs text-default-secondary">
            {t('Register.Metrics.Metadata.PlatformVersion')}:
          </span>
          {metadata.platformVersion}
        </li>
      </ul>
    </section>
  );
};
