import type { Management } from 'auth0';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { logApp } from '../../utils/app-logger.util';
import { auth0ClientImplementation } from './implementation';
import { auth0ClientMock } from './mock';

export interface Auth0UpdateUser {
  email: string;
  first_name?: string;
  last_name?: string;
  picture?: string;
  country?: string;
}

export interface Auth0UpdateUserRBACInstance {
  [key: string]: {
    groups: string[];
  };
}

export interface Auth0Client {
  updateUser(user: Auth0UpdateUser): Promise<void>;
  resetPassword(email: string): Promise<void>;
  createAudienceAPI(
    organization_name: string,
    platform_id: string
  ): Promise<void>;
  deleteAudienceAPI(
    organization_id: OrganizationId,
    platform_id: string
  ): Promise<void>;
  updateUserRBACInstance(
    email: string,
    userRBACInstance: Auth0UpdateUserRBACInstance,
    prefetchedAuth0Users?: Management.UserResponseSchema[]
  ): Promise<void>;
  // Batched lookup, keys are lowercased emails; emails without account are absent.
  getUsersByEmails(
    emails: string[]
  ): Promise<Map<string, Management.UserResponseSchema[]>>;
}

const isAuth0Enabled = !(
  process.env.VITEST_MODE ||
  process.env.NODE_ENV === 'test' ||
  process.env.LOCAL_DEV
);
if (!isAuth0Enabled) {
  logApp.warn('auth0 disabled, using client mock');
}

export const auth0Client: Auth0Client = isAuth0Enabled
  ? auth0ClientImplementation
  : auth0ClientMock;
