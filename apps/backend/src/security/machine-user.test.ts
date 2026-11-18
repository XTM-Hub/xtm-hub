import { describe, expect, it } from 'vitest';
import { TEST_SYSTEM_TOKEN } from '../../tests/tests.const';
import { PortalCapability } from '../__generated__/resolvers-types';
import { SYSTEM_USER_UUID } from '../portal.const';
import { buildScopedSystemUser, isValidSystemToken } from './machine-user';

describe('isValidSystemToken', () => {
  it.each([
    { label: 'the configured token', token: TEST_SYSTEM_TOKEN, expected: true },
    { label: 'another token', token: 'invalid-token', expected: false },
    {
      label: 'the configured token with a suffix',
      token: `${TEST_SYSTEM_TOKEN}X`,
      expected: false,
    },
    { label: 'an empty token', token: '', expected: false },
    { label: 'no token', token: null, expected: false },
  ])('should answer $expected when given $label', ({ token, expected }) => {
    // Given the token

    // When
    const isValid = isValidSystemToken(token);

    // Then
    expect(isValid).toBe(expected);
  });
});

describe('buildScopedSystemUser', () => {
  it('should build the system user holding exactly the given capabilities when capabilities are given', () => {
    // Given
    const capabilities = [
      PortalCapability.GenerateManifest,
      PortalCapability.ManageDeployment,
    ];

    // When
    const user = buildScopedSystemUser(capabilities);

    // Then
    expect(user).toMatchObject({
      id: SYSTEM_USER_UUID,
      capabilities: [
        { name: PortalCapability.GenerateManifest },
        { name: PortalCapability.ManageDeployment },
      ],
      selected_org_capabilities: [],
      organization_capabilities: [],
    });
  });

  it('should build the system user without any capability when none is given', () => {
    // Given no capability

    // When
    const user = buildScopedSystemUser();

    // Then
    expect(user.capabilities).toEqual([]);
  });
});
