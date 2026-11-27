import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import {
  OrderingMode,
  ServiceInstanceOrdering,
} from '../../../__generated__/resolvers-types';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../../utils/error/error.code';
import { ServiceInstanceApp } from './service-instance.app';
import { ServiceInstanceDomain } from './service-instance.domain';

const FILIGRAN = TEST_ORGANIZATIONS.FILIGRAN.ID;
const SECOND_ORGANIZATION = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;

afterEach(() => {
  vi.restoreAllMocks();
});

const OPEN_TO_ANYONE = {
  anonymous: 'allowed',
  user: 'allowed',
  admin: 'allowed',
} as const;

describe('serviceInstances query', () => {
  TestHelper.expectAccessMatrix({
    operation: `query {
      serviceInstances(
        first: 10
        orderBy: ${ServiceInstanceOrdering.Ordering}
        orderMode: ${OrderingMode.Asc}
      ) { totalCount }
    }`,
    guarded: () =>
      vi
        .spyOn(ServiceInstanceDomain, 'loadServiceInstances')
        .mockResolvedValue({
          totalCount: 0,
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        } as unknown as Awaited<
          ReturnType<typeof ServiceInstanceDomain.loadServiceInstances>
        >),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: 'allowed',
      admin: 'allowed',
      memberWithoutCapability: 'allowed',
      otherOrganization: 'allowed',
      nonMember: 'allowed',
    },
    prepare: () =>
      Promise.resolve({
        variables: {},
        expectedData: { serviceInstances: { totalCount: 0 } },
        cleanup: () => Promise.resolve(),
      }),
  });
});

const SERVICE_INSTANCE_BY_ID_OPERATION = `query ($serviceInstanceId: ServiceInstanceId!) {
  serviceInstanceById(service_instance_id: $serviceInstanceId) { name }
}`;

const spyOnLoadServiceInstance = () =>
  vi.spyOn(ServiceInstanceApp, 'loadServiceInstance').mockResolvedValue({
    name: 'service instance',
  } as unknown as Awaited<
    ReturnType<typeof ServiceInstanceApp.loadServiceInstance>
  >);

const prepareServiceInstanceById =
  (options: Parameters<typeof TestHelper.serviceInstanceScene.create>[0]) =>
  async () => {
    const { serviceInstance, cleanup } =
      await TestHelper.serviceInstanceScene.create(options);
    return {
      variables: { serviceInstanceId: serviceInstance.id },
      expectedData: { serviceInstanceById: { name: 'service instance' } },
      cleanup,
    };
  };

describe('serviceInstanceById query on a public service instance', () => {
  TestHelper.expectAccessMatrix({
    operation: SERVICE_INSTANCE_BY_ID_OPERATION,
    guarded: spyOnLoadServiceInstance,
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: 'allowed',
      admin: 'allowed',
      memberWithoutCapability: 'allowed',
      otherOrganization: 'allowed',
      nonMember: 'allowed',
    },
    prepare: prepareServiceInstanceById({ isPublic: true }),
  });
});

describe('serviceInstanceById query on a non public service instance of the organization', () => {
  TestHelper.expectAccessMatrix({
    operation: SERVICE_INSTANCE_BY_ID_OPERATION,
    guarded: spyOnLoadServiceInstance,
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: 'allowed',
      admin: 'allowed',
      memberWithoutCapability: 'allowed',
      otherOrganization: NotFoundErrorCode.NotFound,
      nonMember: NotFoundErrorCode.NotFound,
    },
    prepare: prepareServiceInstanceById({
      isPublic: false,
      subscribedBy: [FILIGRAN],
    }),
  });
});

// The non member selects the second organization without belonging to it: the subscription is not enough
describe('serviceInstanceById query on a non public service instance of the second organization', () => {
  TestHelper.expectAccessMatrix({
    operation: SERVICE_INSTANCE_BY_ID_OPERATION,
    guarded: spyOnLoadServiceInstance,
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: NotFoundErrorCode.NotFound,
      admin: 'allowed',
      memberWithoutCapability: NotFoundErrorCode.NotFound,
      otherOrganization: 'allowed',
      nonMember: NotFoundErrorCode.NotFound,
    },
    prepare: prepareServiceInstanceById({
      isPublic: false,
      subscribedBy: [SECOND_ORGANIZATION],
    }),
  });
});

describe('serviceInstanceById query on a non public service instance nobody subscribes to', () => {
  TestHelper.expectAccessMatrix({
    operation: SERVICE_INSTANCE_BY_ID_OPERATION,
    guarded: spyOnLoadServiceInstance,
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: NotFoundErrorCode.NotFound,
      admin: 'allowed',
      memberWithoutCapability: NotFoundErrorCode.NotFound,
      otherOrganization: NotFoundErrorCode.NotFound,
      nonMember: NotFoundErrorCode.NotFound,
    },
    prepare: prepareServiceInstanceById({ isPublic: false }),
  });
});

