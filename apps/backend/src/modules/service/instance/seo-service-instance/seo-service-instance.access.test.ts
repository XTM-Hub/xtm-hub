import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, vi } from 'vitest';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import { Locale } from '../../../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../../../model/kanel/public/ServiceInstance';
import {
  ForbiddenErrorCode,
  UnauthenticatedErrorCode,
} from '../../../../utils/error/error.code';
import { SeoServiceInstanceApp } from './seo-service-instance.app';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('seoServiceInstanceMetadata query', () => {
  // Open to anyone: the app keeps the metadata of a non public service instance for the holders of MODIFY_SERVICE_METADATA
  TestHelper.expectAccessMatrix({
    operation: `query ($serviceInstanceId: ServiceInstanceId!) {
      seoServiceInstanceMetadata(service_instance_id: $serviceInstanceId) { meta_title }
    }`,
    guarded: () =>
      vi
        .spyOn(SeoServiceInstanceApp, 'loadSeoServiceInstancesBy')
        .mockResolvedValue([]),
    expected: {
      anonymous: 'allowed',
      user: 'allowed',
      admin: 'allowed',
    },
    prepare: () =>
      Promise.resolve({
        variables: { serviceInstanceId: uuidv4() },
        expectedData: { seoServiceInstanceMetadata: [] },
        cleanup: () => Promise.resolve(),
      }),
  });
});

describe('editSeoServiceInstance mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($serviceInstanceId: ServiceInstanceId!) {
      editSeoServiceInstance(
        service_instance_id: $serviceInstanceId
        language: en
        input: { meta_title: "title", meta_description: "description" }
      ) { meta_title }
    }`,
    guarded: () =>
      vi
        .spyOn(SeoServiceInstanceApp, 'editSeoServiceInstanceBy')
        .mockResolvedValue({
          language: Locale.En,
          meta_title: 'title',
          meta_description: 'description',
          service_instance_id: uuidv4() as ServiceInstanceId,
        }),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: ForbiddenErrorCode.ForbiddenAccess,
      admin: 'allowed',
    },
    prepare: () =>
      Promise.resolve({
        variables: { serviceInstanceId: uuidv4() },
        expectedData: { editSeoServiceInstance: { meta_title: 'title' } },
        cleanup: () => Promise.resolve(),
      }),
  });
});
