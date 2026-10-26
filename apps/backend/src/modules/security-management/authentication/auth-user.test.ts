import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { UserAccountStatus } from '../../../__generated__/resolvers-types';
import portalConfig from '../../../config';
import { UserId } from '../../../model/kanel/public/User';
import {
  ProviderUserInfo,
  UserInfo,
  UserLoadUserBy,
} from '../../../model/user';
import {
  PLATFORM_IDP_GROUP,
  PLATFORM_ORGANIZATION_UUID,
  ROLE_ADMIN,
} from '../../../portal.const';
import { ForbiddenErrorCode } from '../../../utils/error/error.code';
import { ServiceGroupApp } from '../../deployment/group/service-group.app';
import { UserDomain } from '../../organization-management/user/user-domain/user.domain';
import { UserOrganizationPendingDomain } from '../../organization-management/user/user-pending/user-organization-pending.domain';
import { UserProvisioningApp } from '../../organization-management/user/user-provisioning/user-provisioning.app';
import { UserHelper } from '../../organization-management/user/user.helper';
import {
  authenticateUser,
  isSessionUserActive,
  loginFromProvider,
} from './auth-user';

vi.mock('../../deployment/group/service-group.app', () => ({
  ServiceGroupApp: {
    grantAccessAtLogin: vi.fn(),
  },
}));

const asSessionUser = (id: string) => ({ id }) as UserLoadUserBy;

const createTestUser = async () => {
  const email = `auth-user-session-${uuidv4()}@filigran.io`;
  await UserProvisioningApp.autoProvisionNewUser({ email });
  const user = (await UserDomain.loadUserBy({ email }))!;
  return { email, user };
};

const buildResponse = () =>
  ({ cookie: vi.fn() }) as unknown as Parameters<typeof authenticateUser>[1];
const asUserInfo = (email: string): UserInfo => ({
  email,
  first_name: 'Test',
  last_name: 'User',
  roles: [],
});
const asProviderUserInfo = (
  email: string,
  idpSubject: string,
  {
    groups = [PLATFORM_IDP_GROUP],
    roles = [],
  }: { groups?: string[]; roles?: string[] } = {}
): ProviderUserInfo => ({
  ...asUserInfo(email),
  idp_subject: idpSubject,
  groups,
  roles,
});
const newEmail = () => `auth-user-login-${uuidv4()}@filigran.io`;
const newIdpSubject = () => `auth0|${uuidv4()}`;
const loadIdpSubject = async (email: string) => {
  const [user] = await UserDomain.loadUser({ email });
  return user?.idp_subject;
};

const loadFiligranRights = async (email: string) => {
  const user = await UserDomain.loadUserBy({ email });
  return {
    roles: (user?.roles_portal ?? []).map(({ name }) => name),
    isPlatformMember: (user?.organizations ?? []).some(
      ({ id }) => id === PLATFORM_ORGANIZATION_UUID
    ),
  };
};
const isPendingInPlatform = async (email: string) => {
  const user = await UserDomain.loadUserBy({ email });
  const pending =
    await UserOrganizationPendingDomain.loadUserOrganizationPending({
      user_id: user?.id,
      organization_id: PLATFORM_ORGANIZATION_UUID,
    });
  return pending.length > 0;
};

const FILIGRAN_ADMIN = {
  groups: [PLATFORM_IDP_GROUP],
  roles: [ROLE_ADMIN.name],
};

