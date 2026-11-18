import {
  DEFAULT_API_TOKEN_FILTERS,
  filterApiTokens,
  getApiTokenExpiry,
  getApiTokenOrganizations,
  getApiTokenStatus,
  getServerErrorKey,
  sortApiTokens,
  UNKNOWN_SERVER_ERROR_KEY,
} from '@/components/profile/api-tokens/api-token.utils';
import { ApiTokenRowFragment, ApiTokenScope } from '@graphql/generated';
import { describe, expect, it } from 'vitest';

const NOW = new Date('2026-11-18T12:00:00Z');

const token = (
  overrides: Partial<ApiTokenRowFragment>
): ApiTokenRowFragment => ({
  id: 'token-id',
  name: 'Copilot',
  token_prefix: 'xhp_abcdef',
  scope: ApiTokenScope.Read,
  organization_id: 'org-id',
  organization_name: 'Filigran',
  expires_at: '2027-01-01T00:00:00Z',
  last_used_at: null,
  created_at: '2026-11-01T00:00:00Z',
  revoked_at: null,
  ...overrides,
});

describe('getApiTokenStatus', () => {
  it('should be active before its expiry', () => {
    expect(getApiTokenStatus(token({}), NOW)).toBe('active');
  });

  it('should be expired at its expiry', () => {
    expect(
      getApiTokenStatus(token({ expires_at: NOW.toISOString() }), NOW)
    ).toBe('expired');
  });

  it('should stay revoked once revoked, even after its expiry', () => {
    expect(
      getApiTokenStatus(
        token({
          revoked_at: '2026-11-10T00:00:00Z',
          expires_at: '2026-11-11T00:00:00Z',
        }),
        NOW
      )
    ).toBe('revoked');
  });
});

describe('getApiTokenExpiry', () => {
  it('should add the chosen number of days', () => {
    expect(getApiTokenExpiry('30', NOW).toISOString()).toBe(
      '2026-12-18T12:00:00.000Z'
    );
  });

  it('should stay under the 366 days the API accepts', () => {
    const lifetime = getApiTokenExpiry('365', NOW).getTime() - NOW.getTime();
    expect(lifetime).toBeLessThan(366 * 24 * 60 * 60 * 1000);
  });
});

describe('sortApiTokens', () => {
  it('should list active tokens first, newest first', () => {
    const revoked = token({
      id: 'revoked',
      revoked_at: '2026-11-10T00:00:00Z',
    });
    const expired = token({
      id: 'expired',
      expires_at: '2026-11-01T00:00:00Z',
    });
    const older = token({ id: 'older', created_at: '2026-10-01T00:00:00Z' });
    const newer = token({ id: 'newer', created_at: '2026-11-15T00:00:00Z' });

    expect(
      sortApiTokens([revoked, older, expired, newer], NOW).map(({ id }) => id)
    ).toEqual(['newer', 'older', 'expired', 'revoked']);
  });
});

describe('filterApiTokens', () => {
  const copilot = token({ id: 'copilot' });
  const script = token({
    id: 'script',
    name: 'Nightly script',
    token_prefix: 'xhp_zz9999',
    scope: ApiTokenScope.Admin,
    organization_id: 'other-org',
    organization_name: 'Acme',
    revoked_at: '2026-11-10T00:00:00Z',
  });
  const all = [copilot, script];
  const ids = (filters: Partial<typeof DEFAULT_API_TOKEN_FILTERS>) =>
    filterApiTokens(all, { ...DEFAULT_API_TOKEN_FILTERS, ...filters }, NOW).map(
      ({ id }) => id
    );

  it('should keep every token with the default filters', () => {
    expect(ids({})).toEqual(['copilot', 'script']);
  });

  it('should search the name and the prefix, case-insensitive', () => {
    expect(ids({ search: '  NIGHTLY ' })).toEqual(['script']);
    expect(ids({ search: 'zz99' })).toEqual(['script']);
  });

  it('should filter on organization, scope and status', () => {
    expect(ids({ organizationId: 'org-id' })).toEqual(['copilot']);
    expect(ids({ scope: ApiTokenScope.Admin })).toEqual(['script']);
    expect(ids({ status: 'revoked' })).toEqual(['script']);
    expect(ids({ status: 'expired' })).toEqual([]);
  });
});

describe('getServerErrorKey', () => {
  const has = (key: string) => key === 'Error.Server.FORBIDDEN_ACCESS';

  it('should use the catalog key of a known server error', () => {
    expect(getServerErrorKey(new Error('FORBIDDEN_ACCESS'), has)).toBe(
      'Error.Server.FORBIDDEN_ACCESS'
    );
  });

  it('should fall back to the unknown error when the catalog has no key', () => {
    expect(
      getServerErrorKey(new Error('invalid input syntax for type uuid'), has)
    ).toBe(UNKNOWN_SERVER_ERROR_KEY);
    expect(getServerErrorKey('not an error', has)).toBe(
      UNKNOWN_SERVER_ERROR_KEY
    );
  });
});

describe('getApiTokenOrganizations', () => {
  it('should list each organization once, by name', () => {
    expect(
      getApiTokenOrganizations([
        token({ id: 'a' }),
        token({
          id: 'b',
          organization_id: 'acme-id',
          organization_name: 'Acme',
        }),
        token({ id: 'c' }),
      ])
    ).toEqual([
      { id: 'acme-id', name: 'Acme' },
      { id: 'org-id', name: 'Filigran' },
    ]);
  });
});
