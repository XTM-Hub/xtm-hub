import { GraphQLError } from 'graphql';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
  SERVICES,
} from '../../../../tests/tests.const';
import { UnknownErrorCode } from '../../../utils/error/error.code';
import * as errorMapping from '../../../utils/error/error.mapping';
import { ServiceCapabilityApp } from './service-capability.app';
import serviceCapabilityResolver from './service-capability.resolver';

describe('userServiceCapabilities GraphQL query', () => {
  it('should delegate to ServiceCapabilityApp.loadServiceCapabilitiesByServiceId when called with service_instance_id', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    const expected = {
      subscription_id: 'subscription-id',
      userServiceCapabilities: [],
    } as Awaited<
      ReturnType<typeof ServiceCapabilityApp.loadServiceCapabilitiesByServiceId>
    >;
    vi.spyOn(
      ServiceCapabilityApp,
      'loadServiceCapabilitiesByServiceId'
    ).mockResolvedValue(expected);

    // When
    const response = await serviceCapabilityResolver.Query!
      .userServiceCapabilities!(
      {},
      { service_instance_id: serviceInstanceId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      ServiceCapabilityApp.loadServiceCapabilitiesByServiceId
    ).toHaveBeenCalledWith(serviceInstanceId);
    expect(response).toEqual(expected);
  });

  it('should map errors with AddCapabilitiesError', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    vi.spyOn(
      ServiceCapabilityApp,
      'loadServiceCapabilitiesByServiceId'
    ).mockRejectedValue(new Error('boom'));
    const mappedError = new GraphQLError('mapped error');
    const mapToGraphQLErrorSpy = vi
      .spyOn(errorMapping, 'mapToGraphQLError')
      .mockReturnValue(mappedError);

    // When
    const response = serviceCapabilityResolver.Query!.userServiceCapabilities!(
      {},
      { service_instance_id: serviceInstanceId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(response).rejects.toBe(mappedError);
    expect(mapToGraphQLErrorSpy).toHaveBeenCalledWith(
      expect.any(Error),
      UnknownErrorCode.AddCapabilitiesError
    );
  });
});
