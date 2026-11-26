import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
  SERVICES,
} from '../../../../../tests/tests.const';
import {
  Locale,
  SeoServiceInstanceMetadata,
} from '../../../../__generated__/resolvers-types';
import { SeoServiceInstanceApp } from './seo-service-instance.app';
import resolver from './seo-service-instance.resolver';

describe('seo-service-instance.resolver', () => {
  it('should delegate seoServiceInstanceMetadata query to app when language is provided', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID;
    const expected: SeoServiceInstanceMetadata[] = [
      {
        service_instance_id: serviceInstanceId,
        language: Locale.En,
        meta_title: 'meta title',
        meta_description: 'meta description',
      },
    ];
    vi.spyOn(
      SeoServiceInstanceApp,
      'loadSeoServiceInstancesBy'
    ).mockResolvedValue(expected);

    // When
    const result = await resolver.Query!.seoServiceInstanceMetadata!(
      {},
      {
        service_instance_id: serviceInstanceId,
        language: Locale.En,
      },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      SeoServiceInstanceApp.loadSeoServiceInstancesBy
    ).toHaveBeenCalledWith({
      service_instance_id: serviceInstanceId,
      language: Locale.En,
    });
    expect(result).toEqual(expected);
  });

  it('should delegate seoServiceInstanceMetadata query to app when language is omitted', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID;
    const expected: SeoServiceInstanceMetadata[] = [
      {
        service_instance_id: serviceInstanceId,
        language: Locale.En,
        meta_title: 'meta title en',
        meta_description: 'meta description en',
      },
      {
        service_instance_id: serviceInstanceId,
        language: Locale.Ja,
        meta_title: 'meta title ja',
        meta_description: 'meta description ja',
      },
    ];
    vi.spyOn(
      SeoServiceInstanceApp,
      'loadSeoServiceInstancesBy'
    ).mockResolvedValue(expected);

    // When
    const result = await resolver.Query!.seoServiceInstanceMetadata!(
      {},
      {
        service_instance_id: serviceInstanceId,
      },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      SeoServiceInstanceApp.loadSeoServiceInstancesBy
    ).toHaveBeenCalledWith({
      service_instance_id: serviceInstanceId,
    });
    expect(result).toEqual(expected);
  });

  it('should delegate editSeoServiceInstance mutation to app', async () => {
    // Given
    const serviceInstanceId = SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID;
    const expected: SeoServiceInstanceMetadata = {
      service_instance_id: serviceInstanceId,
      language: Locale.Ja,
      meta_title: 'updated',
      meta_description: 'meta description',
    };
    vi.spyOn(
      SeoServiceInstanceApp,
      'editSeoServiceInstanceBy'
    ).mockResolvedValue(expected);

    // When
    const result = await resolver.Mutation!.editSeoServiceInstance!(
      {},
      {
        service_instance_id: serviceInstanceId,
        language: Locale.Ja,
        input: {
          meta_title: 'updated',
          meta_description: 'meta description',
        },
      },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(SeoServiceInstanceApp.editSeoServiceInstanceBy).toHaveBeenCalledWith(
      {
        service_instance_id: serviceInstanceId,
        language: Locale.Ja,
        input: {
          meta_title: 'updated',
          meta_description: 'meta description',
        },
      }
    );
    expect(result).toEqual(expected);
  });
});
