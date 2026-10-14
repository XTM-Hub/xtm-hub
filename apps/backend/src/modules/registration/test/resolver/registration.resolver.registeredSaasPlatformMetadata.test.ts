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
} from '../../../../../tests/tests.const';
import {
  CommercialModel,
  PlatformContract,
  PlatformIdentifier,
  SaasPlatformMetadata,
} from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import { ServiceInstanceId } from '../../../../model/kanel/public/ServiceInstance';
import { SaasManagerClient } from '../../../../thirdparty/saasmanager/client';
import { ServiceInstanceDomain } from '../../../service/instance/service-instance.domain';
import { PlatformConfigurationDomain } from '../../platform-configuration/platform-configuration.domain';
import { RegistrationApp } from '../../registration.app';
import { RegistrationDomain } from '../../registration.domain';
import registrationResolver from '../../registration.resolver';

describe('query.registeredSaasPlatformMetadata', () => {
  it('should pass the service_instance_id to registrationApp and return its metadata', async () => {
    // Given
    const serviceInstanceId = uuidv4() as ServiceInstanceId;
    const expectedMetadata: SaasPlatformMetadata = {
      hostname: 'my-platform.example.com',
      plan: 'Enterprise',
      start_date: new Date('2026-01-01T00:00:00.000Z'),
      end_date: new Date('2027-01-01T00:00:00.000Z'),
      region: 'eu-west',
    };
    vi.spyOn(
      RegistrationApp,
      'loadRegisteredSaasPlatformMetadata'
    ).mockResolvedValue(expectedMetadata);

    // When
    const result = await registrationResolver.Query!
      .registeredSaasPlatformMetadata!(
      {},
      { input: { service_instance_id: serviceInstanceId } },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      RegistrationApp.loadRegisteredSaasPlatformMetadata
    ).toHaveBeenCalledWith(serviceInstanceId);
    expect(result).toMatchObject(expectedMetadata);
  });

  it('should return null when registrationApp cannot load the metadata', async () => {
    // Given
    vi.spyOn(
      RegistrationApp,
      'loadRegisteredSaasPlatformMetadata'
    ).mockResolvedValue(null);

    // When
    const result = await registrationResolver.Query!
      .registeredSaasPlatformMetadata!(
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

    it('should return the metadata of a platform of the user organization', async () => {
      // Given
      const callSpy = spySaasManager();

      // When
      const result = await registrationResolver.Query!
        .registeredSaasPlatformMetadata!(
        {},
        { input: { service_instance_id: serviceInstanceId } },
        contextRegistererUserSecondOrga,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(result).toMatchObject(metadata);
      expect(callSpy).toHaveBeenCalledExactlyOnceWith({
        platform_id: platformId,
      });
    });

    it('should return null without asking the SaaS Manager when the platform belongs to another organization', async () => {
      // Given
      const callSpy = spySaasManager();
      requestContext.set(requestContextSimpleUserFiligran2);

      // When
      const result = await registrationResolver.Query!
        .registeredSaasPlatformMetadata!(
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
