import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CAPABILITY_READ_SAAS_METRICS,
  requestContextAdminSecondOrga,
  requestContextRegistererUserSecondOrga,
  requestContextSimpleUserFiligran2,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  CommercialModel,
  OrderingMode,
  PlatformContract,
  PlatformIdentifier,
  SaasPlatformMetricsPeriod,
  SaasPlatformOrdering,
  SaasProduct,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { SaasManagerInstanceId } from '../../model/kanel/public/SaasManagerInstance';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { CAPABILITY_BYPASS } from '../../portal.const';
import { PlatformConfigurationDomain } from '../registration/platform-configuration/platform-configuration.domain';
import { RegistrationDomain } from '../registration/registration.domain';
import { SaasManagerInstanceDomain } from '../saas-manager-instance/saas-manager-instance.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { ProductInformationApp } from './product-information.app';

describe('product information app', () => {
  describe('loadRegisteredSaasPlatformData', () => {
    const startDate = '2026-01-01T00:00:00.000Z';
    const endDate = '2027-01-01T00:00:00.000Z';
    const fullMetadata = {
      hostname: 'my-platform.example.com',
      plan: 'Enterprise',
      start_date: startDate,
      end_date: endDate,
      region: 'eu-west',
    };
    const metricsPeriod = SaasPlatformMetricsPeriod.Last_90Days;
    const emptyMetadata = {
      hostname: null,
      plan: null,
      start_date: null,
      end_date: null,
      region: null,
    };

    let platformId: string;
    let serviceInstanceId: ServiceInstanceId;

    beforeEach(async () => {
      // The metrics window read depends on the current date.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime('2026-10-27T09:00:00.000Z');
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
      vi.useRealTimers();
      await PlatformConfigurationDomain.deleteConfigurationBy({
        service_instance_id: serviceInstanceId,
      });
      await ServiceInstanceDomain.deleteServiceInstanceBy({
        id: serviceInstanceId,
      });
    });

    // The platform as the SaaS Manager pushed it, its metrics in every window
    const mockSaasManagerResponse = (
      response: () => Promise<Record<string, unknown> | null>
    ) =>
      vi
        .spyOn(SaasManagerInstanceDomain, 'loadInstance')
        .mockImplementation(async () => {
          const body = await response();
          return body === null
            ? undefined
            : {
                data: body,
                metrics:
                  body.metrics === undefined
                    ? null
                    : { 32: body.metrics, 95: body.metrics, 187: body.metrics },
                generated_at: new Date(),
              };
        });

    const mockSaasManagerFullMetadata = () =>
      mockSaasManagerResponse(async () => fullMetadata);

    it('should read the platform pushed with the platform_id of the registered platform', async () => {
      // Given
      const callSpy = mockSaasManagerFullMetadata();

      // When
      await ProductInformationApp.loadRegisteredSaasPlatformData(
        serviceInstanceId,
        metricsPeriod
      );

      // Then
      expect(callSpy).toHaveBeenCalledExactlyOnceWith(platformId);
    });

    it('should return the metadata sent by the SaaS Manager', async () => {
      // Given
      mockSaasManagerResponse(async () => ({
        ...fullMetadata,
        version: '6.7.17',
        unexpected: 'ignored',
      }));

      // When
      const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
        serviceInstanceId,
        metricsPeriod
      );

      // Then
      expect(data).toEqual({
        metadata: fullMetadata,
        metrics: null,
        storage: null,
        sla: null,
      });
    });

    it.each`
      case                         | body
      ${'the body is empty'}       | ${{}}
      ${'the fields are explicit'} | ${emptyMetadata}
    `('should return null fields when $case', async ({ body }) => {
      // Given
      mockSaasManagerResponse(async () => body);

      // When
      const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
        serviceInstanceId,
        metricsPeriod
      );

      // Then
      expect(data).toEqual({
        metadata: emptyMetadata,
        metrics: null,
        storage: null,
        sla: null,
      });
    });

    it('should keep the fields sent when the SaaS Manager sends only some of them', async () => {
      // Given
      mockSaasManagerResponse(async () => ({
        hostname: fullMetadata.hostname,
      }));

      // When
      const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
        serviceInstanceId,
        metricsPeriod
      );

      // Then
      expect(data).toEqual({
        metadata: { ...emptyMetadata, hostname: fullMetadata.hostname },
        metrics: null,
        storage: null,
        sla: null,
      });
    });

    it.each`
      case                     | fields
      ${'an unparseable date'} | ${{ start_date: 'not a date', end_date: '2027-13-45' }}
      ${'non-string values'}   | ${{ hostname: 42, plan: { name: 'Enterprise' }, start_date: 1767225600000, end_date: true, region: ['eu-west'] }}
      ${'empty strings'}       | ${{ hostname: '', plan: '', start_date: '', end_date: '', region: '' }}
    `(
      'should return null for the fields the SaaS Manager sends as $case',
      async ({ fields }) => {
        // Given
        mockSaasManagerResponse(async () => ({ ...fullMetadata, ...fields }));

        // When
        const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
          serviceInstanceId,
          metricsPeriod
        );

        // Then
        expect(data).toEqual({
          metadata: {
            ...fullMetadata,
            ...Object.fromEntries(
              Object.keys(fields).map((key) => [key, null])
            ),
          },
          metrics: null,
          storage: null,
          sla: null,
        });
      }
    );

    it('should return the dates sent by the SaaS Manager as ISO strings', async () => {
      // Given
      mockSaasManagerResponse(async () => ({
        ...fullMetadata,
        start_date: '2026-01-01T01:00:00+01:00',
        end_date: '2027-01-01',
      }));

      // When
      const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
        serviceInstanceId,
        metricsPeriod
      );

      // Then
      expect(data).toEqual({
        metadata: fullMetadata,
        metrics: null,
        storage: null,
        sla: null,
      });
    });

    it('should return null when the SaaS Manager has not pushed the platform', async () => {
      // Given
      mockSaasManagerResponse(async () => null);

      // When
      const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
        serviceInstanceId,
        metricsPeriod
      );

      // Then
      expect(data).toBeNull();
    });

    it('should return null without reading the pushed platform when the service instance is unknown', async () => {
      // Given
      const callSpy = mockSaasManagerFullMetadata();

      // When
      const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
        uuidv4() as ServiceInstanceId,
        metricsPeriod
      );

      // Then
      expect(data).toBeNull();
      expect(callSpy).not.toHaveBeenCalled();
    });

    it('should return null without reading the pushed platform when the platform belongs to another organization', async () => {
      // Given
      const callSpy = mockSaasManagerFullMetadata();
      requestContext.set(requestContextSimpleUserFiligran2);

      // When
      const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
        serviceInstanceId,
        metricsPeriod
      );

      // Then
      expect(data).toBeNull();
      expect(callSpy).not.toHaveBeenCalled();
    });

    it.each([['ADMINISTRATE_ORGANIZATION'], ['MANAGE_PLATFORM_REGISTRATION']])(
      "should return null without reading the pushed platform for a platform of another organization, even with %s in the user's own organization",
      async (organizationCapability) => {
        // Given
        const callSpy = mockSaasManagerFullMetadata();
        requestContext.set({
          ...requestContextSimpleUserFiligran2,
          user: {
            ...requestContextSimpleUserFiligran2.user,
            selected_org_capabilities: [organizationCapability],
          },
        });

        // When
        const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
          serviceInstanceId,
          metricsPeriod
        );

        // Then
        expect(data).toBeNull();
        expect(callSpy).not.toHaveBeenCalled();
      }
    );

    it('should return the data to an administrator of the owning organization without any portal capability', async () => {
      // Given
      const callSpy = mockSaasManagerFullMetadata();
      requestContext.set(requestContextAdminSecondOrga);

      // When
      const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
        serviceInstanceId,
        metricsPeriod
      );

      // Then
      expect(data).toEqual({
        metadata: fullMetadata,
        metrics: null,
        storage: null,
        sla: null,
      });
      expect(callSpy).toHaveBeenCalledExactlyOnceWith(platformId);
    });

    it.each([
      ['READ_SAAS_METRICS', CAPABILITY_READ_SAAS_METRICS],
      ['BYPASS', CAPABILITY_BYPASS],
    ])(
      'should return the data of a platform of another organization when the user has %s',
      async (_, capability) => {
        // Given
        const callSpy = mockSaasManagerFullMetadata();
        requestContext.set({
          ...requestContextSimpleUserFiligran2,
          user: {
            ...requestContextSimpleUserFiligran2.user,
            capabilities: [capability],
          },
        });

        // When
        const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
          serviceInstanceId,
          metricsPeriod
        );

        // Then
        expect(data).toEqual({
          metadata: fullMetadata,
          metrics: null,
          storage: null,
          sla: null,
        });
        expect(callSpy).toHaveBeenCalledExactlyOnceWith(platformId);
      }
    );
  });

  describe('loadSaasManagerPlatforms', () => {
    const platformId = uuidv4();
    const args = {
      first: 10,
      after: btoa('20'),
      orderBy: SaasPlatformOrdering.Plan,
      orderMode: OrderingMode.Desc,
      searchTerm: 'filigran',
      product: SaasProduct.Oaev,
    };
    const pageInfo = {
      startCursor: btoa('21'),
      endCursor: btoa('21'),
      hasNextPage: false,
      hasPreviousPage: false,
    };

    const mockSaasManagerPage = (totalCount = 1) =>
      vi
        .spyOn(SaasManagerInstanceDomain, 'loadInServiceInstances')
        .mockResolvedValue({
          totalCount,
          pageInfo,
          edges: [
            {
              cursor: btoa('21'),
              node: {
                id: platformId as SaasManagerInstanceId,
                data: { id: platformId, hostname: 'my-platform.example.com' },
                generated_at: new Date(),
              },
            },
          ],
        });

    it('should read the page asked for', async () => {
      // Given
      const callSpy = mockSaasManagerPage();

      // When
      await ProductInformationApp.loadSaasManagerPlatforms(args);

      // Then
      expect(callSpy).toHaveBeenCalledExactlyOnceWith(args);
    });

    it('should return the platforms of the page with the total count', async () => {
      // Given
      mockSaasManagerPage(60);

      // When
      const platformPage =
        await ProductInformationApp.loadSaasManagerPlatforms(args);

      // Then
      expect(platformPage).toMatchObject({
        totalCount: 60,
        pageInfo,
        edges: [
          {
            cursor: btoa('21'),
            node: {
              id: platformId,
              metadata: { hostname: 'my-platform.example.com' },
            },
          },
        ],
      });
    });
  });
});
