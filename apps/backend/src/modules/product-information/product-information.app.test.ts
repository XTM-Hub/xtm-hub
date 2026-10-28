import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CAPABILITY_READ_SAAS_METRICS,
  requestContextRegistererUserSecondOrga,
  requestContextSimpleUserFiligran2,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  CommercialModel,
  FeatureFlag,
  OrderingMode,
  PlatformContract,
  PlatformIdentifier,
  SaasPlatformMetricsPeriod,
  SaasPlatformOrdering,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { CAPABILITY_BYPASS } from '../../portal.const';
import { SaasManagerClient } from '../../thirdparty/saasmanager/client';
import { isFeatureEnabled } from '../../utils/feature-flag.util';
import { PlatformConfigurationDomain } from '../registration/platform-configuration/platform-configuration.domain';
import { RegistrationDomain } from '../registration/registration.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { ProductInformationApp } from './product-information.app';

// isFeatureEnabled is mocked so that tests are deterministic and independent of the local `enabled_features` config.
vi.mock('../../utils/feature-flag.util', () => ({
  isFeatureEnabled: vi.fn(),
}));

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
      // The days asked to the SaaS Manager depend on the current date.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime('2026-10-27T09:00:00.000Z');
      vi.mocked(isFeatureEnabled).mockReturnValue(true);
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

    const mockSaasManagerResponse = (response: () => Promise<Response>) =>
      vi
        .spyOn(SaasManagerClient, 'callInstanceApi')
        .mockImplementation(response);

    const mockSaasManagerFullMetadata = () =>
      mockSaasManagerResponse(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => fullMetadata,
          }) as Response
      );

    it('should ask the SaaS Manager for the platform_id of the registered platform', async () => {
      // Given
      const callSpy = mockSaasManagerFullMetadata();

      // When
      await ProductInformationApp.loadRegisteredSaasPlatformData(
        serviceInstanceId,
        metricsPeriod
      );

      // Then
      expect(callSpy).toHaveBeenCalledExactlyOnceWith({
        platform_id: platformId,
        include_metrics: 90,
      });
    });

    it('should return the metadata sent by the SaaS Manager', async () => {
      // Given
      mockSaasManagerResponse(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => ({
              ...fullMetadata,
              version: '6.7.17',
              unexpected: 'ignored',
            }),
          }) as Response
      );

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
      ${'the body is null'}        | ${null}
      ${'the body is empty'}       | ${{}}
      ${'the fields are explicit'} | ${emptyMetadata}
    `('should return null fields when $case', async ({ body }) => {
      // Given
      mockSaasManagerResponse(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => body,
          }) as Response
      );

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
      mockSaasManagerResponse(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => ({ hostname: fullMetadata.hostname }),
          }) as Response
      );

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
        mockSaasManagerResponse(
          async () =>
            ({
              ok: true,
              status: 200,
              json: async () => ({ ...fullMetadata, ...fields }),
            }) as Response
        );

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
      mockSaasManagerResponse(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => ({
              ...fullMetadata,
              start_date: '2026-01-01T01:00:00+01:00',
              end_date: '2027-01-01',
            }),
          }) as Response
      );

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
      case                       | response
      ${'the call fails'}        | ${() => Promise.reject(new Error('fetch failed'))}
      ${'it returns 401'}        | ${async () => ({ ok: false, status: 401, json: async () => fullMetadata }) as Response}
      ${'it returns 204'}        | ${async () => ({ ok: true, status: 204, json: async () => fullMetadata }) as Response}
      ${'it returns 404'}        | ${async () => ({ ok: false, status: 404, json: async () => fullMetadata }) as Response}
      ${'it returns 500'}        | ${async () => ({ ok: false, status: 500, json: async () => fullMetadata }) as Response}
      ${'the body is malformed'} | ${async () => ({ ok: true, status: 200, json: async () => Promise.reject(new SyntaxError('Unexpected token')) }) as Response}
    `('should return null when $case', async ({ response }) => {
      // Given
      mockSaasManagerResponse(response);

      // When
      const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
        serviceInstanceId,
        metricsPeriod
      );

      // Then
      expect(data).toBeNull();
    });

    it('should return null without asking the SaaS Manager when the SaaS metrics feature flag is disabled', async () => {
      // Given
      const callSpy = mockSaasManagerFullMetadata();
      vi.mocked(isFeatureEnabled).mockReturnValue(false);

      // When
      const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
        serviceInstanceId,
        metricsPeriod
      );

      // Then
      expect(data).toBeNull();
      expect(callSpy).not.toHaveBeenCalled();
      expect(isFeatureEnabled).toHaveBeenCalledWith(FeatureFlag.SaasMetrics);
    });

    it('should return null without asking the SaaS Manager when the service instance is unknown', async () => {
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

    it('should return null without asking the SaaS Manager when the platform belongs to another organization', async () => {
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
        expect(callSpy).toHaveBeenCalledExactlyOnceWith({
          platform_id: platformId,
          include_metrics: 90,
        });
      }
    );

    describe('cache', () => {
      it('should not ask the SaaS Manager again within a minute', async () => {
        // Given
        const callSpy = mockSaasManagerFullMetadata();
        await ProductInformationApp.loadRegisteredSaasPlatformData(
          serviceInstanceId,
          metricsPeriod
        );
        vi.setSystemTime(Date.now() + 59_000);

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
        expect(callSpy).toHaveBeenCalledOnce();
      });

      it('should ask the SaaS Manager again once the minute has passed', async () => {
        // Given
        const callSpy = mockSaasManagerFullMetadata();
        await ProductInformationApp.loadRegisteredSaasPlatformData(
          serviceInstanceId,
          metricsPeriod
        );
        vi.setSystemTime(Date.now() + 60_000);

        // When
        await ProductInformationApp.loadRegisteredSaasPlatformData(
          serviceInstanceId,
          metricsPeriod
        );

        // Then
        expect(callSpy).toHaveBeenCalledTimes(2);
      });

      it('should ask the SaaS Manager again for another metrics period', async () => {
        // Given
        const callSpy = mockSaasManagerFullMetadata();
        await ProductInformationApp.loadRegisteredSaasPlatformData(
          serviceInstanceId,
          SaasPlatformMetricsPeriod.Last_90Days
        );

        // When
        await ProductInformationApp.loadRegisteredSaasPlatformData(
          serviceInstanceId,
          SaasPlatformMetricsPeriod.Last_180Days
        );

        // Then
        expect(callSpy).toHaveBeenCalledTimes(2);
        expect(callSpy).toHaveBeenLastCalledWith({
          platform_id: platformId,
          include_metrics: 180,
        });
      });

      it('should share a single SaaS Manager call between concurrent views', async () => {
        // Given
        const callSpy = mockSaasManagerFullMetadata();

        // When
        const data = await Promise.all([
          ProductInformationApp.loadRegisteredSaasPlatformData(
            serviceInstanceId,
            metricsPeriod
          ),
          ProductInformationApp.loadRegisteredSaasPlatformData(
            serviceInstanceId,
            metricsPeriod
          ),
        ]);

        // Then
        expect(data).toEqual([
          { metadata: fullMetadata, metrics: null, storage: null, sla: null },
          { metadata: fullMetadata, metrics: null, storage: null, sla: null },
        ]);
        expect(callSpy).toHaveBeenCalledOnce();
      });

      it('should ask the SaaS Manager again after a failure', async () => {
        // Given
        const callSpy = mockSaasManagerFullMetadata().mockRejectedValueOnce(
          new Error('fetch failed')
        );
        await ProductInformationApp.loadRegisteredSaasPlatformData(
          serviceInstanceId,
          metricsPeriod
        );

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
        expect(callSpy).toHaveBeenCalledTimes(2);
      });

      it('should not serve the cached data to a user of another organization', async () => {
        // Given
        mockSaasManagerFullMetadata();
        await ProductInformationApp.loadRegisteredSaasPlatformData(
          serviceInstanceId,
          metricsPeriod
        );
        requestContext.set(requestContextSimpleUserFiligran2);

        // When
        const data = await ProductInformationApp.loadRegisteredSaasPlatformData(
          serviceInstanceId,
          metricsPeriod
        );

        // Then
        expect(data).toBeNull();
      });
    });
  });

  describe('loadSaasManagerPlatforms', () => {
    const platformId = uuidv4();
    const args = {
      page: 1,
      pageSize: 25,
      orderBy: SaasPlatformOrdering.CustomerName,
      orderMode: OrderingMode.Asc,
    };

    beforeEach(() => {
      vi.mocked(isFeatureEnabled).mockReturnValue(true);
    });

    const mockSaasManagerPage = (count = 1) =>
      vi.spyOn(SaasManagerClient, 'callInstanceListApi').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          count,
          next: null,
          previous: null,
          results: [{ id: platformId, hostname: 'my-platform.example.com' }],
        }),
      } as Response);

    it.each`
      case                                       | extraArgs                                                                       | expected
      ${'the first page without search'}         | ${{}}                                                                           | ${{ page: 1, page_size: 25, search: undefined, ordering: 'customer__name' }}
      ${'the page asked for'}                    | ${{ page: 3, pageSize: 10 }}                                                    | ${{ page: 3, page_size: 10, search: undefined, ordering: 'customer__name' }}
      ${'a descending ordering'}                 | ${{ orderBy: SaasPlatformOrdering.Plan, orderMode: OrderingMode.Desc }}         | ${{ page: 1, page_size: 25, search: undefined, ordering: '-plan' }}
      ${'the customer name in descending order'} | ${{ orderBy: SaasPlatformOrdering.CustomerName, orderMode: OrderingMode.Desc }} | ${{ page: 1, page_size: 25, search: undefined, ordering: '-customer__name' }}
      ${'the contract end date'}                 | ${{ orderBy: SaasPlatformOrdering.EndDate }}                                    | ${{ page: 1, page_size: 25, search: undefined, ordering: 'end_date' }}
      ${'the search term'}                       | ${{ searchTerm: 'filigran' }}                                                   | ${{ page: 1, page_size: 25, search: 'filigran', ordering: 'customer__name' }}
      ${'no search for an empty search term'}    | ${{ searchTerm: '' }}                                                           | ${{ page: 1, page_size: 25, search: undefined, ordering: 'customer__name' }}
    `(
      'should ask the SaaS Manager for $case',
      async ({ extraArgs, expected }) => {
        // Given
        const callSpy = mockSaasManagerPage();

        // When
        await ProductInformationApp.loadSaasManagerPlatforms({
          ...args,
          ...extraArgs,
        });

        // Then
        expect(callSpy).toHaveBeenCalledExactlyOnceWith(expected);
      }
    );

    it('should return the platforms of the page with the total count', async () => {
      // Given
      mockSaasManagerPage(60);

      // When
      const platformPage = await ProductInformationApp.loadSaasManagerPlatforms(
        { ...args, page: 2 }
      );

      // Then
      expect(platformPage).toMatchObject({
        totalCount: 60,
        platforms: [
          {
            id: platformId,
            metadata: { hostname: 'my-platform.example.com' },
          },
        ],
      });
    });

    it.each`
      case                        | extraArgs             | page | pageSize
      ${'above the maximum size'} | ${{ pageSize: 1000 }} | ${1} | ${500}
      ${'below one platform'}     | ${{ pageSize: 0 }}    | ${1} | ${1}
      ${'before the first page'}  | ${{ page: 0 }}        | ${1} | ${25}
    `('should bound the page $case', async ({ extraArgs, page, pageSize }) => {
      // Given
      const callSpy = mockSaasManagerPage();

      // When
      await ProductInformationApp.loadSaasManagerPlatforms({
        ...args,
        ...extraArgs,
      });

      // Then
      expect(callSpy).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ page, page_size: pageSize })
      );
    });

    it('should return null when the SaaS Manager cannot list the platforms', async () => {
      // Given
      vi.spyOn(SaasManagerClient, 'callInstanceListApi').mockRejectedValue(
        new Error('fetch failed')
      );

      // When
      const platformPage =
        await ProductInformationApp.loadSaasManagerPlatforms(args);

      // Then
      expect(platformPage).toBeNull();
    });

    it('should return null without asking the SaaS Manager when the SaaS metrics feature flag is disabled', async () => {
      // Given
      const callSpy = mockSaasManagerPage();
      vi.mocked(isFeatureEnabled).mockReturnValue(false);

      // When
      const platformPage =
        await ProductInformationApp.loadSaasManagerPlatforms(args);

      // Then
      expect(platformPage).toBeNull();
      expect(callSpy).not.toHaveBeenCalled();
      expect(isFeatureEnabled).toHaveBeenCalledWith(FeatureFlag.SaasMetrics);
    });
  });
});
