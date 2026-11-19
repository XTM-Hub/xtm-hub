import { describe, expect, it } from 'vitest';
import { TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import {
  ApiTokenScope,
  CreateApiTokenInput,
} from '../../__generated__/resolvers-types';
import { ApiTokenId } from '../../model/kanel/public/ApiToken';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserId } from '../../model/kanel/public/User';
import { UserLoadUserBy } from '../../model/user';
import {
  BadRequestErrorCode,
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../utils/error/error.code';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { ApiTokenApp } from './api-token.app';
import { API_TOKEN_MAX_LIFETIME_MS, ApiTokenHelper } from './api-token.helper';

const SECOND = TEST_ORGANIZATIONS.SECOND_ORGANIZATION;
const FILIGRAN = TEST_ORGANIZATIONS.FILIGRAN;
const DAY_MS = 24 * 60 * 60 * 1000;
const UNKNOWN_TOKEN_ID = 'f7a1c0de-0000-4000-8000-000000000099' as ApiTokenId;

const loadUser = async (id: UserId): Promise<UserLoadUserBy> =>
  (await UserDomain.loadUserBy({ 'User.id': id })) as UserLoadUserBy;

const input = (
  overrides: Partial<CreateApiTokenInput> = {}
): CreateApiTokenInput => ({
  name: 'Copilot',
  scope: ApiTokenScope.ReadWrite,
  organization_id: SECOND.ID,
  expires_at: new Date(Date.now() + 30 * DAY_MS),
  ...overrides,
});

describe('api token app create', () => {
  it('should create a token shown once, of which only the hash is kept', async () => {
    // Given
    const user = await loadUser(SECOND.USERS.SIMPLE.ID);

    // When
    const { token, api_token } = await ApiTokenApp.create(user, input());

    // Then
    expect(ApiTokenHelper.isWellFormed(token)).toBe(true);
    expect(api_token).toMatchObject({
      name: 'Copilot',
      scope: ApiTokenScope.ReadWrite,
      organization_id: SECOND.ID,
      organization_name: SECOND.NAME,
      user_email: SECOND.USERS.SIMPLE.EMAIL,
      token_hash: ApiTokenHelper.hash(token),
      revoked_at: null,
    });
    expect(token.startsWith(api_token.token_prefix)).toBe(true);
    expect(JSON.stringify(api_token)).not.toContain(token);
  });

  it.each([
    { case: 'a blank name', overrides: { name: '  ' } },
    { case: 'a name too long', overrides: { name: 'x'.repeat(101) } },
    {
      case: 'an expiry in the past',
      overrides: { expires_at: new Date(Date.now() - DAY_MS) },
    },
    {
      case: 'an expiry past one year',
      overrides: {
        expires_at: new Date(Date.now() + API_TOKEN_MAX_LIFETIME_MS + DAY_MS),
      },
    },
    { case: 'an invalid expiry', overrides: { expires_at: 'not a date' } },
  ])('should refuse $case', async ({ overrides }) => {
    const user = await loadUser(SECOND.USERS.SIMPLE.ID);
    await expect(ApiTokenApp.create(user, input(overrides))).rejects.toThrow(
      BadRequestErrorCode.InvalidApiToken
    );
  });

  it('should refuse a token for an organization its user does not belong to', async () => {
    const user = await loadUser(SECOND.USERS.SIMPLE.ID);
    await expect(
      ApiTokenApp.create(user, input({ organization_id: FILIGRAN.ID }))
    ).rejects.toThrow(NotFoundErrorCode.NotFound);
  });
});

describe('api token app lists', () => {
  it('should list the own tokens of a user and the tokens of the selected organization', async () => {
    // Given
    const simple = await loadUser(SECOND.USERS.SIMPLE.ID);
    const admin = await loadUser(SECOND.USERS.ADMIN_ORGA.ID);
    const { api_token } = await ApiTokenApp.create(
      simple,
      input({ name: 'listed' })
    );

    // When
    const own = await ApiTokenApp.listOwn(simple);
    const organization = await ApiTokenApp.listOrganization({
      ...admin,
      selected_organization_id: SECOND.ID as OrganizationId,
    });
    const otherUser = await ApiTokenApp.listOwn(admin);

    // Then
    expect(own.map(({ id }) => id)).toContain(api_token.id);
    expect(organization.map(({ id }) => id)).toContain(api_token.id);
    expect(otherUser.map(({ id }) => id)).not.toContain(api_token.id);
  });
});

describe('api token app revoke', () => {
  it('should let the owner revoke a token', async () => {
    // Given
    const user = await loadUser(SECOND.USERS.SIMPLE.ID);
    const { api_token } = await ApiTokenApp.create(user, input());

    // When
    const revoked = await ApiTokenApp.revoke(user, api_token.id);

    // Then
    expect(revoked.revoked_at).toBeInstanceOf(Date);
  });

  it('should let an administrator of the organization revoke a member token', async () => {
    // Given
    const owner = await loadUser(SECOND.USERS.SIMPLE.ID);
    const admin = await loadUser(SECOND.USERS.ADMIN_ORGA.ID);
    const { api_token } = await ApiTokenApp.create(owner, input());

    // When
    const revoked = await ApiTokenApp.revoke(admin, api_token.id);

    // Then
    expect(revoked.revoked_at).toBeInstanceOf(Date);
  });

  it('should refuse a member without the organization administration', async () => {
    // Given
    const owner = await loadUser(SECOND.USERS.ADMIN_ORGA.ID);
    const member = await loadUser(SECOND.USERS.SIMPLE.ID);
    const { api_token } = await ApiTokenApp.create(owner, input());

    // Then
    await expect(ApiTokenApp.revoke(member, api_token.id)).rejects.toThrow(
      ForbiddenErrorCode.MissingCapabilityOnOrganization
    );
  });

  it('should not disclose the token of another organization', async () => {
    // Given
    const owner = await loadUser(SECOND.USERS.SIMPLE.ID);
    const outsider = await loadUser(FILIGRAN.USERS.SIMPLE2.ID);
    const { api_token } = await ApiTokenApp.create(owner, input());

    // Then
    await expect(ApiTokenApp.revoke(outsider, api_token.id)).rejects.toThrow(
      NotFoundErrorCode.NotFound
    );
  });

  it('should answer not found for an unknown token', async () => {
    const user = await loadUser(SECOND.USERS.SIMPLE.ID);
    await expect(ApiTokenApp.revoke(user, UNKNOWN_TOKEN_ID)).rejects.toThrow(
      NotFoundErrorCode.NotFound
    );
  });
});
