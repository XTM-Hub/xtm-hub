import { UserServiceCapability } from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../../model/kanel/public/Subscription';
import { SubscriptionDomain } from '../../subscription/subscription.domain';
import { ServiceCapabilityDomain } from './service-capability.domain';

type UserServiceCapabilitiesResponse = {
  userServiceCapabilities: UserServiceCapability[];
  subscription_id: SubscriptionId | null;
};

export const ServiceCapabilityApp = {
  loadServiceCapabilitiesByServiceId: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<UserServiceCapabilitiesResponse> => {
    const user = requestContext.requireUser();
    const subscriptionPromise = SubscriptionDomain.loadSubscriptionBy({
      service_instance_id: serviceInstanceId,
      organization_id: user.selected_organization_id,
    });

    const [serviceCapabilities, subscription] = await Promise.all([
      ServiceCapabilityDomain.loadServiceCapabilitiesByServiceId(
        serviceInstanceId,
        user
      ),
      subscriptionPromise,
    ]);

    return {
      userServiceCapabilities: serviceCapabilities,
      subscription_id: subscription?.id ?? null,
    };
  },
};
