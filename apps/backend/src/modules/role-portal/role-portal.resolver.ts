import { Resolvers } from '../../__generated__/resolvers-types';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { RolePortalApp } from './role-portal.app';
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
  Mutation: {
    addSSOGroupRolePortal: async (_, { input }) => {
      try {
        return await RolePortalApp.addSSOGroupRolePortal(input);
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
  },
};

export default rolePortalResolver;
