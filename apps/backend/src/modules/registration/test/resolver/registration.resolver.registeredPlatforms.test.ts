import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../../../tests/tests.const';
import {
  PlatformIdentifier,
  RegisteredPlatform,
  RegisteredPlatformByPlatformIdInput,
  RegisteredPlatformsInput,
} from '../../../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../../../model/kanel/public/ServiceInstance';
import { RegistrationApp } from '../../registration.app';
import registrationResolver from '../../registration.resolver';

describe('query.registeredPlatform', () => {
  it('should decode the service_instance_id from global ID and pass the raw UUID to registrationApp', async () => {
    // Given
    const rawId = uuidv4() as ServiceInstanceId;
    const expectedPlatform = { id: rawId, title: 'My Platform' };
    vi.spyOn(RegistrationApp, 'loadRegisteredPlatform').mockResolvedValue(
      expectedPlatform as unknown as RegisteredPlatform
    );

    // When
    const result = await registrationResolver.Query!.registeredPlatform!(
      {},
      { input: { service_instance_id: rawId } },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(RegistrationApp.loadRegisteredPlatform).toHaveBeenCalledWith(rawId);
    expect(result).toMatchObject({ id: rawId, title: 'My Platform' });
  });
});

describe('query.registeredPlatforms', () => {
  it('should pass the input directly to registrationApp and return its result', async () => {
    // Given
    const input: RegisteredPlatformsInput = {
      identifier: PlatformIdentifier.Opencti,
      onlyActive: true,
      onlyTrial: false,
    };
    const platforms = [{ id: uuidv4(), title: 'Platform A' }];
    vi.spyOn(RegistrationApp, 'loadRegisteredPlatforms').mockResolvedValue(
      platforms as unknown as RegisteredPlatform[]
    );

    // When
    const result = await registrationResolver.Query!.registeredPlatforms!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(RegistrationApp.loadRegisteredPlatforms).toHaveBeenCalledWith(input);
    expect(result).toEqual(platforms);
  });
});

describe('query.registeredPlatformByPlatformId', () => {
  it('should pass the input directly to registrationApp and return its result', async () => {
    // Given
    const input: RegisteredPlatformByPlatformIdInput = {
      identifier: PlatformIdentifier.Openaev,
      platformId: uuidv4(),
      tenantId: uuidv4(),
    };
    const platform = { id: uuidv4(), title: 'Platform A' };
    vi.spyOn(
      RegistrationApp,
      'loadRegisteredPlatformByPlatformId'
    ).mockResolvedValue(platform as unknown as RegisteredPlatform);

    // When
    const result = await registrationResolver.Query!
      .registeredPlatformByPlatformId!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      RegistrationApp.loadRegisteredPlatformByPlatformId
    ).toHaveBeenCalledWith(input);
    expect(result).toEqual(platform);
  });
});
