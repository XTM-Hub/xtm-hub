import {
  getApiTokenExpiry,
  getApiTokenStatus,
  sortApiTokens,
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
