import { Resolvers } from '../../__generated__/resolvers-types';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { RolePortalApp } from './role-portal.app';
import { RolePortalDomain } from './role-portal.domain';

const rolePortalResolver: Resolvers = {
  Query: {
    rolePortals: async () => {
      try {
        return await RolePortalDomain.loadRolePortals();
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
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
    updateSSOGroupRolePortal: async (_, { ssoGroup, rolePortal, input }) => {
      try {
        return await RolePortalApp.updateSSOGroupRolePortal(
          { ssoGroup, rolePortal },
          input
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    deleteSSOGroupRolePortal: async (_, { input }) => {
      try {
        return await RolePortalDomain.deleteSSOGroupRolePortal({
          ssoGroup: input.ssoGroup,
          rolePortalName: input.rolePortal,
        });
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    addRolePortal: async (_, { input }) => {
      try {
        return await RolePortalApp.addRolePortal(input);
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    updateRolePortal: async (_, { name, input }) => {
      try {
        return await RolePortalApp.updateRolePortal(name, input);
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    deleteRolePortal: async (_, { name }) => {
      try {
        return await RolePortalApp.deleteRolePortal(name);
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
  },
};

export default rolePortalResolver;
