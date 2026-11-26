import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import { Locale } from '../../../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../../../model/kanel/public/ServiceInstance';
import { SeoServiceInstanceDomain } from './seo-service-instance.domain';

describe('seo-service-instance.domain', () => {
  let serviceInstanceId: ServiceInstanceId;
  let otherServiceInstanceId: ServiceInstanceId;

  beforeEach(async () => {
    serviceInstanceId = uuidv4() as ServiceInstanceId;
    otherServiceInstanceId = uuidv4() as ServiceInstanceId;

    await TestHelper.serviceInstance.create({
      id: serviceInstanceId,
      name: `seo-service-instance-${serviceInstanceId}`,
    });
    await TestHelper.serviceInstance.create({
      id: otherServiceInstanceId,
      name: `seo-service-instance-${otherServiceInstanceId}`,
    });
  });

  afterEach(async () => {
    await TestHelper.seoServiceInstance.delete({
      service_instance_id: serviceInstanceId,
    });
    await TestHelper.seoServiceInstance.delete({
      service_instance_id: otherServiceInstanceId,
    });
    await TestHelper.serviceInstance.delete({ id: serviceInstanceId });
    await TestHelper.serviceInstance.delete({ id: otherServiceInstanceId });
  });

  it('should load seoServiceInstances by serviceInstanceId and return one item per language', async () => {
    // Given
    await TestHelper.seoServiceInstance.create({
      service_instance_id: serviceInstanceId,
      language: Locale.En,
      meta_title: 'title en',
      meta_description: 'description en',
    });
    await TestHelper.seoServiceInstance.create({
      service_instance_id: serviceInstanceId,
      language: Locale.Fr,
      meta_title: 'title fr',
      meta_description: 'description fr',
    });
    await TestHelper.seoServiceInstance.create({
      service_instance_id: otherServiceInstanceId,
      language: Locale.Ja,
      meta_title: 'title ja',
      meta_description: 'description ja',
    });

    // When
    const result = await SeoServiceInstanceDomain.loadSeoServiceInstancesBy({
      service_instance_id: serviceInstanceId,
    });

    // Then
    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service_instance_id: serviceInstanceId,
          language: 'en',
        }),
        expect.objectContaining({
          service_instance_id: serviceInstanceId,
          language: 'fr',
        }),
      ])
    );
  });

  it('should load seoServiceInstances by serviceInstanceId and language', async () => {
    // Given
    await TestHelper.seoServiceInstance.create({
      service_instance_id: serviceInstanceId,
      language: Locale.Fr,
      meta_title: 'title fr',
      meta_description: 'description fr',
    });
    await TestHelper.seoServiceInstance.create({
      service_instance_id: serviceInstanceId,
      language: Locale.En,
      meta_title: 'title en',
      meta_description: 'description en',
    });
    await TestHelper.seoServiceInstance.create({
      service_instance_id: otherServiceInstanceId,
      language: Locale.Fr,
      meta_title: 'title other fr',
      meta_description: 'description other fr',
    });

    // When
    const result = await SeoServiceInstanceDomain.loadSeoServiceInstancesBy({
      service_instance_id: serviceInstanceId,
      language: Locale.Fr,
    });

    // Then
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      service_instance_id: serviceInstanceId,
      language: 'fr',
      meta_title: 'title fr',
      meta_description: 'description fr',
    });
  });

  it('should not load seoServiceInstances of a non-public serviceInstance without the MODIFY_SERVICE_METADATA capability', async () => {
    const privateServiceInstanceId = uuidv4() as ServiceInstanceId;
    await TestHelper.serviceInstance.create({
      id: privateServiceInstanceId,
      name: `seo-service-instance-${privateServiceInstanceId}`,
      public: false,
    });
    await TestHelper.seoServiceInstance.create({
      service_instance_id: privateServiceInstanceId,
      language: Locale.En,
      meta_title: 'title en',
      meta_description: 'description en',
    });

    const result = await SeoServiceInstanceDomain.loadSeoServiceInstancesBy({
      service_instance_id: privateServiceInstanceId,
    });

    const savedRows = await TestHelper.seoServiceInstance.loadAll({
      service_instance_id: privateServiceInstanceId,
    });
    expect(savedRows).toHaveLength(1);
    expect(result).toHaveLength(0);

    await TestHelper.seoServiceInstance.delete({
      service_instance_id: privateServiceInstanceId,
    });
    await TestHelper.serviceInstance.delete({ id: privateServiceInstanceId });
  });

  it('should update seoServiceInstance when editSeoServiceInstanceBy is called and the row already exists', async () => {
    // Given
    await TestHelper.seoServiceInstance.create({
      service_instance_id: serviceInstanceId,
      language: Locale.Fr,
      meta_title: 'old title',
      meta_description: 'old description',
    });

    // When
    const result = await SeoServiceInstanceDomain.upsertSeoServiceInstance(
      serviceInstanceId,
      Locale.Fr,
      {
        meta_title: 'new title',
        meta_description: 'new description',
      }
    );
    const savedRows = await TestHelper.seoServiceInstance.loadAll({
      service_instance_id: serviceInstanceId,
      language: Locale.Fr,
    });

    // Then
    expect(result).toMatchObject({
      service_instance_id: serviceInstanceId,
      language: 'fr',
      meta_title: 'new title',
      meta_description: 'new description',
    });
    expect(savedRows).toHaveLength(1);
    expect(savedRows[0]).toMatchObject({
      service_instance_id: serviceInstanceId,
      language: 'fr',
      meta_title: 'new title',
      meta_description: 'new description',
    });
  });

  it('should add seoServiceInstance when editSeoServiceInstanceBy is called and the row does not exist yet', async () => {
    // When
    const result = await SeoServiceInstanceDomain.upsertSeoServiceInstance(
      serviceInstanceId,
      Locale.En,
      {
        meta_title: 'created title',
        meta_description: 'created description',
      }
    );
    const savedRows = await TestHelper.seoServiceInstance.loadAll({
      service_instance_id: serviceInstanceId,
      language: Locale.En,
    });

    // Then
    expect(result).toMatchObject({
      service_instance_id: serviceInstanceId,
      language: 'en',
      meta_title: 'created title',
      meta_description: 'created description',
    });
    expect(savedRows).toHaveLength(1);
    expect(savedRows[0]).toMatchObject({
      service_instance_id: serviceInstanceId,
      language: 'en',
      meta_title: 'created title',
      meta_description: 'created description',
    });
  });
});
