import { describe, expect, it } from 'vitest';
import {
  ApiTokenScope,
  OrganizationCapability,
  PortalCapability,
} from '../../__generated__/resolvers-types';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserLoadUserBy } from '../../model/user';
import { CAPABILITY_BYPASS, ROLE_ADMIN } from '../../portal.const';
import { narrowUserToToken } from './api-token.auth';
import { API_TOKEN_PREFIX, ApiTokenHelper } from './api-token.helper';

const ORGANIZATION = 'a1d4c0de-0000-4000-8000-000000000001' as OrganizationId;
const OTHER_ORGANIZATION =
  'a1d4c0de-0000-4000-8000-000000000002' as OrganizationId;

// Every organization capability: each one administers the organization
const ORGANIZATION_CAPABILITIES = [
  OrganizationCapability.AdministrateOrganization,
  OrganizationCapability.ManageAccess,
  OrganizationCapability.ManageSubscription,
  OrganizationCapability.ManagePlatformRegistration,
];

const user = {
  id: 'a1d4c0de-0000-4000-8000-000000000003',
  selected_organization_id: OTHER_ORGANIZATION,
  organizations: [{ id: ORGANIZATION }, { id: OTHER_ORGANIZATION }],
  roles_portal: [ROLE_ADMIN],
  capabilities: [
    CAPABILITY_BYPASS,
    { id: 'read-trials', name: PortalCapability.ReadTrials },
  ],
  organization_capabilities: [
    {
      id: 'membership',
      organization: { id: ORGANIZATION },
      capabilities: ORGANIZATION_CAPABILITIES,
    },
    {
      id: 'other-membership',
      organization: { id: OTHER_ORGANIZATION },
      capabilities: [OrganizationCapability.AdministrateOrganization],
    },
  ],
} as unknown as UserLoadUserBy;

describe('api token secret', () => {
  it('should generate a recognisable token whose hash is the stored one', () => {
    const { token, tokenPrefix, tokenHash } = ApiTokenHelper.generate();
    expect(token.startsWith(API_TOKEN_PREFIX)).toBe(true);
    expect(ApiTokenHelper.isWellFormed(token)).toBe(true);
    expect(token.startsWith(tokenPrefix)).toBe(true);
    expect(tokenHash).toBe(ApiTokenHelper.hash(token));
    expect(tokenHash).not.toContain(token);
    expect(ApiTokenHelper.generate().token).not.toBe(token);
  });

  it('should read only a Bearer API token from the Authorization header', () => {
    const { token } = ApiTokenHelper.generate();
    expect(ApiTokenHelper.fromAuthorizationHeader(`Bearer ${token}`)).toBe(
      token
    );
    expect(ApiTokenHelper.fromAuthorizationHeader(`bearer  ${token} `)).toBe(
      token
    );
    expect(ApiTokenHelper.fromAuthorizationHeader('Bearer other')).toBeNull();
    expect(ApiTokenHelper.fromAuthorizationHeader(`Basic ${token}`)).toBeNull();
    expect(ApiTokenHelper.fromAuthorizationHeader(undefined)).toBeNull();
  });

  it('should refuse a malformed token', () => {
    expect(ApiTokenHelper.isWellFormed(`${API_TOKEN_PREFIX}short`)).toBe(false);
  });
});

describe('narrowUserToToken', () => {
  it('should pin the token organization and hide the others', () => {
    const narrowed = narrowUserToToken(user, {
      scope: ApiTokenScope.ReadWrite,
      organization_id: ORGANIZATION,
    });
    expect(narrowed?.selected_organization_id).toBe(ORGANIZATION);
    expect(narrowed?.organizations.map(({ id }) => id)).toEqual([ORGANIZATION]);
    expect(narrowed?.organization_capabilities).toHaveLength(1);
  });

  it.each([ApiTokenScope.Read, ApiTokenScope.ReadWrite])(
    'should drop every portal and every organization capability with the %s scope',
    (scope) => {
      const narrowed = narrowUserToToken(user, {
        scope,
        organization_id: ORGANIZATION,
      });
      expect(narrowed).toMatchObject({
        capabilities: [],
        selected_org_capabilities: [],
        organization_capabilities: [
          { organization: { id: ORGANIZATION }, capabilities: [] },
        ],
        roles_portal: [],
      });
    }
  );

  it('should keep the user rights but never BYPASS with the admin scope', () => {
    const narrowed = narrowUserToToken(user, {
      scope: ApiTokenScope.Admin,
      organization_id: ORGANIZATION,
    });
    expect(narrowed?.capabilities.map(({ name }) => name)).toEqual([
      PortalCapability.ReadTrials,
    ]);
    expect(narrowed).toMatchObject({
      selected_org_capabilities: ORGANIZATION_CAPABILITIES,
      organization_capabilities: [
        {
          organization: { id: ORGANIZATION },
          capabilities: ORGANIZATION_CAPABILITIES,
        },
      ],
      roles_portal: [],
    });
  });

  it('should refuse a user no longer in the token organization', () => {
    expect(
      narrowUserToToken(
        { ...user, organization_capabilities: [] },
        { scope: ApiTokenScope.Admin, organization_id: ORGANIZATION }
      )
    ).toBeUndefined();
  });
});
