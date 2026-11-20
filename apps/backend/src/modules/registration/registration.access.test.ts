import { toGlobalId } from 'graphql-relay/node/node.js';
import { v4 as uuidv4 } from 'uuid';
import { describe, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { SERVICES, TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import { PlatformConfigurationStatus } from '../../__generated__/resolvers-types';
import {
  ForbiddenErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
import { RegistrationApp } from './registration.app';
import { RegistrationDomain } from './registration.domain';

const ADMIN_ONLY = {
  anonymous: UnauthenticatedErrorCode.Unauthenticated,
  user: ForbiddenErrorCode.ForbiddenAccess,
  admin: 'allowed',
} as const;

// The matrix spies on the guarded function after prepare(), so fixtures made here are not counted
const createRegistration = async (title: string) => {
  const serviceInstance = await TestHelper.serviceInstance.create({
    service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
  });
  await TestHelper.subscription.create({
    organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
    service_instance_id: serviceInstance.id,
    start_date: new Date(),
  });
  const configuration = await TestHelper.platformConfiguration.create({
    service_instance_id: serviceInstance.id,
    platform_title: title,
  });
  return {
    configuration,
    cleanup: async () => {
      await TestHelper.platformConfiguration.delete({
        service_instance_id: serviceInstance.id,
      });
      await TestHelper.subscription.delete({
        service_instance_id: serviceInstance.id,
      });
      await TestHelper.serviceInstance.delete({ id: serviceInstance.id });
    },
  };
};

describe('adminRegisteredPlatforms query', () => {
  TestHelper.expectAccessMatrix({
    operation: `query ($searchTerm: String) {
      adminRegisteredPlatforms(first: 10, searchTerm: $searchTerm) {
        totalCount
        edges { node { title status credential { kind has_token } } }
      }
    }`,
    guarded: () => vi.spyOn(RegistrationDomain, 'loadAdminRegisteredPlatforms'),
    expected: ADMIN_ONLY,
    prepare: async () => {
      const title = `access-matrix-${uuidv4()}`;
      const { cleanup } = await createRegistration(title);
      return {
        variables: { searchTerm: title },
        expectedData: {
          adminRegisteredPlatforms: {
            totalCount: 1,
            edges: [
              {
                node: {
                  title,
                  status: PlatformConfigurationStatus.Active,
                  credential: { kind: 'token', has_token: true },
                },
              },
            ],
          },
        },
        cleanup,
      };
    },
  });
});

describe('adminUnregisterPlatform mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($serviceInstanceId: ServiceInstanceId!) {
      adminUnregisterPlatform(serviceInstanceId: $serviceInstanceId) {
        title
        status
      }
    }`,
    guarded: () => vi.spyOn(RegistrationApp, 'adminUnregisterPlatform'),
    expected: ADMIN_ONLY,
    prepare: async () => {
      const title = `access-matrix-${uuidv4()}`;
      const { configuration, cleanup } = await createRegistration(title);
      return {
        variables: {
          serviceInstanceId: toGlobalId(
            'ServiceInstance',
            configuration.service_instance_id
          ),
        },
        expectedData: {
          adminUnregisterPlatform: {
            title,
            status: PlatformConfigurationStatus.Inactive,
          },
        },
        cleanup,
      };
    },
  });
});
