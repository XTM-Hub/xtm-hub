import { AuthenticationClient, Management, ManagementClient } from 'auth0';
import config from 'config';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { OrganizationDomain } from '../../modules/organization-management/organization/organization.domain';
import { logApp } from '../../utils/app-logger.util';
import { chunk } from '../../utils/utils';
import {
  EMAILS_PER_LOOKUP,
  USERS_LIST_PAGE_SIZE,
  buildEmailsQuery,
  buildUserMetadataUpdate,
  groupAccountsByEmail,
  withRateLimitRetry,
} from './auth0.util';
import {
  Auth0Client,
  Auth0UpdateUser,
  Auth0UpdateUserRBACInstance,
} from './client';

const CONNECTION_TYPE = 'Username-Password-Authentication';
// Retries on 429 are handled by withRateLimitRetry (waits for x-ratelimit-reset).
const NO_SDK_RETRY = { maxRetries: 0 };

interface ClientConfiguration {
  domain: string;
  clientId: string;
  clientSecret: string;
}

const clientConfiguration: ClientConfiguration = config.get('auth0');

const managementClient = new ManagementClient(clientConfiguration);
const authenticationClient = new AuthenticationClient(clientConfiguration);

export const auth0ClientImplementation: Auth0Client = {
  updateUser: async (user: Auth0UpdateUser): Promise<void> => {
    const auth0_users = await managementClient.users.listUsersByEmail({
      email: user.email,
    });
    if (auth0_users.length === 0) {
      throw new Error('AUTH0_USER_NOT_FOUND_ERROR');
    }

    await Promise.all(
      auth0_users.map(async (auth0_user) => {
        if (!auth0_user.user_id) return;
        await managementClient.users.update(auth0_user.user_id, {
          given_name: user.first_name,
          family_name: user.last_name,
          user_metadata: {
            country: user.country,
          },
          picture: user.picture,
        });
      })
    );
  },
  updateUserRBACInstance: async (
    email: string,
    userRBACInstance: Auth0UpdateUserRBACInstance,
    prefetchedAuth0Users?: Management.UserResponseSchema[]
  ): Promise<void> => {
    const auth0_users =
      prefetchedAuth0Users ??
      (await managementClient.users.listUsersByEmail({ email }));
    if (auth0_users.length === 0) {
      throw new Error('AUTH0_USER_NOT_FOUND_ERROR');
    }

    await Promise.all(
      auth0_users.map(async (auth0_user) => {
        if (!auth0_user.user_id) return;
        const userId = auth0_user.user_id;
        const update = buildUserMetadataUpdate(auth0_user, userRBACInstance);
        if (prefetchedAuth0Users) {
          await withRateLimitRetry(() =>
            managementClient.users.update(userId, update, NO_SDK_RETRY)
          );
          return;
        }
        await managementClient.users.update(userId, update);
      })
    );
  },
  getUsersByEmails: async (
    emails: string[]
  ): Promise<Map<string, Management.UserResponseSchema[]>> => {
    const accounts: Management.UserResponseSchema[] = [];
    const uniqueEmails = [...new Set(emails.map((e) => e.toLowerCase()))];

    for (const emailsChunk of chunk(uniqueEmails, EMAILS_PER_LOOKUP)) {
      const page = await withRateLimitRetry(() =>
        managementClient.users.list(
          {
            q: buildEmailsQuery(emailsChunk),
            search_engine: 'v3',
            per_page: USERS_LIST_PAGE_SIZE,
            fields: 'user_id,email,last_password_reset,user_metadata',
            include_fields: true,
          },
          NO_SDK_RETRY
        )
      );
      const remaining = page.rawResponse.headers?.get('x-ratelimit-remaining');
      if (remaining) {
        logApp.debug('Auth0 rate limit after users lookup', { remaining });
      }
      accounts.push(...page.data);
      while (page.hasNextPage()) {
        await withRateLimitRetry(() => page.getNextPage());
        accounts.push(...page.data);
      }
    }

    return groupAccountsByEmail(accounts);
  },
  resetPassword: async (email: string): Promise<void> => {
    await authenticationClient.database.changePassword({
      email,
      connection: CONNECTION_TYPE,
    });
  },
  createAudienceAPI: async (
    organization_name: string,
    platform_id: string
  ): Promise<void> => {
    await managementClient.resourceServers.create({
      name: `${organization_name}_${platform_id}`,
      identifier: platform_id,
      signing_alg: 'RS256',
    });
  },
  deleteAudienceAPI: async (
    organization_id: OrganizationId,
    platform_id: string
  ): Promise<void> => {
    const organization = await OrganizationDomain.loadOrganizationBy({
      id: organization_id,
    });
    logApp.info(
      `Delete API Audience for organization ${organization?.name} with platform_id ${platform_id}`
    );
    await managementClient.resourceServers.delete(platform_id);
  },
};
