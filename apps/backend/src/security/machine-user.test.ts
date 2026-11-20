import { describe, expect, it } from 'vitest';
import { PortalCapability } from '../__generated__/resolvers-types';
import { SYSTEM_USER_UUID } from '../portal.const';
import { buildScopedSystemUser } from './machine-user';

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
