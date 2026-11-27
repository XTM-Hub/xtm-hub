import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { SERVICES, TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import {
  OrderingMode,
  PlatformContract,
  RegisteredPlatform,
  SeoServiceInstance,
  ServiceConnection,
  ServiceDefinitionIdentifier,
  ServiceInstance,
  ServiceInstanceOrdering,
} from '../../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
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

const EMPTY_SERVICE_CONNECTION: ServiceConnection = {
  totalCount: 0,
  edges: [],
  pageInfo: {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  },
};

const buildServiceInstance = (
  overrides: Partial<ServiceInstance> = {}
): ServiceInstance => ({
  id: uuidv4(),
  name: 'service instance',
  capabilities: [],
  ordering: 0,
  ...overrides,
});

const buildSeoServiceInstance = (
  overrides: Partial<SeoServiceInstance> = {}
): SeoServiceInstance => ({
  id: uuidv4(),
  name: 'service instance',
  slug: 'a-service',
  service_definition: {
    id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
    name: 'OpenCTI registration',
    identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
  },
  ...overrides,
});

const buildRegisteredPlatform = (
  overrides: Partial<RegisteredPlatform> = {}
): RegisteredPlatform => ({
  id: uuidv4(),
  contract: PlatformContract.Ce,
  identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
  platform_id: uuidv4(),
  service_instance_id: uuidv4() as ServiceInstanceId,
  title: 'platform',
  url: 'https://platform.example.com',
  ...overrides,
});

const prepareWithoutFixtures = (
  variables: Record<string, unknown>,
  expectedData: Record<string, unknown>
) => ({
  prepare: () =>
    Promise.resolve({
      variables,
      expectedData,
      cleanup: () => Promise.resolve(),
    }),
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
        .mockResolvedValue(EMPTY_SERVICE_CONNECTION),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: 'allowed',
      admin: 'allowed',
      memberWithoutCapability: 'allowed',
      otherOrganization: 'allowed',
      nonMember: 'allowed',
    },
    ...prepareWithoutFixtures({}, { serviceInstances: { totalCount: 0 } }),
  });
});

const SERVICE_INSTANCE_BY_ID_OPERATION = `query ($serviceInstanceId: ServiceInstanceId!) {
  serviceInstanceById(service_instance_id: $serviceInstanceId) { name }
}`;

const spyOnLoadServiceInstance = () =>
  vi
    .spyOn(ServiceInstanceApp, 'loadServiceInstance')
    .mockResolvedValue(buildServiceInstance());

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
    ...prepareWithoutFixtures(
      { serviceInstanceId: uuidv4() },
      { serviceInstanceById: { name: 'service instance' } }
    ),
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
    ...prepareWithoutFixtures({}, { serviceInstanceLinksByTags: [] }),
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
    ...prepareWithoutFixtures({}, { seoServiceInstances: [] }),
  });
});

describe('seoServiceInstance query', () => {
  TestHelper.expectAccessMatrix({
    operation: `query ($slug: String!) { seoServiceInstance(slug: $slug) { slug } }`,
    guarded: () =>
      vi
        .spyOn(ServiceInstanceApp, 'loadSeoServiceInstance')
        .mockResolvedValue(buildSeoServiceInstance()),
    expected: OPEN_TO_ANYONE,
    ...prepareWithoutFixtures(
      { slug: 'a-service' },
      { seoServiceInstance: { slug: 'a-service' } }
    ),
  });
});

describe('addServicePicture mutation', () => {
  // Only the admin catalog of the platform calls it: an organization administrator is refused
  TestHelper.expectAccessMatrix({
    operation: `mutation ($serviceInstanceId: ServiceInstanceId!) {
      addServicePicture(serviceInstanceId: $serviceInstanceId, isLogo: true) { name }
    }`,
    guarded: () =>
      vi
        .spyOn(ServiceInstanceApp, 'addServicePicture')
        .mockResolvedValue(buildServiceInstance()),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: ForbiddenErrorCode.ForbiddenAccess,
      admin: 'allowed',
      memberWithoutCapability: ForbiddenErrorCode.ForbiddenAccess,
      otherOrganization: ForbiddenErrorCode.ForbiddenAccess,
      nonMember: ForbiddenErrorCode.ForbiddenAccess,
    },
    ...prepareWithoutFixtures(
      { serviceInstanceId: uuidv4() },
      { addServicePicture: { name: 'service instance' } }
    ),
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
        .mockResolvedValue(buildRegisteredPlatform()),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: ForbiddenErrorCode.MissingCapabilityOnOrganization,
      admin: 'allowed',
      memberWithoutCapability:
        ForbiddenErrorCode.MissingCapabilityOnOrganization,
      otherOrganization: ForbiddenErrorCode.MissingCapabilityOnOrganization,
      nonMember: NotFoundErrorCode.NotFound,
    },
    ...prepareWithoutFixtures(
      { input: { serviceInstanceId: uuidv4() } },
      { updatePlatformServiceMetadata: { title: 'platform' } }
    ),
  });
});
