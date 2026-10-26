import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  contextRegistererUserSecondOrga,
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
  requestContextRegistererUserSecondOrga,
  requestContextSimpleUserFiligran2,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  CommercialModel,
  PlatformContract,
  PlatformIdentifier,
  SaasPlatformData,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SaasManagerClient } from '../../thirdparty/saasmanager/client';
import { PlatformConfigurationDomain } from '../registration/platform-configuration/platform-configuration.domain';
import { RegistrationDomain } from '../registration/registration.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { ProductInformationApp } from './product-information.app';
import productInformationResolver from './product-information.resolver';

describe('query.registeredSaasPlatformData', () => {
  it('should pass the service_instance_id to productInformationApp and return its data', async () => {
    // Given
    const serviceInstanceId = uuidv4() as ServiceInstanceId;
    const expectedData: SaasPlatformData = {
      metadata: {
        hostname: 'my-platform.example.com',
        plan: 'Enterprise',
        start_date: new Date('2026-01-01T00:00:00.000Z'),
        end_date: new Date('2027-01-01T00:00:00.000Z'),
        region: 'eu-west',
      },
    };
    vi.spyOn(
      ProductInformationApp,
      'loadRegisteredSaasPlatformData'
    ).mockResolvedValue(expectedData);

    // When
    const result = await productInformationResolver.Query!
      .registeredSaasPlatformData!(
      {},
      { input: { service_instance_id: serviceInstanceId } },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      ProductInformationApp.loadRegisteredSaasPlatformData
    ).toHaveBeenCalledWith(serviceInstanceId);
    expect(result).toMatchObject(expectedData);
  });

  it('should return null when productInformationApp cannot load the data', async () => {
    // Given
    vi.spyOn(
      ProductInformationApp,
      'loadRegisteredSaasPlatformData'
    ).mockResolvedValue(null);

    // When
    const result = await productInformationResolver.Query!
      .registeredSaasPlatformData!(
      {},
      { input: { service_instance_id: uuidv4() as ServiceInstanceId } },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toBeNull();
  });

  describe('organization isolation', () => {
    const metadata = {
      hostname: 'my-platform.example.com',
      plan: 'Enterprise',
      start_date: '2026-01-01T00:00:00.000Z',
      end_date: '2027-01-01T00:00:00.000Z',
      region: 'eu-west',
    };

    let platformId: string;
    let serviceInstanceId: ServiceInstanceId;

    beforeEach(async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);
      platformId = uuidv4();
      serviceInstanceId = await RegistrationDomain.registerNewPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceDefinitionId: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
        configuration: {
          registerer_id:
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
          platform_id: platformId,
          platform_url: 'http://example.com',
          platform_title: 'My OpenCTI SaaS platform',
          platform_contract: PlatformContract.Ee,
          platform_version: '6.7.17',
          token: uuidv4(),
          commercial_model: CommercialModel.Saas,
        },
        platformIdentifier: PlatformIdentifier.Opencti,
      });
    });

    afterEach(async () => {
      await PlatformConfigurationDomain.deleteConfigurationBy({
        service_instance_id: serviceInstanceId,
      });
      await ServiceInstanceDomain.deleteServiceInstanceBy({
        id: serviceInstanceId,
      });
    });

    const spySaasManager = () =>
      vi.spyOn(SaasManagerClient, 'callInstanceApi').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => metadata,
      } as Response);

    it('should return the data of a platform of the user organization', async () => {
      // Given
      const callSpy = spySaasManager();

      // When
      const result = await productInformationResolver.Query!
        .registeredSaasPlatformData!(
        {},
        { input: { service_instance_id: serviceInstanceId } },
        contextRegistererUserSecondOrga,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(result).toMatchObject({ metadata });
      expect(callSpy).toHaveBeenCalledExactlyOnceWith({
        platform_id: platformId,
      });
    });

    it('should return null without asking the SaaS Manager when the platform belongs to another organization', async () => {
      // Given
      const callSpy = spySaasManager();
      requestContext.set(requestContextSimpleUserFiligran2);

      // When
      const result = await productInformationResolver.Query!
        .registeredSaasPlatformData!(
        {},
        { input: { service_instance_id: serviceInstanceId } },
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(result).toBeNull();
      expect(callSpy).not.toHaveBeenCalled();
    });
  });
});
