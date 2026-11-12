'use client';

import { getFeatureVotingTheme } from '@/components/feature-voting/feature-voting-theme';
import usePublicPath from '@/hooks/use-public-path';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  APP_PATH,
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
  XTM_PLATFORM_ROADMAP_SLUG,
} from '@/utils/path/constant';
import { Button } from '@filigran/design-system';
import { CampaignIcon } from '@filigran/icon';
import { featureVotingKeys } from '@graphql/feature-voting/feature-voting.keys';
import {
  ServiceDefinitionIdentifier,
  useCurrentVotingRoundCalloutQuery,
} from '@graphql/generated';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useMemo } from 'react';

interface FeatureVotingCalloutProps {
  serviceInstanceId: string;
}

/**
 * Teaser for the round open on that roadmap. Renders nothing while loading and
 * nothing when no round is collecting votes, so the roadmap never shows a call
 * to action that leads to an empty page.
 */
export const FeatureVotingCallout = ({
  serviceInstanceId,
}: FeatureVotingCalloutProps) => {
  const t = useTranslate();
  const locale = useLocale();
  const isPublicPath = usePublicPath();

  const variables = useMemo(
    () => ({ service_instance_id: serviceInstanceId }),
    [serviceInstanceId]
  );

  const { data, isLoading } = useCurrentVotingRoundCalloutQuery(
    portalGraphqlClient,
    variables,
    { queryKey: featureVotingKeys.callout(variables) }
  );

  const round = data?.currentVotingRound;
  if (isLoading || !round) {
    return null;
  }

  // The voting page lives under the roadmap it belongs to, on both sides.
  const href = isPublicPath
    ? `/${locale}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${XTM_PLATFORM_ROADMAP_SLUG}/feature-voting`
    : `/${APP_PATH}/service/${ServiceDefinitionIdentifier.XtmPlatformRoadmap}/${serviceInstanceId}/feature-voting`;

  const theme = getFeatureVotingTheme(round.theme);

  return (
    <div
      className={`mx-2 mt-2 mb-4 flex flex-wrap items-center justify-between gap-3 rounded border p-3 ${theme.containerClassName}`}
      style={theme.containerStyle}>
      <div className="flex items-start gap-3">
        <CampaignIcon className="mt-1 size-5 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className={theme.titleClassName}>
            {t('FeatureVoting.CalloutTitle')}
          </p>
          <p className={theme.descriptionClassName}>
            {round.description ?? t('FeatureVoting.CalloutSubtitle')}
          </p>
        </div>
      </div>
      <Button
        asChild
        variant="highlight"
        priority="secondary">
        <Link
          {...analyticsId('roadmap_feature_voting_open')}
          href={href}>
          {t('FeatureVoting.CalloutButton')}
        </Link>
      </Button>
    </div>
  );
};
