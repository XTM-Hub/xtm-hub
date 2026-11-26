import { describe, expect, it, vi } from 'vitest';
import { SERVICES } from '../../../../../tests/tests.const';
import {
  Locale,
  SeoServiceInstanceMetadata,
} from '../../../../__generated__/resolvers-types';
import SEOServiceInstance from '../../../../model/kanel/public/SEOServiceInstance';
import { SeoServiceInstanceApp } from './seo-service-instance.app';
import { SeoServiceInstanceDomain } from './seo-service-instance.domain';

describe('seo-service-instance.app', () => {
  it('should load seoServiceInstances by serviceInstanceId and return one item per language', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID;
    const domainResponse: SEOServiceInstance[] = [
      {
        service_instance_id: serviceInstanceId,
        language: Locale.En,
        meta_title: 'title en',
        meta_description: 'description en',
      },
      {
        service_instance_id: serviceInstanceId,
        language: Locale.Fr,
        meta_title: 'title fr',
        meta_description: 'description fr',
      },
    ];
    const expected: SeoServiceInstanceMetadata[] = [
      {
        service_instance_id: serviceInstanceId,
        language: Locale.En,
        meta_title: 'title en',
        meta_description: 'description en',
      },
      {
        service_instance_id: serviceInstanceId,
        language: Locale.Fr,
        meta_title: 'title fr',
        meta_description: 'description fr',
      },
    ];
    vi.spyOn(
      SeoServiceInstanceDomain,
      'loadSeoServiceInstancesBy'
    ).mockResolvedValue(domainResponse);

    // When
    const result = await SeoServiceInstanceApp.loadSeoServiceInstancesBy({
      service_instance_id: serviceInstanceId,
    });

    // Then
    expect(
      SeoServiceInstanceDomain.loadSeoServiceInstancesBy
    ).toHaveBeenCalledWith({
      service_instance_id: serviceInstanceId,
    });
    expect(result).toEqual(expected);
  });

  it('should load seo service instances by service instance id and language', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID;
    const domainResponse: SEOServiceInstance[] = [
      {
        service_instance_id: serviceInstanceId,
        language: Locale.En,
        meta_title: 'meta title',
        meta_description: 'meta description',
      },
    ];
    const expected: SeoServiceInstanceMetadata[] = [
      {
        service_instance_id: serviceInstanceId,
        language: Locale.En,
        meta_title: 'meta title',
        meta_description: 'meta description',
      },
    ];
    vi.spyOn(
      SeoServiceInstanceDomain,
      'loadSeoServiceInstancesBy'
    ).mockResolvedValue(domainResponse);

    // When
    const result = await SeoServiceInstanceApp.loadSeoServiceInstancesBy({
      service_instance_id: serviceInstanceId,
      language: Locale.En,
    });

    // Then
    expect(
      SeoServiceInstanceDomain.loadSeoServiceInstancesBy
    ).toHaveBeenCalledWith({
      service_instance_id: serviceInstanceId,
      language: Locale.En,
    });
    expect(result).toEqual(expected);
  });

  it('should upsert a seo service instance on edit', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID;
    const domainResponse: SEOServiceInstance = {
      service_instance_id: serviceInstanceId,
      language: Locale.Fr,
      meta_title: 'updated',
      meta_description: 'description',
    };
    const expected: SeoServiceInstanceMetadata = {
      service_instance_id: serviceInstanceId,
      language: Locale.Fr,
      meta_title: 'updated',
      meta_description: 'description',
    };
    vi.spyOn(
      SeoServiceInstanceDomain,
      'upsertSeoServiceInstance'
    ).mockResolvedValue(domainResponse);

    // When
    const result = await SeoServiceInstanceApp.editSeoServiceInstanceBy({
      service_instance_id: serviceInstanceId,
      language: Locale.Fr,
      input: {
        meta_title: 'updated',
        meta_description: 'description',
      },
    });

    // Then
    expect(
      SeoServiceInstanceDomain.upsertSeoServiceInstance
    ).toHaveBeenCalledWith(serviceInstanceId, Locale.Fr, {
      meta_title: 'updated',
      meta_description: 'description',
    });
    expect(result).toEqual(expected);
  });
});
