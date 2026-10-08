import {
  OrganizationCapability,
  Resolvers,
} from '../../../__generated__/resolvers-types';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { getErrorMessage } from '../../../utils/error/error-guard.util';
import { UnknownErrorCode } from '../../../utils/error/error.code';
import { mapToGraphQLError } from '../../../utils/error/error.mapping';
import { StillReferencedError } from '../../../utils/error/error.util';
import { createRelayIdScalar } from '../../../utils/scalar.util';
import { UserDomain } from '../user/user-domain/user.domain';
import { OrganizationApp } from './organization.app';
import { OrganizationDomain } from './organization.domain';

const resolvers: Resolvers = {
  OrganizationId: createRelayIdScalar<OrganizationId>('Organization'),
  Organization: {
    administrator_emails: async ({ id }) => {
      const administrators =
        await UserDomain.loadUsersByCapabilitiesInOrganization(id, [
          OrganizationCapability.AdministrateOrganization,
        ]);
      return administrators.map(({ email }) => email);
    },
  },
  Query: {
    organization: async (_, { id }) =>
      OrganizationDomain.loadOrganizationBy({ id: id as OrganizationId }),
    organizations: async (_, opts) => {
      return OrganizationDomain.loadOrganizations(opts);
    },
    userOrganizations: async (_, __, context) => {
      return OrganizationDomain.loadOrganizationsByUser(context.user.id);
    },
  },
  Mutation: {
    addOrganization: async (_, { input }) => {
      try {
        return await OrganizationApp.createOrganization(input);
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.AddOrganizationError);
      }
    },
    editOrganization: async (_, { id, input }) => {
      try {
        return await OrganizationApp.updateOrganization(
          id as OrganizationId,
          input
        );
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.EditOrganizationError);
      }
    },
    deleteOrganization: async (_, { id }) => {
      try {
        return await OrganizationApp.deleteOrganization(id as OrganizationId);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        if (errorMessage.includes('STILL_IN_ORGANIZATION')) {
          throw StillReferencedError(errorMessage);
        }

        throw mapToGraphQLError(
          error,
          UnknownErrorCode.DeleteOrganizationError
        );
      }
    },
  },
};

export default resolvers;
