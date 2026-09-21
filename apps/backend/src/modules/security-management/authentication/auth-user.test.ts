import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { UserId } from '../../../model/kanel/public/User';
import { UserLoadUserBy } from '../../../model/user';
import { UserDomain } from '../../organization-management/user/user-domain/user.domain';
import { UserProvisioningApp } from '../../organization-management/user/user-provisioning/user-provisioning.app';
import { UserHelper } from '../../organization-management/user/user.helper';
import { isSessionUserActive } from './auth-user';

const asSessionUser = (id: string) => ({ id }) as UserLoadUserBy;

const createTestUser = async () => {
  const email = `auth-user-session-${uuidv4()}@filigran.io`;
  await UserProvisioningApp.autoProvisionNewUser({ email });
  const user = (await UserDomain.loadUserBy({ email }))!;
  return { email, user };
};

describe('isSessionUserActive', () => {
  describe('with a session that carries no usable identity', () => {
    it.each`
      sessionUser          | description
      ${undefined}         | ${'no user at all'}
      ${{}}                | ${'user without an id'}
      ${{ id: undefined }} | ${'user with an undefined id'}
      ${{ id: '' }}        | ${'user with an empty id'}
    `('should return false for $description', async ({ sessionUser }) => {
      await expect(isSessionUserActive(sessionUser)).resolves.toBe(false);
    });
  });

  describe('against the database', () => {
    let email: string | undefined;

    afterEach(async () => {
      if (email) {
        await UserHelper.removeUser({ email });
        email = undefined;
      }
    });

    it('should return true for an existing active user', async () => {
      const testUser = await createTestUser();
      email = testUser.email;

      await expect(
        isSessionUserActive(asSessionUser(testUser.user.id))
      ).resolves.toBe(true);
    });

    it('should return false once the account has been disabled', async () => {
      const testUser = await createTestUser();
      email = testUser.email;
      await UserDomain.updateUser(testUser.user.id, { disabled: true });

      await expect(
        isSessionUserActive(asSessionUser(testUser.user.id))
      ).resolves.toBe(false);
    });

    it('should return false once the account has been deleted', async () => {
      const { email: userEmail, user } = await createTestUser();
      await UserHelper.removeUser({ email: userEmail });

      await expect(isSessionUserActive(asSessionUser(user.id))).resolves.toBe(
        false
      );
    });

    it('should return false for an id that never existed', async () => {
      await expect(
        isSessionUserActive(asSessionUser(uuidv4() as UserId))
      ).resolves.toBe(false);
    });
  });
});
