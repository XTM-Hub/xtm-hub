import {
  CurrentVotingRoundCalloutQueryVariables,
  CurrentVotingRoundQueryVariables,
  useCurrentVotingRoundCalloutQuery,
  useCurrentVotingRoundQuery,
} from '@graphql/generated';

export const featureVotingKeys = {
  currentAll: useCurrentVotingRoundQuery.getRootKey,
  current: (variables: CurrentVotingRoundQueryVariables) =>
    useCurrentVotingRoundQuery.getKey(variables),
  calloutAll: useCurrentVotingRoundCalloutQuery.getRootKey,
  callout: (variables: CurrentVotingRoundCalloutQueryVariables) =>
    useCurrentVotingRoundCalloutQuery.getKey(variables),
};
