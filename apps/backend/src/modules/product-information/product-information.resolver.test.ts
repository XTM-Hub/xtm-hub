import { ApolloServer } from '@apollo/server';
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
  OrderingMode,
  PlatformContract,
  PlatformIdentifier,
  RegisteredPlatform,
  SaasPlatformConnection,
  SaasPlatformData,
  SaasPlatformMetricsPeriod,
  SaasPlatformOrdering,
  SaasPlatformResolvers,
  SaasProduct,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { PortalContext } from '../../model/portal-context';
import createSchema from '../../server/graphql-schema';
import { PlatformConfigurationDomain } from '../registration/platform-configuration/platform-configuration.domain';
import { RegistrationDomain } from '../registration/registration.domain';
import { SaasManagerInstanceDomain } from '../saas-manager-instance/saas-manager-instance.domain';
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
      {
        input: {
          service_instance_id: serviceInstanceId,
          metrics_period: SaasPlatformMetricsPeriod.Last_90Days,
        },
      },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      ProductInformationApp.loadRegisteredSaasPlatformData
    ).toHaveBeenCalledWith(
      serviceInstanceId,
      SaasPlatformMetricsPeriod.Last_90Days
    );
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
      {
        input: {
          service_instance_id: uuidv4() as ServiceInstanceId,
          metrics_period: SaasPlatformMetricsPeriod.Last_90Days,
        },
      },
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

    const spySaasManager = () =>
      vi.spyOn(SaasManagerInstanceDomain, 'loadInstance').mockResolvedValue({
        data: metadata,
        metrics: null,
        generated_at: new Date(),
      });

    it('should return the data of a platform of the user organization', async () => {
      // Given
      const callSpy = spySaasManager();

      // When
      const result = await productInformationResolver.Query!
        .registeredSaasPlatformData!(
        {},
        {
          input: {
            service_instance_id: serviceInstanceId,
            metrics_period: SaasPlatformMetricsPeriod.Last_90Days,
          },
        },
        contextRegistererUserSecondOrga,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(result).toMatchObject({ metadata });
      expect(callSpy).toHaveBeenCalledExactlyOnceWith(platformId);
    });

    it('should return null without reading the pushed platform when the platform belongs to another organization', async () => {
      // Given
      const callSpy = spySaasManager();
      requestContext.set(requestContextSimpleUserFiligran2);

      // When
      const result = await productInformationResolver.Query!
        .registeredSaasPlatformData!(
        {},
        {
          input: {
            service_instance_id: serviceInstanceId,
            metrics_period: SaasPlatformMetricsPeriod.Last_90Days,
          },
        },
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(result).toBeNull();
      expect(callSpy).not.toHaveBeenCalled();
    });
  });

  describe('through the schema', () => {
    const REGISTERED_SAAS_PLATFORM_DATA_QUERY = `
      query ($input: RegisteredSaasPlatformDataInput!) {
        registeredSaasPlatformData(input: $input) {
          metadata { hostname }
        }
      }
    `;
    const HOSTNAME = 'my-platform.example.com';

    const server = new ApolloServer<Partial<PortalContext>>({
      schema: createSchema(),
    });

    const executeQuery = async (contextValue: Partial<PortalContext>) => {
      const response = await server.executeOperation(
        {
          query: REGISTERED_SAAS_PLATFORM_DATA_QUERY,
          variables: {
            input: {
              service_instance_id: uuidv4(),
              metrics_period: SaasPlatformMetricsPeriod.Last_90Days,
            },
          },
        },
        { contextValue }
      );
      if (response.body.kind !== 'single') {
        throw new Error('Expected a single GraphQL response');
      }
      return response.body.singleResult;
    };

    beforeEach(() => {
      vi.spyOn(
        ProductInformationApp,
        'loadRegisteredSaasPlatformData'
      ).mockResolvedValue({ metadata: { hostname: HOSTNAME } });
    });

    it('should return the data to a user without the BYPASS or READ_SAAS_METRICS capability', async () => {
      // Given a user who holds neither capability; the secure resolver loads its capabilities onto the user
      const contextValue = {
        ...contextRegistererUserSecondOrga,
        user: { ...contextRegistererUserSecondOrga.user },
      };

      // When
      const result = await executeQuery(contextValue);

      // Then
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        registeredSaasPlatformData: { metadata: { hostname: HOSTNAME } },
      });
    });

    it('should refuse an unauthenticated user', async () => {
      // Given / When
      const result = await executeQuery({});

      // Then
      expect(result.errors).toHaveLength(1);
      expect(result.data).toEqual({ registeredSaasPlatformData: null });
      expect(
        ProductInformationApp.loadRegisteredSaasPlatformData
      ).not.toHaveBeenCalled();
    });
  });
});

describe('query.saasManagerPlatforms', () => {
  const args = {
    first: 25,
    after: btoa('25'),
    orderBy: SaasPlatformOrdering.CustomerName,
    orderMode: OrderingMode.Asc,
    searchTerm: 'filigran',
  };

  it('should pass the pagination args to productInformationApp and return its page', async () => {
    // Given
    const expectedPage: SaasPlatformConnection = {
      totalCount: 26,
      pageInfo: { hasNextPage: true, hasPreviousPage: false },
      edges: [
        {
          cursor: btoa('26'),
          node: {
            id: uuidv4(),
            status: 'active',
            product: SaasProduct.Octi,
            metadata: { hostname: 'my-platform.example.com' },
          },
        },
      ],
    };
    const loadSpy = vi
      .spyOn(ProductInformationApp, 'loadSaasManagerPlatforms')
      .mockResolvedValue(expectedPage);

    // When
    const result = await productInformationResolver.Query!
      .saasManagerPlatforms!(
      {},
      args,
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(loadSpy).toHaveBeenCalledExactlyOnceWith(args);
    expect(result).toEqual(expectedPage);
  });
});

describe('saasPlatform.registered_platform', () => {
  it('should load the registered platform of the SaaS Manager platform id through the dataloader', async () => {
    // Given
    const platformId = uuidv4();
    const registeredPlatform = {
      id: uuidv4(),
      service_instance_id: uuidv4() as ServiceInstanceId,
    } as RegisteredPlatform;
    const load = vi.fn().mockResolvedValue(registeredPlatform);
    const context = {
      ...contextSimpleUserFiligran2,
      dataLoaders: {
        ...contextSimpleUserFiligran2.dataLoaders,
        registration: {
          ...contextSimpleUserFiligran2.dataLoaders.registration,
          saasRegisteredPlatformByPlatformIdLoader: { load },
        },
      },
    } as unknown as PortalContext;

    // When
    const result = await (
      productInformationResolver.SaasPlatform as SaasPlatformResolvers
    ).registered_platform!(
      { id: platformId, metadata: {} },
      {},
      context,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(load).toHaveBeenCalledExactlyOnceWith(platformId);
    expect(result).toBe(registeredPlatform);
  });
});
