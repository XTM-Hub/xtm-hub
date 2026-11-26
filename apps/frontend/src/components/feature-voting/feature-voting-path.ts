import { APP_PATH } from '@/utils/path/constant';
import { ServiceDefinitionIdentifier } from '@graphql/generated';

/**
 * Voting only ever happens on the private feature-voting page. This builds
 * that page's path for a given service instance, optionally tagging it with
 * a `voteFeatureId` marker so the page can auto-cast the vote the visitor
 * originally clicked on the public page (e.g. after they log in).
 */
export const getFeatureVotingPrivatePath = (
  serviceInstanceId: string,
  featureId?: string
): string => {
  const base = `/${APP_PATH}/service/${ServiceDefinitionIdentifier.XtmPlatformRoadmap}/${serviceInstanceId}/feature-voting`;
  return featureId
    ? `${base}?voteFeatureId=${encodeURIComponent(featureId)}`
    : base;
};
