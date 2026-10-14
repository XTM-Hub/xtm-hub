import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CAPABILITY_READ_SAAS_METRICS,
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
  SaasPlatformMetrics,
} from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import { ServiceInstanceId } from '../../../../model/kanel/public/ServiceInstance';
import { PortalContext } from '../../../../model/portal-context';
import { SaasManagerClient } from '../../../../thirdparty/saasmanager/client';
import { ServiceInstanceDomain } from '../../../service/instance/service-instance.domain';
import { PlatformConfigurationDomain } from '../../platform-configuration/platform-configuration.domain';
import { RegistrationApp } from '../../registration.app';
import { RegistrationDomain } from '../../registration.domain';
import registrationResolver from '../../registration.resolver';

describe('query.registeredSaasPlatformMetrics', () => {
  it('should pass the service_instance_id to registrationApp and return its metrics', async () => {
    // Given
    const serviceInstanceId = uuidv4() as ServiceInstanceId;
    const expectedMetrics: SaasPlatformMetrics = {
      platform_id: uuidv4(),
      start: new Date('2026-10-01T00:00:00.000Z'),
      end: new Date('2026-10-14T00:00:00.000Z'),
      resolution: '1h',
      series: [
        {
          metric_type: 'cpu',
          points: [{ t: new Date('2026-10-01T00:00:00.000Z'), v: 12.5 }],
        },
      ],
    };
    vi.spyOn(
      RegistrationApp,
      'loadRegisteredSaasPlatformMetrics'
    ).mockResolvedValue(expectedMetrics);

    // When
    const result = await registrationResolver.Query!
      .registeredSaasPlatformMetrics!(
      {},
      { input: { service_instance_id: serviceInstanceId } },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      RegistrationApp.loadRegisteredSaasPlatformMetrics
    ).toHaveBeenCalledWith(serviceInstanceId);
    expect(result).toMatchObject(expectedMetrics);
  });

  it('should return null when registrationApp cannot load the metrics', async () => {
    // Given
    vi.spyOn(
      RegistrationApp,
      'loadRegisteredSaasPlatformMetrics'
    ).mockResolvedValue(null);

    // When
    const result = await registrationResolver.Query!
      .registeredSaasPlatformMetrics!(
      {},
      { input: { service_instance_id: uuidv4() as ServiceInstanceId } },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toBeNull();
  });

  describe('organization isolation', () => {
    const metrics = {
      start: '2026-10-01T00:00:00.000Z',
      end: '2026-10-14T00:00:00.000Z',
      resolution: '1h',
      series: [
        {
          metric_type: 'cpu',
          points: [{ t: '2026-10-01T00:00:00.000Z', v: 12.5 }],
        },
      ],
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
      vi.spyOn(SaasManagerClient, 'callInstanceMetricsApi').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => metrics,
      } as Response);

    it('should return the metrics of a platform of the user organization', async () => {
      // Given
      const callSpy = spySaasManager();

      // When
      const result = await registrationResolver.Query!
        .registeredSaasPlatformMetrics!(
        {},
        { input: { service_instance_id: serviceInstanceId } },
        contextRegistererUserSecondOrga,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(result).toMatchObject({ platform_id: platformId, ...metrics });
      expect(callSpy).toHaveBeenCalledExactlyOnceWith(platformId);
    });

    it('should return null without asking the SaaS Manager when the platform belongs to another organization', async () => {
      // Given
      const callSpy = spySaasManager();
      requestContext.set(requestContextSimpleUserFiligran2);

      // When
      const result = await registrationResolver.Query!
        .registeredSaasPlatformMetrics!(
        {},
        { input: { service_instance_id: serviceInstanceId } },
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(result).toBeNull();
      expect(callSpy).not.toHaveBeenCalled();
    });

    it('should return the metrics of a platform of another organization when the user has READ_SAAS_METRICS', async () => {
      // Given
      const callSpy = spySaasManager();
      const readSaasMetricsContext: PortalContext = {
        ...contextSimpleUserFiligran2,
        user: {
          ...contextSimpleUserFiligran2.user,
          capabilities: [CAPABILITY_READ_SAAS_METRICS],
        },
      };
      requestContext.set({
        user: readSaasMetricsContext.user,
        portalContext: readSaasMetricsContext,
      });

      // When
      const result = await registrationResolver.Query!
        .registeredSaasPlatformMetrics!(
        {},
        { input: { service_instance_id: serviceInstanceId } },
        readSaasMetricsContext,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(result).toMatchObject({ platform_id: platformId, ...metrics });
      expect(callSpy).toHaveBeenCalledExactlyOnceWith(platformId);
    });
  });
});