const UNVERIFIED_IDP_SUBJECT = 'auth0|unverified-user';
const REGENERATE_ERROR = 'session store unavailable';

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

  it('should delegate the access grant to ServiceGroupApp then write the user into the session', async () => {
    const testUser = await createTestUser();
    email = testUser.email;
    await UserDomain.updateUser(testUser.user.id, {
      status: UserAccountStatus.Waiting,
    });

    const req = TestHelper.session.buildRequest();
    await authenticateUser(req, buildResponse(), asUserInfo(email));

    expect(req.session.user?.id).toBe(testUser.user.id);
    expect(ServiceGroupApp.grantAccessAtLogin).toHaveBeenCalledExactlyOnceWith(
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

    const req = TestHelper.session.buildRequest();
    await expect(
      authenticateUser(req, buildResponse(), asUserInfo(email))
    ).rejects.toThrow();

    expect(req.session.user).toBeUndefined();
    expect(ServiceGroupApp.grantAccessAtLogin).not.toHaveBeenCalled();
  });

  it('should sign the user into a new session id when the login succeeds', async () => {
    // Given
    const testUser = await createTestUser();
    email = testUser.email;
    const req = TestHelper.session.buildRequest();
    const preLoginSessionId = req.sessionID;

    // When
    await authenticateUser(req, buildResponse(), asUserInfo(email));

    // Then
    expect(req.sessionID).not.toBe(preLoginSessionId);
    expect(req.session).toMatchObject({ user: { id: testUser.user.id } });
  });

  it('should persist the new session before returning', async () => {
    // Given
    const testUser = await createTestUser();
    email = testUser.email;
    const req = TestHelper.session.buildRequest();

    // When
    await authenticateUser(req, buildResponse(), asUserInfo(email));

    // Then
    expect(req.session.save).toHaveBeenCalledOnce();
  });

  it('should forget a previously refused subject once the user is signed in', async () => {
    // Given
    const testUser = await createTestUser();
    email = testUser.email;
    const req = TestHelper.session.buildRequest({
      unverifiedIdpSubject: UNVERIFIED_IDP_SUBJECT,
    });

    // When
    await authenticateUser(req, buildResponse(), asUserInfo(email));

    // Then
    expect(req.session.unverifiedIdpSubject).toBeUndefined();
  });

  it('should keep the pre-login session when the user is disabled', async () => {
    // Given
    const testUser = await createTestUser();
    email = testUser.email;
    await UserDomain.updateUser(testUser.user.id, { disabled: true });
    const req = TestHelper.session.buildRequest();
    const preLoginSessionId = req.sessionID;

    // When
    await authenticateUser(req, buildResponse(), asUserInfo(email)).catch(
      () => undefined
    );

    // Then
    expect(req.sessionID).toBe(preLoginSessionId);
  });

  it('should keep the pre-login session when the user is unknown', async () => {
    // Given
    const req = TestHelper.session.buildRequest();
    const preLoginSessionId = req.sessionID;

    // When
    const logged = await authenticateUser(
      req,
      buildResponse(),
      asUserInfo(newEmail())
    );

    // Then
    expect({ logged, sessionID: req.sessionID }).toEqual({
      logged: undefined,
      sessionID: preLoginSessionId,
    });
  });

  it('should reject without signing the user in when the session cannot be regenerated', async () => {
    // Given
    const testUser = await createTestUser();
    email = testUser.email;
    const req = TestHelper.session.buildRequest(
      {},
      { regenerateError: new Error(REGENERATE_ERROR) }
    );

    // When
    const signingIn = authenticateUser(req, buildResponse(), asUserInfo(email));

    // Then
    await expect(signingIn).rejects.toThrow(REGENERATE_ERROR);
    expect(req.session.user).toBeUndefined();
  });
});

