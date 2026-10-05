import { Resolvers } from '../../__generated__/resolvers-types';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { RolePortalDomain } from './role-portal.domain';

const rolePortalResolver: Resolvers = {
  Query: {
    ssoGroupRolePortals: async () => {
      try {
        return await RolePortalDomain.loadSSOGroupRolePortals();
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
  },
};

export default rolePortalResolver;