describe('serviceInstanceById query on an unknown service instance', () => {
  TestHelper.expectAccessMatrix({
    operation: SERVICE_INSTANCE_BY_ID_OPERATION,
    guarded: spyOnLoadServiceInstance,
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: NotFoundErrorCode.NotFound,
      admin: 'allowed',
      memberWithoutCapability: NotFoundErrorCode.NotFound,
      otherOrganization: NotFoundErrorCode.NotFound,
      nonMember: NotFoundErrorCode.NotFound,
    },
    prepare: () =>
      Promise.resolve({
        variables: { serviceInstanceId: uuidv4() },
        expectedData: { serviceInstanceById: { name: 'service instance' } },
        cleanup: () => Promise.resolve(),
      }),
  });
});

describe('serviceInstanceLinksByTags query', () => {
  TestHelper.expectAccessMatrix({
    operation: `query { serviceInstanceLinksByTags(tags: [openCTI]) { slug } }`,
    guarded: () =>
      vi
        .spyOn(ServiceInstanceApp, 'loadLinkServiceInstancesByTags')
        .mockResolvedValue([]),
    expected: OPEN_TO_ANYONE,
    prepare: () =>
      Promise.resolve({
        variables: {},
        expectedData: { serviceInstanceLinksByTags: [] },
        cleanup: () => Promise.resolve(),
      }),
  });
});

describe('seoServiceInstances query', () => {
  // XTM One calls it without credentials
  TestHelper.expectAccessMatrix({
    operation: `query { seoServiceInstances { slug } }`,
    guarded: () =>
      vi
        .spyOn(ServiceInstanceApp, 'loadSeoServiceInstances')
        .mockResolvedValue([]),
    expected: OPEN_TO_ANYONE,
    prepare: () =>
      Promise.resolve({
        variables: {},
        expectedData: { seoServiceInstances: [] },
        cleanup: () => Promise.resolve(),
      }),
  });
});

describe('seoServiceInstance query', () => {
  TestHelper.expectAccessMatrix({
    operation: `query ($slug: String!) { seoServiceInstance(slug: $slug) { slug } }`,
    guarded: () =>
      vi.spyOn(ServiceInstanceApp, 'loadSeoServiceInstance').mockResolvedValue({
        slug: 'a-service',
      } as unknown as Awaited<
        ReturnType<typeof ServiceInstanceApp.loadSeoServiceInstance>
      >),
    expected: OPEN_TO_ANYONE,
    prepare: () =>
      Promise.resolve({
        variables: { slug: 'a-service' },
        expectedData: { seoServiceInstance: { slug: 'a-service' } },
        cleanup: () => Promise.resolve(),
      }),
  });
});

describe('addServicePicture mutation', () => {
  // Only the admin catalog of the platform calls it: an organization administrator is refused
  TestHelper.expectAccessMatrix({
    operation: `mutation ($serviceInstanceId: ServiceInstanceId!) {
      addServicePicture(serviceInstanceId: $serviceInstanceId, isLogo: true) { name }
    }`,
    guarded: () =>
      vi.spyOn(ServiceInstanceApp, 'addServicePicture').mockResolvedValue({
        name: 'service instance',
      } as unknown as Awaited<
        ReturnType<typeof ServiceInstanceApp.addServicePicture>
      >),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: ForbiddenErrorCode.ForbiddenAccess,
      admin: 'allowed',
      memberWithoutCapability: ForbiddenErrorCode.ForbiddenAccess,
      otherOrganization: ForbiddenErrorCode.ForbiddenAccess,
      nonMember: ForbiddenErrorCode.ForbiddenAccess,
    },
    prepare: () =>
      Promise.resolve({
        variables: { serviceInstanceId: uuidv4() },
        expectedData: { addServicePicture: { name: 'service instance' } },
        cleanup: () => Promise.resolve(),
      }),
  });
});

describe('updatePlatformServiceMetadata mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($input: UpdatePlatformServiceMetadataInput!) {
      updatePlatformServiceMetadata(input: $input) { title }
    }`,
    guarded: () =>
      vi
        .spyOn(ServiceInstanceApp, 'updatePlatformServiceMetadata')
        .mockResolvedValue({ title: 'platform' } as unknown as Awaited<
          ReturnType<typeof ServiceInstanceApp.updatePlatformServiceMetadata>
        >),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: ForbiddenErrorCode.MissingCapabilityOnOrganization,
      admin: 'allowed',
      memberWithoutCapability:
        ForbiddenErrorCode.MissingCapabilityOnOrganization,
      otherOrganization: ForbiddenErrorCode.MissingCapabilityOnOrganization,
      nonMember: NotFoundErrorCode.NotFound,
    },
    prepare: () =>
      Promise.resolve({
        variables: { input: { serviceInstanceId: uuidv4() } },
        expectedData: { updatePlatformServiceMetadata: { title: 'platform' } },
        cleanup: () => Promise.resolve(),
      }),
  });
});
