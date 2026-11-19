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
import {
  API_TOKEN_PREFIX,
  ApiTokenHelper,
  createLastUseThrottle,
} from './api-token.helper';

const ORGANIZATION = 'a1d4c0de-0000-4000-8000-000000000001' as OrganizationId;
const OTHER_ORGANIZATION =
  'a1d4c0de-0000-4000-8000-000000000002' as OrganizationId;

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
      capabilities: [
        OrganizationCapability.AdministrateOrganization,
        OrganizationCapability.ManageAccess,
      ],
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

  it('should drop every portal capability and the organization administration without the admin scope', () => {
    const narrowed = narrowUserToToken(user, {
      scope: ApiTokenScope.ReadWrite,
      organization_id: ORGANIZATION,
    });
    expect(narrowed?.capabilities).toEqual([]);
    expect(narrowed?.selected_org_capabilities).toEqual([
      OrganizationCapability.ManageAccess,
    ]);
    expect(narrowed?.roles_portal).toEqual([]);
  });

  it('should keep the user rights but never BYPASS with the admin scope', () => {
    const narrowed = narrowUserToToken(user, {
      scope: ApiTokenScope.Admin,
      organization_id: ORGANIZATION,
    });
    expect(narrowed?.capabilities.map(({ name }) => name)).toEqual([
      PortalCapability.ReadTrials,
    ]);
    expect(narrowed?.selected_org_capabilities).toContain(
      OrganizationCapability.AdministrateOrganization
    );
    expect(narrowed?.roles_portal).toEqual([]);
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

describe('createLastUseThrottle', () => {
  const INTERVAL_MS = 60 * 1000;
  const TOKEN = 'a1d4c0de-0000-4000-8000-000000000010';
  const OTHER_TOKEN = 'a1d4c0de-0000-4000-8000-000000000011';
  const T0 = 1_700_000_000_000;

  it('should record the first use, skip the uses inside the interval and record again once it has passed', () => {
    // Given
    const throttle = createLastUseThrottle({
      intervalMs: INTERVAL_MS,
      maxEntries: 10,
    });

    // When
    const decisions = [
      throttle.shouldRecord(TOKEN, T0),
      throttle.shouldRecord(TOKEN, T0 + 1),
      throttle.shouldRecord(TOKEN, T0 + INTERVAL_MS - 1),
      throttle.shouldRecord(OTHER_TOKEN, T0 + INTERVAL_MS - 1),
      throttle.shouldRecord(TOKEN, T0 + INTERVAL_MS),
      throttle.shouldRecord(TOKEN, T0 + INTERVAL_MS + 1),
    ];

    // Then
    expect(decisions).toEqual([true, false, false, true, true, false]);
  });

  it('should forget a token once its interval has passed', () => {
    // Given
    const throttle = createLastUseThrottle({
      intervalMs: INTERVAL_MS,
      maxEntries: 10,
    });
    throttle.shouldRecord(TOKEN, T0);
    throttle.shouldRecord(OTHER_TOKEN, T0 + INTERVAL_MS / 2);

    // When
    const recorded = throttle.shouldRecord(
      'a1d4c0de-0000-4000-8000-000000000012',
      T0 + INTERVAL_MS
    );

    // Then: TOKEN expired and was pruned, OTHER_TOKEN is still inside its interval
    expect(recorded).toBe(true);
    expect(throttle.size()).toBe(2);
    expect(throttle.shouldRecord(OTHER_TOKEN, T0 + INTERVAL_MS)).toBe(false);
  });

  it('should drop every entry once they have all expired', () => {
    // Given
    const throttle = createLastUseThrottle({
      intervalMs: INTERVAL_MS,
      maxEntries: 100,
    });
    for (let index = 0; index < 50; index++) {
      throttle.shouldRecord(`token-${index}`, T0 + index);
    }

    // When
    throttle.shouldRecord(TOKEN, T0 + 49 + INTERVAL_MS);

    // Then
    expect(throttle.size()).toBe(1);
  });

  it('should never hold more than maxEntries tokens, evicting the oldest', () => {
    // Given
    const throttle = createLastUseThrottle({
      intervalMs: INTERVAL_MS,
      maxEntries: 3,
    });

    // When
    for (let index = 0; index < 10; index++) {
      throttle.shouldRecord(`token-${index}`, T0 + index);
    }

    // Then: the newest stay throttled, an evicted one is written again
    expect(throttle.size()).toBe(3);
    expect(throttle.shouldRecord('token-9', T0 + 10)).toBe(false);
    expect(throttle.shouldRecord('token-0', T0 + 10)).toBe(true);
    expect(throttle.size()).toBe(3);
  });

  it('should keep a rewritten token as the newest so it is evicted last', () => {
    // Given
    const throttle = createLastUseThrottle({
      intervalMs: INTERVAL_MS,
      maxEntries: 2,
    });
    throttle.shouldRecord(TOKEN, T0);
    throttle.shouldRecord(OTHER_TOKEN, T0 + INTERVAL_MS / 2);
    // TOKEN is written again: it moves behind OTHER_TOKEN
    throttle.shouldRecord(TOKEN, T0 + INTERVAL_MS);

    // When
    throttle.shouldRecord('token-new', T0 + INTERVAL_MS + 1);

    // Then: OTHER_TOKEN, now the oldest, was evicted
    expect(throttle.shouldRecord(TOKEN, T0 + INTERVAL_MS + 2)).toBe(false);
    expect(throttle.shouldRecord(OTHER_TOKEN, T0 + INTERVAL_MS + 2)).toBe(true);
  });
});
