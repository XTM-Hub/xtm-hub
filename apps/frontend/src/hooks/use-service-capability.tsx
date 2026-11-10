import { useAdminByPass } from '@/hooks/use-portal-capability';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import {
  ServiceRestriction,
  useServiceUserCapabilitiesQuery,
} from '@graphql/generated';
import { serviceUserCapabilitiesKeys } from '@graphql/service-instances/service-instances.keys';
import { useMemo } from 'react';

const ServiceUserCapabilitiesStaleTime = 10 * 60 * 1000; // Cache: 10mns

export type UseServiceCapabilityWithSubscriptionId = {
  hasCapability: boolean;
  subscriptionId: string | null;
};

const useServiceCapabilityData = (
  capability: ServiceRestriction,
  serviceInstance?: serviceInstance_fragment$data
): UseServiceCapabilityWithSubscriptionId => {
  const canBypass = useAdminByPass();
  const { data } = useServiceUserCapabilitiesQuery(
    portalGraphqlClient,
    {
      service_instance_id: serviceInstance?.id ?? '',
    },
    {
      enabled: !!serviceInstance?.id,
      queryKey: serviceUserCapabilitiesKeys.byService(serviceInstance?.id),
      staleTime: ServiceUserCapabilitiesStaleTime,
    }
  );
  const userServiceCapabilities =
    data?.userServiceCapabilities?.userServiceCapabilities;
  const subscriptionId = data?.userServiceCapabilities?.subscription_id;

  const hasCapability = useMemo(() => {
    const fetchedServiceCapabilities = userServiceCapabilities?.flatMap(
      (userServiceCapability) => [
        userServiceCapability?.generic_service_capability?.name,
        userServiceCapability?.subscription_capability?.service_capability
          ?.name,
      ]
    );
    const userCapabilities =
      fetchedServiceCapabilities ?? serviceInstance?.capabilities;

    return (
      canBypass ||
      !!userCapabilities?.some((capa) => capa?.toUpperCase() === capability)
    );
  }, [canBypass, serviceInstance, capability, userServiceCapabilities]);

  return {
    hasCapability,
    subscriptionId,
  };
};

function useServiceCapability(
  capability: ServiceRestriction,
  serviceInstance?: serviceInstance_fragment$data
): boolean {
  const { hasCapability } = useServiceCapabilityData(
    capability,
    serviceInstance
  );
  return hasCapability;
}

export function useServiceCapabilityWithSubscriptionId(
  capability: ServiceRestriction,
  serviceInstance?: serviceInstance_fragment$data
): UseServiceCapabilityWithSubscriptionId {
  return useServiceCapabilityData(capability, serviceInstance);
}

export default useServiceCapability;
