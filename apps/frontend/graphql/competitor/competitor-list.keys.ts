import {
  type CompetitorsListQueryVariables,
  useCompetitorsListQuery,
} from '@graphql/generated';

export const competitorListKeys = {
  all: useCompetitorsListQuery.getRootKey,
  list: (variables: CompetitorsListQueryVariables) =>
    useCompetitorsListQuery.getKey(variables),
};
