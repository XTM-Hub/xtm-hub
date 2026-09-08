import { MockInstance } from '@vitest/spy';
import { FileUpload } from 'graphql-upload/processRequest.mjs';
import { v4 as uuidv4 } from 'uuid';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  mockPlatformConfig,
  TestHelper,
} from '../../../../tests/helper/test.helper';
import {
  contextRegistererUserSecondOrga,
  contextSimpleUserSecondOrga,
  requestContextSimpleUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import {
  PlatformConfigurationStatus,
  ServiceDefinitionIdentifier,
  ServiceInstanceTag,
  UpdatePlatformServiceMetadataInput,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { DocumentId } from '../../../model/kanel/public/Document';
import PlatformConfiguration from '../../../model/kanel/public/PlatformConfiguration';
import ServiceDefinition, {
  ServiceDefinitionId,
} from '../../../model/kanel/public/ServiceDefinition';
import ServiceInstance, {
  ServiceInstanceId,
} from '../../../model/kanel/public/ServiceInstance';
import * as pub from '../../../pub';
import * as securityGuardModule from '../../../security/guard';
import { ErrorCode } from '../../../utils/error/error.code';
import { DocumentHelper } from '../../document/document.helper';
import { ServiceInstanceApp } from './service-instance.app';
import { ServiceInstanceDomain } from './service-instance.domain';

describe('service Instance app', () => {
  describe('loadServiceInstance visibility', () => {
    let serviceInstance: ServiceInstance;

    beforeEach(() => {
      requestContext.set(requestContextSimpleUserSecondOrga);
    });

    afterEach(async () => {
      await TestHelper.subscription.delete({
        service_instance_id: serviceInstance.id,
      });
      await TestHelper.serviceInstance.delete({ id: serviceInstance.id });
    });

    it('should return a public service instance', async () => {
      serviceInstance = await TestHelper.serviceInstance.create({
        public: true,
      });

      const result = await ServiceInstanceApp.loadServiceInstance(
        serviceInstance.id
      );

      expect(result.id).toEqual(serviceInstance.id);
    });

    it('should return a non public service instance when the organization is subscribed', async () => {
      serviceInstance = await TestHelper.serviceInstance.create({
        public: false,
      });
      await TestHelper.subscription.create({
        service_instance_id: serviceInstance.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });

      const result = await ServiceInstanceApp.loadServiceInstance(
        serviceInstance.id
      );

      expect(result.id).toEqual(serviceInstance.id);
    });

    it('should reject a non public service instance without subscription', async () => {
      serviceInstance = await TestHelper.serviceInstance.create({
        public: false,
      });

      await expect(
        ServiceInstanceApp.loadServiceInstance(serviceInstance.id)
      ).rejects.toThrow(ErrorCode.ServiceInstanceNotPublic);
    });

    it('should throw not found for an unknown service instance', async () => {
      serviceInstance = await TestHelper.serviceInstance.create({
        public: true,
      });

      await expect(
        ServiceInstanceApp.loadServiceInstance(uuidv4() as ServiceInstanceId)
      ).rejects.toThrow(ErrorCode.ServiceInstanceNotFound);
    });
  });

  describe('updatePlatformServiceMetadata', () => {
    let dispatchSpy: MockInstance;
    let serviceDefinition: ServiceDefinition;
    let serviceInstance: ServiceInstance;

    beforeEach(async () => {
      dispatchSpy = vi.spyOn(pub, 'dispatch').mockResolvedValue(undefined);
      vi.spyOn(
        securityGuardModule.securityGuard,
        'assertUserCanModifyPlatformService'
      ).mockResolvedValue(undefined);
      serviceDefinition = await TestHelper.serviceDefinition.create({
        identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
      });
      serviceInstance = await TestHelper.serviceInstance.create({
        service_definition_id: serviceDefinition.id as ServiceDefinitionId,
      });
      await TestHelper.subscription.create({
        service_instance_id: serviceInstance.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstance.id,
      });
    });

    afterEach(async () => {
      await TestHelper.platformConfiguration.delete({});
      await TestHelper.subscription.delete({});
      await TestHelper.serviceInstance.delete({ id: serviceInstance.id });
      await TestHelper.serviceDefinition.delete({ id: serviceDefinition.id });
    });

    it('should update name, sync config title, dispatch, and return RegisteredPlatform', async () => {
      // Given
      const input: UpdatePlatformServiceMetadataInput = {
        serviceInstanceId: serviceInstance.id,
        name: 'Updated Platform Name',
      };

      // When
      const result = await ServiceInstanceApp.updatePlatformServiceMetadata(
        contextRegistererUserSecondOrga.user,
        serviceInstance.id,
        input
      );

      // Then
      expect(result).toMatchObject({
        id: serviceInstance.id,
        title: 'Updated Platform Name',
        url: 'https://test.com',
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        'ServiceInstance',
        'edit',
        expect.objectContaining({
          id: serviceInstance.id,
          name: 'Updated Platform Name',
        })
      );
    });

    it('should not update service instance or config when no fields to update', async () => {
      // Given
      const input: UpdatePlatformServiceMetadataInput = {
        serviceInstanceId: serviceInstance.id,
      };

      // When
      await ServiceInstanceApp.updatePlatformServiceMetadata(
        contextRegistererUserSecondOrga.user,
        serviceInstance.id,
        input
      );

      // Then
      const unchangedInstance =
        await ServiceInstanceDomain.loadServiceInstanceBy({
          id: serviceInstance.id,
        });
      expect(unchangedInstance.name).toBe('Default name serviceInstance');
    });

    it('should return null illustration_document_id when service instance has none', async () => {
      // Given
      const input: UpdatePlatformServiceMetadataInput = {
        serviceInstanceId: serviceInstance.id,
        name: 'Updated Name',
      };

      // When
      const result = await ServiceInstanceApp.updatePlatformServiceMetadata(
        contextRegistererUserSecondOrga.user,
        serviceInstance.id,
        input
      );

      // Then
      expect(result.illustration_document_id).toBeNull();
    });

    it('should throw SERVICE_INSTANCE_NOT_FOUND when service instance does not exist', async () => {
      // Given
      const nonExistentId = uuidv4() as ServiceInstanceId;

      // When / Then
      await expect(
        ServiceInstanceApp.updatePlatformServiceMetadata(
          contextRegistererUserSecondOrga.user,
          nonExistentId,
          {
            serviceInstanceId: nonExistentId,
            name: 'Name',
          }
        )
      ).rejects.toThrow(ErrorCode.ServiceInstanceNotFound);
    });

    it('should throw SERVICE_DEFINITION_NOT_FOUND when service definition does not exist', async () => {
      // Cannot reproduce with real DB: loadPlatformServiceInstance filters by
      // ServiceDefinition.identifier, so a result is only returned when a
      // matching ServiceDefinition exists in the join.

      // Given
      const mockId = uuidv4() as ServiceInstanceId;
      vi.spyOn(
        ServiceInstanceDomain,
        'loadPlatformServiceInstance'
      ).mockResolvedValue({ id: mockId, name: 'Mock Platform' });
      vi.spyOn(
        ServiceInstanceDomain,
        'loadServiceDefinitionByServiceInstance'
      ).mockResolvedValue(undefined);

      // When / Then
      await expect(
        ServiceInstanceApp.updatePlatformServiceMetadata(
          contextRegistererUserSecondOrga.user,
          mockId,
          {
            serviceInstanceId: mockId,
            name: 'Name',
          }
        )
      ).rejects.toThrow(ErrorCode.ServiceDefinitionNotFound);
    });

    it('should throw when user cannot modify platform service', async () => {
      // Given
      const mockId = uuidv4() as ServiceInstanceId;
      vi.spyOn(
        ServiceInstanceDomain,
        'loadPlatformServiceInstance'
      ).mockResolvedValue({ id: mockId, name: 'Mock Platform' });
      vi.spyOn(
        ServiceInstanceDomain,
        'loadServiceDefinitionByServiceInstance'
      ).mockResolvedValue({
        id: uuidv4(),
        identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
        name: 'Mock Platform',
      });
      vi.spyOn(
        securityGuardModule.securityGuard,
        'assertUserCanModifyPlatformService'
      ).mockRejectedValue(new Error(ErrorCode.MissingCapabilityOnOrganization));

      // When / Then
      await expect(
        ServiceInstanceApp.updatePlatformServiceMetadata(
          contextSimpleUserSecondOrga.user,
          mockId,
          {
            serviceInstanceId: mockId,
            name: 'Name',
          }
        )
      ).rejects.toThrow(ErrorCode.MissingCapabilityOnOrganization);
    });

    it('should throw PLATFORM_CONFIGURATION_NOT_FOUND when config is missing after update', async () => {
      // Cannot reproduce with real DB: simulates a race condition where the
      // configuration is deleted between the update transaction and the
      // response-building query.

      // Given
      const mockId = uuidv4() as ServiceInstanceId;
      const mockPlatformConfiguration = {
        ...mockPlatformConfig,
        service_instance_id: mockId,
        status: PlatformConfigurationStatus.Active,
      } as PlatformConfiguration;
      vi.spyOn(
        ServiceInstanceDomain,
        'loadPlatformServiceInstance'
      ).mockResolvedValue({
        id: mockId,
        name: 'Mock Platform',
        illustration_document_id: null,
      });
      vi.spyOn(
        ServiceInstanceDomain,
        'loadServiceDefinitionByServiceInstance'
      ).mockResolvedValue({
        id: uuidv4(),
        identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
        name: 'Mock Platform',
      });
      vi.spyOn(
        securityGuardModule.securityGuard,
        'assertUserCanModifyPlatformService'
      ).mockResolvedValue(undefined);
      vi.spyOn(
        ServiceInstanceDomain,
        'updateServiceInstance'
      ).mockResolvedValue({
        id: mockId,
        name: 'Mock Platform',
      } as ServiceInstance);
      const configSpy = vi.spyOn(
        ServiceInstanceDomain,
        'loadPlatformConfigurationByServiceInstanceId'
      );

      configSpy.mockResolvedValueOnce(null);
      vi.spyOn(
        ServiceInstanceDomain,
        'updatePlatformConfigurationByServiceInstanceId'
      ).mockResolvedValue(mockPlatformConfiguration);

      // When / Then
      await expect(
        ServiceInstanceApp.updatePlatformServiceMetadata(
          contextRegistererUserSecondOrga.user,
          mockId,
          {
            serviceInstanceId: mockId,
            name: 'Updated',
          }
        )
      ).rejects.toThrow(ErrorCode.PlatformConfigurationNotFound);
    });
  });

  describe('loadLinkServiceInstancesByTags', () => {
    it('should load service instances links with tags', async () => {
      // When
      const serviceInstances =
        await ServiceInstanceApp.loadLinkServiceInstancesByTags([
          ServiceInstanceTag.OpenCti,
          ServiceInstanceTag.Trial,
        ]);

      // Then
      expect(serviceInstances).toHaveLength(3);
      expect(
        serviceInstances.find(({ name }) => name === 'Filigran Blog')
      ).toBeDefined();

      expect(
        serviceInstances.find(({ name }) => name === 'OpenCTI 101')
      ).toBeDefined();

      expect(
        serviceInstances.find(({ name }) => name === 'OpenCTI Demo')
      ).toBeDefined();
    });
  });

  describe('loadSeoServiceInstance', () => {
    afterAll(async () => {
      await TestHelper.serviceInstance.delete({
        slug: 'test-seo-slug-with-docs',
      });
      await TestHelper.serviceInstance.delete({
        slug: 'test-seo-slug-no-docs',
      });
    });
    it('should return the service instance with global document IDs', async () => {
      // Given
      const slug = 'test-seo-slug-with-docs';
      const logoId = uuidv4() as DocumentId;
      const illustrationId = uuidv4() as DocumentId;

      // logo_document_id has a FK to Document, so insert the document first
      await TestHelper.document.create({ id: logoId, type: 'logo' });

      await TestHelper.serviceInstance.create({
        name: 'Test SEO Service',
        slug,
        logo_document_id: logoId,
        tags: [ServiceInstanceTag.OpenCti],
        illustration_document_id: illustrationId,
      });

      // When
      const result = await ServiceInstanceApp.loadSeoServiceInstance(slug);

      // Then
      expect(result).toMatchObject({
        name: 'Test SEO Service',
        logo_document_id: logoId,
        illustration_document_id: illustrationId,
        tags: [ServiceInstanceTag.OpenCti],
      });
    });

    it('should throw NotFoundError when the slug does not match any service', async () => {
      // When / Then
      await expect(
        ServiceInstanceApp.loadSeoServiceInstance('non-existent-slug')
      ).rejects.toThrow(ErrorCode.ServiceNotFound);
    });

    it('should handle null document IDs without converting them', async () => {
      // Given
      const slug = 'test-seo-slug-no-docs';
      await TestHelper.serviceInstance.create({
        name: 'Test SEO Service No Docs',
        slug,
      });
      // When
      const result = await ServiceInstanceApp.loadSeoServiceInstance(slug);

      // Then
      expect(result.logo_document_id).toBeNull();
      expect(result.illustration_document_id).toBeNull();
    });
  });

  describe('loadSeoServiceInstances', () => {
    const logoId = uuidv4() as DocumentId;
    const illustrationId = uuidv4() as DocumentId;
    const firstServiceInstancePublicId = uuidv4() as ServiceInstanceId;
    const secondServiceInstancePublicId = uuidv4() as ServiceInstanceId;
    const privateServiceInstanceId = uuidv4() as ServiceInstanceId;
    afterAll(async () => {
      await TestHelper.serviceInstance.delete({
        id: firstServiceInstancePublicId,
      });
      await TestHelper.serviceInstance.delete({
        id: secondServiceInstancePublicId,
      });
      await TestHelper.serviceInstance.delete({ id: privateServiceInstanceId });
      await TestHelper.document.delete({ id: logoId });
    });

    it('should not include non-public service instances', async () => {
      // Given
      await TestHelper.serviceInstance.create({
        id: privateServiceInstanceId,
        name: 'Non-public service',
        public: false,
      });

      // When
      const results = await ServiceInstanceApp.loadSeoServiceInstances();

      // Then
      expect(
        results.find(({ id }) => id === privateServiceInstanceId)
      ).toBeUndefined();
    });

    it('should return instances ordered by ordering field ascending', async () => {
      // Given
      await TestHelper.document.create({ id: logoId, type: 'logo' });
      await TestHelper.serviceInstance.create({
        id: firstServiceInstancePublicId,
        name: 'Test Public SEO Service',
        public: true,
        ordering: 100,
        logo_document_id: logoId,
        illustration_document_id: illustrationId,
      });
      await TestHelper.serviceInstance.create({
        id: secondServiceInstancePublicId,
        name: 'Test Public SEO Service',
        public: true,
        ordering: 200,
        logo_document_id: logoId,
        illustration_document_id: illustrationId,
      });

      // When
      const results = await ServiceInstanceApp.loadSeoServiceInstances();
      const firstIndex = results.findIndex(
        ({ id }) => id === firstServiceInstancePublicId
      );
      const secondIndex = results.findIndex(
        ({ id }) => id === secondServiceInstancePublicId
      );

      // Then
      expect(firstIndex).toBeGreaterThanOrEqual(0);
      expect(secondIndex).toBeGreaterThanOrEqual(0);
      expect(firstIndex).toBeLessThan(secondIndex);
    });
  });

  describe('addServicePicture', () => {
    let uploadNewFileSpy: MockInstance;
    let updateServiceInstanceSpy: MockInstance;
    let dispatchSpy: MockInstance;

    const mockServiceInstanceId = uuidv4() as ServiceInstanceId;
    const mockDocumentId = uuidv4();

    const mockFileUpload: FileUpload = {
      filename: 'logo.png',
      mimetype: 'image/png',
      encoding: '7bit',
      createReadStream: vi.fn(),
    };

    const mockUpload = {
      file: mockFileUpload,
      promise: Promise.resolve(mockFileUpload),
    };

    const mockUploadedDocument = {
      id: mockDocumentId,
      name: 'logo.png',
      mime_type: 'image/png',
    };

    const mockUpdatedServiceInstance = {
      id: mockServiceInstanceId,
      name: 'Updated Service',
      logo_document_id: mockDocumentId,
    };

    beforeEach(() => {
      uploadNewFileSpy = vi.spyOn(DocumentHelper, 'uploadNewFile');
      updateServiceInstanceSpy = vi.spyOn(
        ServiceInstanceDomain,
        'updateServiceInstance'
      );
      dispatchSpy = vi.spyOn(pub, 'dispatch');
      updateServiceInstanceSpy.mockResolvedValue(mockUpdatedServiceInstance);
      dispatchSpy.mockResolvedValue(undefined);
    });

    it('should upload a logo, update the service instance, and dispatch an edit event', async () => {
      // Given
      uploadNewFileSpy.mockResolvedValue(mockUploadedDocument);

      // When
      await ServiceInstanceApp.addServicePicture(
        mockServiceInstanceId,
        mockUpload,
        true
      );

      // Then
      expect(uploadNewFileSpy).toHaveBeenCalledWith(
        mockUpload,
        mockServiceInstanceId
      );
      expect(updateServiceInstanceSpy).toHaveBeenCalledWith(
        mockServiceInstanceId,
        { logo_document_id: mockDocumentId }
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        'ServiceInstance',
        'edit',
        mockUpdatedServiceInstance
      );
    });

    it('should update illustration_document_id when isLogo is false', async () => {
      // Given
      uploadNewFileSpy.mockResolvedValue(mockUploadedDocument);

      // When
      await ServiceInstanceApp.addServicePicture(
        mockServiceInstanceId,
        mockUpload,
        false
      );

      // Then
      expect(updateServiceInstanceSpy).toHaveBeenCalledWith(
        mockServiceInstanceId,
        { illustration_document_id: mockDocumentId }
      );
      expect(uploadNewFileSpy).toHaveBeenCalledWith(
        mockUpload,
        mockServiceInstanceId
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        'ServiceInstance',
        'edit',
        mockUpdatedServiceInstance
      );
    });

    it('should throw a mapped GraphQL error when upload fails', async () => {
      // Given
      uploadNewFileSpy.mockRejectedValue(new Error('Upload failed'));

      // When
      await expect(
        ServiceInstanceApp.addServicePicture(
          mockServiceInstanceId,
          mockUpload,
          true
        )
      ).rejects.toThrow();

      // Then
      expect(updateServiceInstanceSpy).not.toHaveBeenCalled();
      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });
});
