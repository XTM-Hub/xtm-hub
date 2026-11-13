import { useAdminByPass } from '@/hooks/use-portal-capability';
import useServiceCapability, {
  useServiceCapabilityWithSubscriptionId,
} from '@/hooks/use-service-capability';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import {
  ServiceRestriction,
  ServiceUserCapabilitiesQuery,
  useServiceUserCapabilitiesQuery,
} from '@graphql/generated';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-portal-capability', () => ({
  useAdminByPass: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useServiceUserCapabilitiesQuery: vi.fn(),
}));

const ServiceInstanceId = 'service-instance-id';
const ServiceName = 'My Service';
const ServiceSlug = 'my-service';
const SubscriptionId = 'subscription-id';
const UserServiceCapabilityId = 'user-service-capability-id';
const UserServiceId = 'user-service-id';
const GenericCapabilityId = 'generic-capability-id';
const GenericCapabilityName = 'manage_access';

const ServiceInstance: serviceInstance_fragment$data = {
  id: ServiceInstanceId,
  name: ServiceName,
  description: null,
  slug: ServiceSlug,
  capabilities: [],
  service_definition: null,
  ' $fragmentType': 'serviceInstance_fragment',
};

const mockCapabilitiesQueryResult = (
  data: ServiceUserCapabilitiesQuery | undefined
) => {
  vi.mocked(useServiceUserCapabilitiesQuery).mockReturnValue({
    data,
  } as ReturnType<typeof useServiceUserCapabilitiesQuery>);
};

describe('useServiceCapability', () => {
  beforeEach(() => {
    vi.mocked(useAdminByPass).mockReturnValue(false);
    mockCapabilitiesQueryResult(undefined);
  });

  it('should return true when matching capability is provided by the query', () => {
    // Given
    mockCapabilitiesQueryResult({
      __typename: 'Query',
      userServiceCapabilities: {
        __typename: 'UserServiceCapabilitiesResponse',
        subscription_id: SubscriptionId,
        userServiceCapabilities: [
          {
            __typename: 'UserServiceCapability',
            id: UserServiceCapabilityId,
            user_service_id: UserServiceId,
            subscription_id: SubscriptionId,
            generic_service_capability: {
              __typename: 'GenericServiceCapability',
              id: GenericCapabilityId,
              name: GenericCapabilityName,
            },
            subscription_capability: null,
          },
        ],
      },
    });

    // When
    const { result } = renderHook(() =>
      useServiceCapability(ServiceRestriction.ManageAccess, ServiceInstance)
    );

    // Then
    expect(result.current).toBe(true);
  });

  it('should return subscriptionId and capability flag from dedicated hook', () => {
    // Given
    mockCapabilitiesQueryResult({
      __typename: 'Query',
      userServiceCapabilities: {
        __typename: 'UserServiceCapabilitiesResponse',
        subscription_id: SubscriptionId,
        userServiceCapabilities: [
          {
            __typename: 'UserServiceCapability',
            id: UserServiceCapabilityId,
            user_service_id: UserServiceId,
            subscription_id: SubscriptionId,
            generic_service_capability: {
              __typename: 'GenericServiceCapability',
              id: GenericCapabilityId,
              name: GenericCapabilityName,
            },
            subscription_capability: null,
          },
        ],
      },
    });

    // When
    const { result } = renderHook(() =>
      useServiceCapabilityWithSubscriptionId(
        ServiceRestriction.ManageAccess,
        ServiceInstance
      )
    );

    // Then
    expect(result.current).toEqual({
      hasCapability: true,
      subscriptionId: SubscriptionId,
    });
  });

  it('should configure caching for service capabilities query', () => {
    // Given
    mockCapabilitiesQueryResult(undefined);

    // When
    renderHook(() =>
      useServiceCapability(ServiceRestriction.ManageAccess, ServiceInstance)
    );

    // Then
    expect(useServiceUserCapabilitiesQuery).toHaveBeenCalledWith(
      expect.anything(),
      { service_instance_id: ServiceInstanceId },
      expect.objectContaining({
        enabled: true,
        staleTime: 10 * 60 * 1000,
      })
    );
  });
});
