import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
  SERVICES,
} from '../../../../tests/tests.const';
import {
  MutationAddServicePictureArgs,
  MutationUpdatePlatformServiceMetadataArgs,
  ServiceInstance,
  ServiceInstanceResolvers,
  ServiceInstanceTag,
} from '../../../__generated__/resolvers-types';
import { ErrorCode } from '../../../utils/error/error.code';
import { ErrorType } from '../../../utils/error/error.type';
import { ServiceInstanceApp } from './service-instance.app';
import {
  organizationServiceInstanceKey,
  serviceInstanceUserOrganizationKey,
} from './service-instance.keys';
import serviceInstanceResolver from './service-instance.resolver';

describe('serviceInstance field resolvers', () => {
  it('links should load links via linksByServiceInstanceLoader', async () => {
    const id = SERVICES.INSTANCES.EPIC.ID;
    const expected = [] as unknown as Awaited<
      ReturnType<
        (typeof contextSimpleUserFiligran2.dataLoaders.serviceInstance.linksByServiceInstanceLoader)['load']
      >
    >;
    const load = vi
      .spyOn(
        contextSimpleUserFiligran2.dataLoaders.serviceInstance
          .linksByServiceInstanceLoader,
        'load'
      )
      .mockResolvedValue(expected);

    const result = await (
      serviceInstanceResolver.ServiceInstance as unknown as ServiceInstanceResolvers
    ).links!(
      { id } as unknown as ServiceInstance,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(load).toHaveBeenCalledWith(id);
    expect(result).toEqual(expected);
  });

  it('service_definition should load via serviceDefinitionByServiceInstanceLoader', async () => {
    const id = SERVICES.INSTANCES.EPIC.ID;
    const expected = { id: uuidv4() } as unknown as Awaited<
      ReturnType<
        (typeof contextSimpleUserFiligran2.dataLoaders.serviceInstance.serviceDefinitionByServiceInstanceLoader)['load']
      >
    >;
    const load = vi
      .spyOn(
        contextSimpleUserFiligran2.dataLoaders.serviceInstance
          .serviceDefinitionByServiceInstanceLoader,
        'load'
      )
      .mockResolvedValue(expected);

    const result = await (
      serviceInstanceResolver.ServiceInstance as unknown as ServiceInstanceResolvers
    ).service_definition!(
      { id } as unknown as ServiceInstance,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(load).toHaveBeenCalledWith(id);
    expect(result).toEqual(expected);
  });

  it('organization_subscribed should load via organizationSubscribedLoader with composite key', async () => {
    const id = SERVICES.INSTANCES.EPIC.ID;
    const load = vi
      .spyOn(
        contextSimpleUserFiligran2.dataLoaders.serviceInstance
          .organizationSubscribedLoader,
        'load'
      )
      .mockResolvedValue(true);

    const result = await (
      serviceInstanceResolver.ServiceInstance as unknown as ServiceInstanceResolvers
    ).organization_subscribed!(
      { id } as unknown as ServiceInstance,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(load).toHaveBeenCalledWith(
      organizationServiceInstanceKey.create({
        organizationId:
          contextSimpleUserFiligran2.user.selected_organization_id,
        serviceInstanceId: id,
      })
    );
    expect(result).toBe(true);
  });

  it('capabilities should load via capabilitiesLoader with composite key', async () => {
    const id = SERVICES.INSTANCES.EPIC.ID;
    const expected: string[] = [];
    const load = vi
      .spyOn(
        contextSimpleUserFiligran2.dataLoaders.serviceInstance
          .capabilitiesLoader,
        'load'
      )
      .mockResolvedValue(expected);

    const result = await (
      serviceInstanceResolver.ServiceInstance as unknown as ServiceInstanceResolvers
    ).capabilities!(
      { id } as unknown as ServiceInstance,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(load).toHaveBeenCalledWith(
      serviceInstanceUserOrganizationKey.create({
        serviceInstanceId: id,
        userId: contextSimpleUserFiligran2.user.id,
        organizationId:
          contextSimpleUserFiligran2.user.selected_organization_id,
      })
    );
    expect(result).toEqual(expected);
  });

  it('user_joined should load via userJoinedLoader with composite key', async () => {
    const id = SERVICES.INSTANCES.EPIC.ID;
    const load = vi
      .spyOn(
        contextSimpleUserFiligran2.dataLoaders.serviceInstance.userJoinedLoader,
        'load'
      )
      .mockResolvedValue(false);

    const result = await (
      serviceInstanceResolver.ServiceInstance as unknown as ServiceInstanceResolvers
    ).user_joined!(
      { id } as unknown as ServiceInstance,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(load).toHaveBeenCalledWith(
      serviceInstanceUserOrganizationKey.create({
        serviceInstanceId: id,
        userId: contextSimpleUserFiligran2.user.id,
        organizationId:
          contextSimpleUserFiligran2.user.selected_organization_id,
      })
    );
    expect(result).toBe(false);
  });

  it('subscriptions should load via subscriptionsByServiceInstanceLoader with composite key', async () => {
    const id = SERVICES.INSTANCES.EPIC.ID;
    const expected: [] = [];
    const load = vi
      .spyOn(
        contextSimpleUserFiligran2.dataLoaders.serviceInstance
          .subscriptionsByServiceInstanceLoader,
        'load'
      )
      .mockResolvedValue(expected);

    const result = await (
      serviceInstanceResolver.ServiceInstance as unknown as ServiceInstanceResolvers
    ).subscriptions!(
      { id } as unknown as ServiceInstance,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(load).toHaveBeenCalledWith(
      organizationServiceInstanceKey.create({
        organizationId:
          contextSimpleUserFiligran2.user.selected_organization_id,
        serviceInstanceId: id,
      })
    );
    expect(result).toEqual(expected);
  });
});

describe('serviceInstanceById GraphQL query', () => {
  it('should delegate to ServiceInstanceApp.loadServiceInstance and return result', async () => {
    const id = SERVICES.INSTANCES.EPIC.ID;
    const expected = { id } as unknown as Awaited<
      ReturnType<typeof ServiceInstanceApp.loadServiceInstance>
    >;
    vi.spyOn(ServiceInstanceApp, 'loadServiceInstance').mockResolvedValue(
      expected
    );

    const result = await serviceInstanceResolver.Query!.serviceInstanceById!(
      {},
      { service_instance_id: id },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(ServiceInstanceApp.loadServiceInstance).toHaveBeenCalledWith(id);
    expect(result).toEqual(expected);
  });
});

describe('service instance links by tags GraphQL query', () => {
  it('should delegate to ServiceInstanceApp.loadLinkServiceInstancesByTags', async () => {
    const expected = [] as unknown as Awaited<
      ReturnType<typeof ServiceInstanceApp.loadLinkServiceInstancesByTags>
    >;
    vi.spyOn(
      ServiceInstanceApp,
      'loadLinkServiceInstancesByTags'
    ).mockResolvedValue(expected);

    const result = await serviceInstanceResolver.Query!
      .serviceInstanceLinksByTags!(
      {},
      { tags: [ServiceInstanceTag.OpenAev] },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(
      ServiceInstanceApp.loadLinkServiceInstancesByTags
    ).toHaveBeenCalledWith([ServiceInstanceTag.OpenAev]);
    expect(result).toEqual(expected);
  });
});

describe('seo service instances GraphQL query', () => {
  it('should delegate to ServiceInstanceApp.loadSeoServiceInstances', async () => {
    const expected = [] as unknown as Awaited<
      ReturnType<typeof ServiceInstanceApp.loadSeoServiceInstances>
    >;
    vi.spyOn(ServiceInstanceApp, 'loadSeoServiceInstances').mockResolvedValue(
      expected
    );

    const result = await serviceInstanceResolver.Query!.seoServiceInstances!(
      {},
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(result).toEqual(expected);
  });
});

describe('seo service instance GraphQL query', () => {
  it('should return the service when found', async () => {
    const expected = { id: uuidv4() } as unknown as Awaited<
      ReturnType<typeof ServiceInstanceApp.loadSeoServiceInstance>
    >;
    vi.spyOn(ServiceInstanceApp, 'loadSeoServiceInstance').mockResolvedValue(
      expected
    );

    const result = await serviceInstanceResolver.Query!.seoServiceInstance!(
      {},
      { slug: 'my-service' },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(result).toEqual(expected);
  });

  it('should throw NotFound when app throws ServiceNotFound', async () => {
    vi.spyOn(ServiceInstanceApp, 'loadSeoServiceInstance').mockRejectedValue(
      new Error(ErrorCode.ServiceNotFound)
    );

    const call = serviceInstanceResolver.Query!.seoServiceInstance!(
      {},
      { slug: 'unknown' },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    await expect(call).rejects.toMatchObject({ name: ErrorType.NotFound });
  });

  it('should map to ForbiddenAccess for ServiceNotManageable error', async () => {
    vi.spyOn(ServiceInstanceApp, 'loadSeoServiceInstance').mockRejectedValue(
      new Error(ErrorCode.ServiceNotManageable)
    );

    const call = serviceInstanceResolver.Query!.seoServiceInstance!(
      {},
      { slug: 'my-service' },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    await expect(call).rejects.toMatchObject({
      name: ErrorType.ForbiddenAccess,
    });
  });
});

describe('mutation.addServicePicture', () => {
  it('should delegate to ServiceInstanceApp.addServicePicture and return result', async () => {
    const expected = { id: SERVICES.INSTANCES.EPIC.ID } as unknown as Awaited<
      ReturnType<typeof ServiceInstanceApp.addServicePicture>
    >;
    vi.spyOn(ServiceInstanceApp, 'addServicePicture').mockResolvedValue(
      expected
    );

    const result = await serviceInstanceResolver.Mutation!.addServicePicture!(
      {},
      {
        serviceInstanceId: SERVICES.INSTANCES.EPIC.ID,
        document: {} as unknown as MutationAddServicePictureArgs['document'],
        isLogo: true,
      },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(ServiceInstanceApp.addServicePicture).toHaveBeenCalledWith(
      SERVICES.INSTANCES.EPIC.ID,
      {},
      true
    );
    expect(result).toEqual(expected);
  });
});

describe('mutation.updatePlatformServiceMetadata', () => {
  it('should delegate to ServiceInstanceApp.updatePlatformServiceMetadata with user context', async () => {
    const expected = { id: SERVICES.INSTANCES.EPIC.ID } as unknown as Awaited<
      ReturnType<typeof ServiceInstanceApp.updatePlatformServiceMetadata>
    >;
    vi.spyOn(
      ServiceInstanceApp,
      'updatePlatformServiceMetadata'
    ).mockResolvedValue(expected);
    const input = {
      serviceInstanceId: SERVICES.INSTANCES.EPIC.ID,
    } as unknown as MutationUpdatePlatformServiceMetadataArgs['input'];

    const result = await serviceInstanceResolver.Mutation!
      .updatePlatformServiceMetadata!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    expect(
      ServiceInstanceApp.updatePlatformServiceMetadata
    ).toHaveBeenCalledWith(
      contextSimpleUserFiligran2.user,
      SERVICES.INSTANCES.EPIC.ID,
      input
    );
    expect(result).toEqual(expected);
  });

  it('should map to ForbiddenAccess for ServiceNotManageable error', async () => {
    vi.spyOn(
      ServiceInstanceApp,
      'updatePlatformServiceMetadata'
    ).mockRejectedValue(new Error(ErrorCode.ServiceNotManageable));

    const call = serviceInstanceResolver.Mutation!
      .updatePlatformServiceMetadata!(
      {},
      {
        input: {
          serviceInstanceId: SERVICES.INSTANCES.EPIC.ID,
        } as unknown as MutationUpdatePlatformServiceMetadataArgs['input'],
      },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    await expect(call).rejects.toMatchObject({
      name: ErrorType.ForbiddenAccess,
    });
  });
});
