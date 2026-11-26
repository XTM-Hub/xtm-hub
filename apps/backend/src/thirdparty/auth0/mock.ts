/* eslint-disable @typescript-eslint/no-unused-vars */

import type { Management } from 'auth0';
import {
  Auth0Client,
  Auth0UpdateUser,
  Auth0UpdateUserRBACInstance,
} from './client';

export const auth0ClientMock: Auth0Client = {
  updateUser(user: Auth0UpdateUser): Promise<void> {
    return Promise.resolve();
  },

  resetPassword(email: string): Promise<void> {
    return Promise.resolve();
  },

  sendVerificationEmail(userId: string): Promise<void> {
    return Promise.resolve();
  },

  updateUserRBACInstance(
    email: string,
    userRBACInstance: Auth0UpdateUserRBACInstance,
    prefetchedAuth0Users?: Management.UserResponseSchema[]
  ): Promise<void> {
    return Promise.resolve();
  },

  getUsersByEmails(
    emails: string[]
  ): Promise<Map<string, Management.UserResponseSchema[]>> {
    return Promise.resolve(new Map());
  },
};
