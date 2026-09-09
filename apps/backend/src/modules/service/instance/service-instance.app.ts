import {
  RegisteredPlatform,
  SeoServiceInstance,
  ServiceDefinitionIdentifier,
  ServiceInstance,
  ServiceInstanceTag,
  UpdatePlatformServiceMetadataInput,
} from '../../../__generated__/resolvers-types';
import { withTransaction } from '../../../context/database.context';
import {
  ServiceInstanceId,
  ServiceInstanceMutator,
} from '../../../model/kanel/public/ServiceInstance';
import { UserLoadUserBy } from '../../../model/user';
import { dispatch } from '../../../pub';
import { securityGuard } from '../../../security/guard';
import { ErrorCode } from '../../../utils/error/error.code';
import { NotFoundError } from '../../../utils/error/error.util';
import { DocumentHelper } from '../../document/document.helper';
import { Upload } from '../../document/document.uploads.helper';
import { ServiceInstanceDomain } from './service-instance.domain';

export const ServiceInstanceApp = {
  loadServiceInstance: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<ServiceInstance> => {
    const service = await ServiceInstanceDomain.loadAccessibleServiceInstanceBy(
      { id: serviceInstanceId }
    );
    if (!service) {
      const existingService = await ServiceInstanceDomain.loadServiceInstanceBy(
        { id: serviceInstanceId }
      );
      throw new Error(
        existingService
          ? ErrorCode.ServiceInstanceNotPublic
          : ErrorCode.ServiceInstanceNotFound
      );
    }
    return service as unknown as ServiceInstance;
  },
  addServicePicture: async (
    serviceInstanceId: ServiceInstanceId,
    document: Upload,
    isLogo: boolean
  ): Promise<ServiceInstance> => {
    const updatedServiceInstance = await withTransaction(async () => {
      const uploadedDocument = await DocumentHelper.uploadNewFile(
        document,
        serviceInstanceId
      );
      if (!uploadedDocument) {
        throw new Error(ErrorCode.DocumentFileMissing);
      }
      const update = isLogo
        ? { logo_document_id: uploadedDocument.id }
        : { illustration_document_id: uploadedDocument.id };
      return ServiceInstanceDomain.updateServiceInstance(
        serviceInstanceId,
        update
      );
    });

    if (!updatedServiceInstance) {
      throw new Error(ErrorCode.ServiceInstanceNotFound);
    }
    await dispatch('ServiceInstance', 'edit', updatedServiceInstance);

    return updatedServiceInstance as unknown as ServiceInstance;
  },

  updatePlatformServiceMetadata: async (
    user: UserLoadUserBy,
    serviceInstanceId: ServiceInstanceId,
    input: UpdatePlatformServiceMetadataInput
  ): Promise<RegisteredPlatform> => {
    const serviceInstance =
      await ServiceInstanceDomain.loadPlatformServiceInstance(
        user.selected_organization_id,
        serviceInstanceId
      );
    if (!serviceInstance) {
      throw NotFoundError(ErrorCode.ServiceInstanceNotFound);
    }

    // Get service definition
    const serviceDefinition =
      await ServiceInstanceDomain.loadServiceDefinitionByServiceInstance(
        serviceInstance.id
      );
    if (!serviceDefinition) {
      throw NotFoundError(ErrorCode.ServiceDefinitionNotFound);
    }

    // Verify platform type and check capabilities
    await securityGuard.assertUserCanModifyPlatformService(
      user,
      serviceDefinition
    );

    // Build update object for ServiceInstance
    const updateData: ServiceInstanceMutator = {};

    // Update ServiceInstance name if provided
    if (input.name) {
      updateData.name = input.name;
    }

    const updatedServiceInstance = await withTransaction(async () => {
      // Update ServiceInstance if there are fields to update
      let result = serviceInstance;
      if (Object.keys(updateData).length > 0) {
        result = await ServiceInstanceDomain.updateServiceInstance(
          serviceInstance.id,
          updateData
        );
        if (!result) {
          throw new Error(ErrorCode.ServiceInstanceNotFound);
        }
      }

      // For registered platforms, also update the platform_title in platform configuration
      if (input.name) {
        await ServiceInstanceDomain.updatePlatformConfigurationByServiceInstanceId(
          serviceInstance.id,
          {
            platform_title: input.name,
          }
        );
      }
      return result;
    });

    await dispatch('ServiceInstance', 'edit', updatedServiceInstance);

    // Build RegisteredPlatform response
    const config =
      await ServiceInstanceDomain.loadPlatformConfigurationByServiceInstanceId(
        updatedServiceInstance.id
      );

    if (!config) {
      throw NotFoundError(ErrorCode.PlatformConfigurationNotFound);
    }

    return {
      __typename: 'RegisteredPlatform',
      id: updatedServiceInstance.id,
      platform_id: config.platform_id,
      title: config.platform_title,
      url: config.platform_url,
      contract: config.platform_contract,
      version: config.platform_version,
      identifier: serviceDefinition.identifier,
      illustration_document_id:
        updatedServiceInstance.illustration_document_id ?? null,
      last_connectivity_check: config.last_connectivity_check,
    };
  },

  loadSeoServiceInstances: async (): Promise<SeoServiceInstance[]> => {
    return await ServiceInstanceDomain.loadSeoServiceInstances();
  },

  loadSeoServiceInstance: async (slug: string): Promise<SeoServiceInstance> => {
    const serviceInstance =
      await ServiceInstanceDomain.loadSeoServiceInstanceBySlug(slug);
    if (!serviceInstance) {
      throw Error(ErrorCode.ServiceNotFound);
    }
    return serviceInstance;
  },

  loadLinkServiceInstancesByTags: async (
    tags: ServiceInstanceTag[]
  ): Promise<SeoServiceInstance[]> => {
    return await ServiceInstanceDomain.loadServiceInstancesByServiceDefinitionAndTagsWithoutSubscription(
      ServiceDefinitionIdentifier.Link,
      tags
    );
  },
};