describe('loginFromProvider', () => {
  let emails: string[] = [];

  afterEach(async () => {
    for (const email of emails) {
      await UserHelper.removeUser({ email });
    }
    emails = [];
  });

  it('should refuse the sign-in when the IdP gives no subject', async () => {
    // Given
    const email = newEmail();

    // When
    const signingIn = loginFromProvider(asProviderUserInfo(email, ''));

    // Then
    await expect(signingIn).rejects.toThrow(
      ForbiddenErrorCode.IdpSubjectNotProvided
    );
  });

  it('should bind the subject to a new account on its first sign-in', async () => {
    // Given
    const email = newEmail();
    const idpSubject = newIdpSubject();
    emails.push(email);

    // When
    await loginFromProvider(asProviderUserInfo(email, idpSubject));

    // Then
    expect(await loadIdpSubject(email)).toBe(idpSubject);
  });

  it('should bind the subject to an existing account that has none yet', async () => {
    // Given
    const { email } = await createTestUser();
    const idpSubject = newIdpSubject();
    emails.push(email);

    // When
    await loginFromProvider(asProviderUserInfo(email, idpSubject));

    // Then
    expect(await loadIdpSubject(email)).toBe(idpSubject);
  });

  it('should sign in when the bound subject comes back', async () => {
    // Given
    const { email, user } = await createTestUser();
    const idpSubject = newIdpSubject();
    emails.push(email);
    await loginFromProvider(asProviderUserInfo(email, idpSubject));

    // When
    const signedIn = await loginFromProvider(
      asProviderUserInfo(email, idpSubject)
    );

    // Then
    expect(signedIn).toMatchObject({ id: user.id, idp_subject: idpSubject });
  });

  describe('while mismatches are only logged', () => {
    it('should still sign in when another subject claims a bound email', async () => {
      // Given
      const { email, user } = await createTestUser();
      emails.push(email);
      await loginFromProvider(asProviderUserInfo(email, newIdpSubject()));

      // When
      const signedIn = await loginFromProvider(
        asProviderUserInfo(email, newIdpSubject())
      );

      // Then
      expect(signedIn).toMatchObject({ id: user.id });
    });

    it('should keep the first subject when another subject claims a bound email', async () => {
      // Given
      const { email } = await createTestUser();
      const firstIdpSubject = newIdpSubject();
      emails.push(email);
      await loginFromProvider(asProviderUserInfo(email, firstIdpSubject));

      // When
      await loginFromProvider(asProviderUserInfo(email, newIdpSubject()));

      // Then
      expect(await loadIdpSubject(email)).toBe(firstIdpSubject);
    });

    it('should not bind a subject that is already bound to another account', async () => {
      // Given
      const idpSubject = newIdpSubject();
      const boundEmail = newEmail();
      const otherEmail = newEmail();
      emails.push(boundEmail, otherEmail);
      await loginFromProvider(asProviderUserInfo(boundEmail, idpSubject));

      // When
      await loginFromProvider(asProviderUserInfo(otherEmail, idpSubject));

      // Then
      expect(await loadIdpSubject(otherEmail)).toBeNull();
    });
  });

  describe('when mismatches are enforced', () => {
    beforeEach(() => {
      portalConfig.user_management.enforce_idp_subject = true;
    });

    afterEach(() => {
      portalConfig.user_management.enforce_idp_subject = false;
    });

    it('should refuse the sign-in when another subject claims a bound email', async () => {
      // Given
      const { email } = await createTestUser();
      emails.push(email);
      await loginFromProvider(asProviderUserInfo(email, newIdpSubject()));

      // When
      const signingIn = loginFromProvider(
        asProviderUserInfo(email, newIdpSubject())
      );

      // Then
      await expect(signingIn).rejects.toThrow(
        ForbiddenErrorCode.IdpSubjectMismatch
      );
    });

    it('should refuse the sign-in without creating an account when a bound subject claims another email', async () => {
      // Given
      const idpSubject = newIdpSubject();
      const boundEmail = newEmail();
      const otherEmail = newEmail();
      emails.push(boundEmail);
      await loginFromProvider(asProviderUserInfo(boundEmail, idpSubject));

      // When
      const signingIn = loginFromProvider(
        asProviderUserInfo(otherEmail, idpSubject)
      );

      // Then
      await expect(signingIn).rejects.toThrow(
        ForbiddenErrorCode.IdpSubjectMismatch
      );
      expect(await UserDomain.loadUser({ email: otherEmail })).toEqual([]);
    });
  });

  describe('rights from the Filigran group', () => {
    it('should add a member of the Filigran group to the platform organisation with its IdP roles', async () => {
      // Given
      const email = newEmail();
      emails.push(email);

      // When
      await loginFromProvider(
        asProviderUserInfo(email, newIdpSubject(), FILIGRAN_ADMIN)
      );

      // Then
      expect(await loadFiligranRights(email)).toEqual({
        roles: [ROLE_ADMIN.name],
        isPlatformMember: true,
      });
    });

    it('should add a new account with the Filigran group to the platform organisation automatically', async () => {
      // Given
      const email = newEmail();
      emails.push(email);

      // When
      await loginFromProvider(asProviderUserInfo(email, newIdpSubject()));

      // Then
      expect({
        isPlatformMember: (await loadFiligranRights(email)).isPlatformMember,
        isPending: await isPendingInPlatform(email),
      }).toEqual({ isPlatformMember: true, isPending: false });
    });

    it('should move a pending account to the platform organisation once it signs in with the Filigran group', async () => {
      // Given
      const { email } = await createTestUser();
      emails.push(email);

      // When
      await loginFromProvider(asProviderUserInfo(email, newIdpSubject()));

      // Then
      expect({
        isPlatformMember: (await loadFiligranRights(email)).isPlatformMember,
        isPending: await isPendingInPlatform(email),
      }).toEqual({ isPlatformMember: true, isPending: false });
    });

    it('should remove the Hub roles once the user loses its role in the IdP', async () => {
      // Given
      const email = newEmail();
      const idpSubject = newIdpSubject();
      emails.push(email);
      await loginFromProvider(
        asProviderUserInfo(email, idpSubject, FILIGRAN_ADMIN)
      );

      // When
      await loginFromProvider(asProviderUserInfo(email, idpSubject));

      // Then
      expect((await loadFiligranRights(email)).roles).toEqual([]);
    });

    describe('with a Filigran email outside the Filigran group', () => {
      it.each`
        description             | groups
        ${'no group'}           | ${[]}
        ${'another group only'} | ${['Customer']}
      `(
        'should refuse the sign-in without creating the account for $description',
        async ({ groups }: { groups: string[] }) => {
          // Given
          const email = newEmail();

          // When
          const signingIn = loginFromProvider(
            asProviderUserInfo(email, newIdpSubject(), {
              groups,
              roles: [ROLE_ADMIN.name],
            })
          );

          // Then
          await expect(signingIn).rejects.toThrow(
            ForbiddenErrorCode.FiligranGroupMissing
          );
          expect(await UserDomain.loadUser({ email })).toEqual([]);
        }
      );

      it('should refuse the sign-in and remove the Hub roles of an account that left the group', async () => {
        // Given
        const email = newEmail();
        const idpSubject = newIdpSubject();
        emails.push(email);
        await loginFromProvider(
          asProviderUserInfo(email, idpSubject, FILIGRAN_ADMIN)
        );

        // When
        const signingIn = loginFromProvider(
          asProviderUserInfo(email, idpSubject, {
            groups: [],
            roles: [ROLE_ADMIN.name],
          })
        );

        // Then
        await expect(signingIn).rejects.toThrow(
          ForbiddenErrorCode.FiligranGroupMissing
        );
        expect((await loadFiligranRights(email)).roles).toEqual([]);
      });
    });
  });
});
