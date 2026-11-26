import { v4 as uuidv4 } from 'uuid';
import { QueryOpts } from '../../../knexfile';
import { SubscriptionModel } from '../../__generated__/resolvers-types';
import { withTransaction } from '../../context/database.context';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceCapabilityId } from '../../model/kanel/public/ServiceCapability';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import Subscription, {
  SubscriptionId,
} from '../../model/kanel/public/Subscription';
import { UserLoadUserBy } from '../../model/user';
import { NotFoundErrorCode } from '../../utils/error/error.code';
import { SubscriptionCapabilityDomain } from '../security-management/subscription-capability/subscription-capability.domain';
import { SubscriptionDomain } from './subscription.domain';

export const subscriptionApp = {
  loadSubscriptionModel: async (
    user: UserLoadUserBy,
    service_instance_id: ServiceInstanceId
  ): Promise<SubscriptionModel> => {
    const subscription = await SubscriptionDomain.loadSubscriptionBy({
      service_instance_id,
      organization_id: user.selected_organization_id,
    });

    return subscription as unknown as SubscriptionModel;
  },

  subscribeOrganizationsToService: async ({
    organizationIds,
    serviceInstanceId,
    startDate,
    endDate,
    capabilityIds,
  }: {
    organizationIds: OrganizationId[];
    serviceInstanceId: ServiceInstanceId;
    startDate: Date;
    endDate: Date | null;
    capabilityIds: ServiceCapabilityId[];
  }): Promise<Subscription[]> => {
    return withTransaction(async () => {
      const createdByOrganizationId = new Map<OrganizationId, Subscription>();
      // Sorted so that concurrent bulk calls wait on the unique key in the same order.
      for (const organizationId of [...organizationIds].sort()) {
        const createdSubscription = await SubscriptionDomain.createSubscription(
          {
            id: uuidv4() as SubscriptionId,
            service_instance_id: serviceInstanceId,
            organization_id: organizationId,
            start_date: startDate,
            end_date: endDate,
          }
        );

        await SubscriptionCapabilityDomain.addCapabilitiesToSubscription(
          createdSubscription.id,
          capabilityIds
        );
        createdByOrganizationId.set(organizationId, createdSubscription);
      }

      return organizationIds.flatMap((organizationId) => {
        const createdSubscription = createdByOrganizationId.get(organizationId);
        return createdSubscription ? [createdSubscription] : [];
      });
    });
  },

  deleteSubscriptions: async (
    ids: SubscriptionId[]
  ): Promise<Subscription[]> => {
    return SubscriptionDomain.deleteSubscriptions(ids);
  },

  updateSubscription: async ({
    id,
    startDate,
    endDate,
    capabilityIds,
  }: {
    id: SubscriptionId;
    startDate?: Date;
    endDate?: Date;
    capabilityIds?: ServiceCapabilityId[];
  }): Promise<Subscription> => {
    return withTransaction(async () => {
      const data: Partial<Subscription> = {};
      if (startDate !== undefined) data.start_date = startDate;
      if (endDate !== undefined) data.end_date = endDate;

      let updatedSubscription: Subscription | undefined;
      if (Object.keys(data).length > 0) {
        const [result] = await SubscriptionDomain.updateSubscriptionBy(
          { id },
          data
        );
        updatedSubscription = result;
      } else {
        updatedSubscription = await SubscriptionDomain.loadSubscriptionBy({
          id,
        });
      }
      if (!updatedSubscription) {
        throw new Error(NotFoundErrorCode.SubscriptionNotFound);
      }

      if (capabilityIds !== undefined) {
        await SubscriptionCapabilityDomain.replaceCapabilitiesForSubscription(
          id,
          capabilityIds
        );
      }

      return updatedSubscription;
    });
  },

  loadSubscriptions: async (opts: QueryOpts) => {
    return SubscriptionDomain.loadSubscriptions(opts);
  },
};
