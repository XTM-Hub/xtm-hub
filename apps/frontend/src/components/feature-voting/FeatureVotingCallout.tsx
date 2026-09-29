'use client';

import { getFeatureVotingTheme } from '@/components/feature-voting/feature-voting-theme';
import usePublicPath from '@/hooks/use-public-path';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  APP_PATH,
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
  XTM_PLATFORM_ROADMAP_SLUG,
} from '@/utils/path/constant';
import { CampaignIcon } from '@filigran/icon';
import { GradientButton } from '@filigran/ui/servers';
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
      className={`mx-s mt-s mb-l flex flex-wrap items-center justify-between gap-m rounded border p-m ${theme.containerClassName}`}
      style={theme.containerStyle}>
      <div className="flex items-start gap-m">
        <CampaignIcon className="mt-xs size-5 shrink-0" />
        <div className="flex flex-col gap-xs">
          <p className={theme.titleClassName}>
            {t('FeatureVoting.CalloutTitle')}
          </p>
          <p className={theme.descriptionClassName}>
            {round.description ?? t('FeatureVoting.CalloutSubtitle')}
          </p>
        </div>
      </div>
      {/* asChild keeps the link itself as the only interactive element, so the
          gradient has to be applied by hand rather than through textGradient. */}
      <GradientButton
        asChild
        textGradient={false}
        gradientFrom={theme.gradientFrom}
        gradientTo={theme.gradientTo}
        gradientBg={theme.gradientBg}>
        <Link href={href}>
          <span className="bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] bg-clip-text text-transparent">
            {t('FeatureVoting.CalloutButton')}
          </span>
        </Link>
      </GradientButton>
    </div>
  );
};
