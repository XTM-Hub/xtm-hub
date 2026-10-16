import { PassportStatic } from 'passport';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenErrorCode } from '../../../../utils/error/error.code';

type VerifyCallback = (
  req: { session: { unverifiedIdpSubject?: string } },
  tokens: { access_token: string; claims: () => { sub: string } },
  done: (error: Error | null, user?: unknown) => void
) => Promise<void>;

const mocks = vi.hoisted(() => ({
  fetchUserInfo: vi.fn(),
  providerLoginHandler: vi.fn(),
  verify: undefined as VerifyCallback | undefined,
}));

vi.mock('openid-client', () => ({
  discovery: vi.fn(async () => ({})),
  fetchUserInfo: mocks.fetchUserInfo,
}));

vi.mock('openid-client/passport', () => ({
  Strategy: vi.fn(function (_options: unknown, verify: VerifyCallback) {
    mocks.verify = verify;
  }),
}));

vi.mock('../login-handle', () => ({
  providerLoginHandler: mocks.providerLoginHandler,
}));

vi.mock('../../../role-portal/role-portal.domain', () => ({
  RolePortalDomain: {
    loadRolePortalsBySSOGroups: vi.fn(async () => ({ roles: null })),
  },
}));

import { addOIDCStrategy } from './oidc';

const EMAIL = 'jane.doe@example.com';
const SUB = 'auth0|jane-doe';
const ACCESS_TOKEN = 'access-token';
const GIVEN_NAME = 'Jane';
const FAMILY_NAME = 'Doe';

const buildUserinfo = (overrides: Record<string, unknown> = {}) => ({
  sub: SUB,
  email: EMAIL,
  email_verified: true,
  given_name: GIVEN_NAME,
  family_name: FAMILY_NAME,
  ...overrides,
});

const signIn = (req: Parameters<VerifyCallback>[0] = { session: {} }) => {
  if (!mocks.verify) {
    throw new Error('OIDC strategy was not registered');
  }
  return mocks.verify(
    req,
    { access_token: ACCESS_TOKEN, claims: () => ({ sub: SUB }) },
    vi.fn()
  );
};

describe('addOIDCStrategy', () => {
  beforeEach(async () => {
    await addOIDCStrategy({
      use: vi.fn(),
      serializeUser: vi.fn(),
      deserializeUser: vi.fn(),
    } as unknown as PassportStatic);
  });

  it('should sign the user in when the email is verified', async () => {
    // Given
    mocks.fetchUserInfo.mockResolvedValue(buildUserinfo());

    // When
    await signIn();

    // Then
    expect(mocks.providerLoginHandler).toHaveBeenCalledWith(
      {
        idp_subject: SUB,
        email: EMAIL,
        first_name: GIVEN_NAME,
        last_name: FAMILY_NAME,
        roles: [],
        picture: undefined,
      },
      expect.any(Function)
    );
  });

  it.each([
    ['false', false],
    ['missing', undefined],
    ['the string "true"', 'true'],
  ])(
    'should refuse the sign-in when email_verified is %s',
    async (_description, emailVerified) => {
      // Given
      mocks.fetchUserInfo.mockResolvedValue(
        buildUserinfo({ email_verified: emailVerified })
      );

      // When
      const signingIn = signIn();

      // Then
      await expect(signingIn).rejects.toThrow(
        new Error(ForbiddenErrorCode.EmailNotVerified)
      );
      expect(mocks.providerLoginHandler).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['an email/password account', 'auth0|jane-doe'],
    ['a social account', 'google-oauth2|1234'],
    ['an enterprise account', 'waad|Filigran|1234'],
  ])(
    'should offer to resend the verification email when refusing %s',
    async (_description, subject) => {
      // Given
      mocks.fetchUserInfo.mockResolvedValue(
        buildUserinfo({ sub: subject, email_verified: false })
      );

      // When
      const signingIn = signIn();

      // Then
      await expect(signingIn).rejects.toThrow(
        new Error(ForbiddenErrorCode.EmailNotVerified)
      );
      expect(mocks.providerLoginHandler).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['an email/password account', 'auth0|jane-doe'],
    ['a social account', 'google-oauth2|1234'],
    ['an enterprise account', 'waad|Filigran|1234'],
  ])(
    'should keep the refused subject in the session to resend the verification email for %s',
    async (_description, subject) => {
      // Given
      mocks.fetchUserInfo.mockResolvedValue(
        buildUserinfo({ sub: subject, email_verified: false })
      );
      const req = { session: {} as { unverifiedIdpSubject?: string } };

      // When
      await signIn(req).catch(() => undefined);

      // Then
      expect(req.session.unverifiedIdpSubject).toBe(subject);
    }
  );
});
