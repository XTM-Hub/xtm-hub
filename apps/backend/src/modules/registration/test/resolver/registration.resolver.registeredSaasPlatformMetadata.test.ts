import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../../../tests/tests.const';
import {
  DeploymentRequestPlatformRegion,
  SaasPlatformMetadata,
} from '../../../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../../../model/kanel/public/ServiceInstance';
import { RegistrationApp } from '../../registration.app';
import registrationResolver from '../../registration.resolver';

describe('query.registeredSaasPlatformMetadata', () => {
  it('should pass the service_instance_id to registrationApp and return its metadata', async () => {
    // Given
    const serviceInstanceId = uuidv4() as ServiceInstanceId;
    const expectedMetadata: SaasPlatformMetadata = {
      hostname: 'my-platform.example.com',
      subscribedPlan: 'Enterprise',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2027-01-01T00:00:00.000Z'),
      regionalArea: DeploymentRequestPlatformRegion.EuWest,
      platformVersion: '6.7.17',
    };
    vi.spyOn(
      RegistrationApp,
      'loadRegisteredSaasPlatformMetadata'
    ).mockResolvedValue(expectedMetadata);

    // When
    const result = await registrationResolver.Query!
      .registeredSaasPlatformMetadata!(
      {},
      { input: { service_instance_id: serviceInstanceId } },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      RegistrationApp.loadRegisteredSaasPlatformMetadata
    ).toHaveBeenCalledWith(serviceInstanceId);
    expect(result).toMatchObject(expectedMetadata);
  });

  it('should return null when registrationApp finds no platform visible to the user', async () => {
    // Given
    vi.spyOn(
      RegistrationApp,
      'loadRegisteredSaasPlatformMetadata'
    ).mockResolvedValue(null);

    // When
    const result = await registrationResolver.Query!
      .registeredSaasPlatformMetadata!(
      {},
      { input: { service_instance_id: uuidv4() as ServiceInstanceId } },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toBeNull();
  });
});
