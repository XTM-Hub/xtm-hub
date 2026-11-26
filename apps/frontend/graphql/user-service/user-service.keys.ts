import {
  type UserServicesFromSubscriptionQueryVariables,
  useUserServicesFromSubscriptionQuery,
} from '@graphql/generated';

export const userServicesKeys = {
  all: useUserServicesFromSubscriptionQuery.getRootKey,
  list: (variables: UserServicesFromSubscriptionQueryVariables) =>
    useUserServicesFromSubscriptionQuery.getKey(variables),
};
