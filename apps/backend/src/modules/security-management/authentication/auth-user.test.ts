import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserAccountStatus } from '../../../__generated__/resolvers-types';
import { UserId } from '../../../model/kanel/public/User';
import { UserInfo, UserLoadUserBy } from '../../../model/user';
import { ServiceGroupApp } from '../../deployment/group/service-group.app';
import { UserDomain } from '../../organization-management/user/user-domain/user.domain';
import { UserProvisioningApp } from '../../organization-management/user/user-provisioning/user-provisioning.app';
import { UserHelper } from '../../organization-management/user/user.helper';
import { authenticateUser, isSessionUserActive } from './auth-user';

vi.mock('../../deployment/group/service-group.app', () => ({
  ServiceGroupApp: {
    grantAccessIfWaiting: vi.fn(),
  },
}));

const asSessionUser = (id: string) => ({ id }) as UserLoadUserBy;

const createTestUser = async () => {
  const email = `auth-user-session-${uuidv4()}@filigran.io`;
  await UserProvisioningApp.autoProvisionNewUser({ email });
  const user = (await UserDomain.loadUserBy({ email }))!;
  return { email, user };
};

const buildRequest = () =>
  ({ session: { save: vi.fn() } }) as unknown as Parameters<
    typeof authenticateUser
  >[0];
const buildResponse = () =>
  ({ cookie: vi.fn() }) as unknown as Parameters<typeof authenticateUser>[1];
const asUserInfo = (email: string): UserInfo => ({
  email,
  first_name: 'Test',
  last_name: 'User',
  roles: [],
});

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

describe('authenticateUser', () => {
  let email: string | undefined;

  afterEach(async () => {
    vi.clearAllMocks();
    if (email) {
      await UserHelper.removeUser({ email });
      email = undefined;
    }
  });

  it('should update the session then delegate the access grant to ServiceGroupApp', async () => {
    const testUser = await createTestUser();
    email = testUser.email;
    await UserDomain.updateUser(testUser.user.id, {
      status: UserAccountStatus.Waiting,
    });

    const req = buildRequest();
    await authenticateUser(req, buildResponse(), asUserInfo(email));

    expect(req.session.user?.id).toBe(testUser.user.id);
    expect(
      ServiceGroupApp.grantAccessIfWaiting
    ).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        id: testUser.user.id,
        status: UserAccountStatus.Waiting,
      })
    );
  });

  it('should reject and not touch the session for a disabled user', async () => {
    const testUser = await createTestUser();
    email = testUser.email;
    await UserDomain.updateUser(testUser.user.id, { disabled: true });

    const req = buildRequest();
    await expect(
      authenticateUser(req, buildResponse(), asUserInfo(email))
    ).rejects.toThrow();

    expect(req.session.user).toBeUndefined();
    expect(ServiceGroupApp.grantAccessIfWaiting).not.toHaveBeenCalled();
  });
});
