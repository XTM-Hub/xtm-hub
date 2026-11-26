import { v4 as uuidv4 } from 'uuid';
import { expect } from 'vitest';
import { database, db } from '../../knexfile';
import {
  PlatformConfigurationStatus,
  PlatformContract,
} from '../../src/__generated__/resolvers-types';
import { OrganizationId } from '../../src/model/kanel/public/Organization';
import PlatformConfigurationModel, {
  PlatformConfigurationMutator,
} from '../../src/model/kanel/public/PlatformConfiguration';
import { ServiceInstanceId } from '../../src/model/kanel/public/ServiceInstance';
import { PlatformConfigurationInput } from '../../src/modules/registration/registration.domain';
import { contextRegistererUserSecondOrga } from '../tests.const';

export const mockPlatformConfig: Partial<PlatformConfigurationInput> = {
  registerer_id: contextRegistererUserSecondOrga.user.id,
  platform_title: 'Test Platform',
  platform_url: 'https://test.com',
  platform_contract: PlatformContract.Ee,
  platform_version: '1.0.0',
  last_connectivity_check: new Date(),
};

export const TestPlatformConfigurationHelper = {
  platformConfiguration: {
    create: async (
      data?: Partial<PlatformConfigurationModel>
    ): Promise<PlatformConfigurationModel> => {
      const [platformConfiguration] = await db<PlatformConfigurationModel>(
        'PlatformConfiguration'
      )
        .insert({
          ...mockPlatformConfig,
          service_instance_id: uuidv4() as ServiceInstanceId,
          platform_id: uuidv4(),
          token: uuidv4(),
          status: PlatformConfigurationStatus.Active,
          tenant_id: null,
          tenant_name: null,
          ...data,
        })
        .returning('*');
      expect(platformConfiguration).toBeDefined();
      return platformConfiguration!;
    },
    update: async (
      field: PlatformConfigurationMutator,
      data: PlatformConfigurationMutator
    ) => {
      await db<PlatformConfigurationModel>('PlatformConfiguration')
        .where(field)
        .update(data);
    },
    // Locks the registration in a transaction of its own, as a concurrent request does, until commit() is called. The
    // subscription change is part of that transaction, so it only becomes visible when it commits.
    lock: async (serviceInstanceId: ServiceInstanceId) => {
      const transaction = await database.transaction();
      await transaction<PlatformConfigurationModel>('PlatformConfiguration')
        .where('service_instance_id', '=', serviceInstanceId)
        .forNoKeyUpdate();
      return {
        moveSubscription: async (organizationId: OrganizationId) => {
          await transaction('Subscription')
            .where('service_instance_id', '=', serviceInstanceId)
            .update({ organization_id: organizationId });
        },
        commit: () => transaction.commit(),
      };
    },
    delete: async (field: PlatformConfigurationMutator) => {
      await db<PlatformConfigurationModel>('PlatformConfiguration')
        .where(field)
        .del();
    },
    load: async (
      field: PlatformConfigurationMutator
    ): Promise<PlatformConfigurationModel | undefined> => {
      return db<PlatformConfigurationModel>('PlatformConfiguration')
        .where(field)
        .select('*')
        .first();
    },
  },
};
