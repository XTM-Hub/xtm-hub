import { v4 as uuidv4 } from 'uuid';
import { db } from '../../knexfile';
import { OrganizationId } from '../../src/model/kanel/public/Organization';
import PlatformConfigurationModel from '../../src/model/kanel/public/PlatformConfiguration';
import { ServiceDefinitionId } from '../../src/model/kanel/public/ServiceDefinition';
import { ServiceInstanceId } from '../../src/model/kanel/public/ServiceInstance';
import Subscription, {
  SubscriptionId,
} from '../../src/model/kanel/public/Subscription';
import {
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
} from '../../src/modules/security-management/token/platform-token.util';
import { SERVICES, TEST_ORGANIZATIONS } from '../tests.const';
import { TestPlatformConfigurationHelper } from './test-platform-configuration.helper';
import { TestServiceHelper } from './test.service.helper';

export interface TestPlatformCaller {
  organizationId: OrganizationId;
  serviceInstanceId: ServiceInstanceId;
  platformConfiguration: PlatformConfigurationModel;
  platformId: string;
  token: string;
  headers: Record<string, string>;
  cleanup: () => Promise<void>;
}

export const TestPlatformCallerHelper = {
  platformCaller: {
    create: async ({
      platformConfiguration: overrides = {},
      organizationId = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      serviceDefinitionId = SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
    }: {
      platformConfiguration?: Partial<PlatformConfigurationModel>;
      organizationId?: OrganizationId;
      serviceDefinitionId?: ServiceDefinitionId;
    } = {}): Promise<TestPlatformCaller> => {
      const serviceInstance = await TestServiceHelper.serviceInstance.create({
        service_definition_id: serviceDefinitionId,
      });
      const platformConfiguration =
        await TestPlatformConfigurationHelper.platformConfiguration.create({
          service_instance_id: serviceInstance.id,
          platform_version: '7.260529.0',
          ...overrides,
        });
      await db<Subscription>('Subscription').insert({
        id: uuidv4() as SubscriptionId,
        service_instance_id: serviceInstance.id,
        organization_id: organizationId,
      });
      const { platform_id: platformId, token } = platformConfiguration;
      if (token === null) {
        throw new Error('A platform caller authenticates with a token');
      }

      return {
        organizationId,
        serviceInstanceId: serviceInstance.id,
        platformConfiguration,
        platformId,
        token,
        headers: {
          [PLATFORM_ID_HEADER]: platformId,
          [PLATFORM_TOKEN_HEADER]: token,
        },
        cleanup: async () => {
          await db<Subscription>('Subscription')
            .where({ service_instance_id: serviceInstance.id })
            .del();
          await TestPlatformConfigurationHelper.platformConfiguration.delete({
            service_instance_id: serviceInstance.id,
          });
          await TestServiceHelper.serviceInstance.delete({
            id: serviceInstance.id,
          });
        },
      };
    },
  },
};
