import {
  type SubscriptionByIdQueryVariables,
  type SubscriptionsListQueryVariables,
  useSubscriptionByIdQuery,
  useSubscriptionsListQuery,
} from '@graphql/generated';

export const subscriptionKeys = {
  all: useSubscriptionsListQuery.getRootKey,
  list: (variables: SubscriptionsListQueryVariables) =>
    useSubscriptionsListQuery.getKey(variables),
  allById: useSubscriptionByIdQuery.getRootKey,
  byId: (variables: SubscriptionByIdQueryVariables) =>
    useSubscriptionByIdQuery.getKey(variables),
};
