import { ApolloServer } from '@apollo/server';
import { v4 as uuidv4 } from 'uuid';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  CAPABILITY_READ_SAAS_METRICS,
  contextAdminSecondOrga,
  contextRegistererUserSecondOrga,
  contextSimpleUserSecondOrga,
} from '../../../tests/tests.const';
import { SaasPlatformMetricsPeriod } from '../../__generated__/resolvers-types';
import { PortalContext } from '../../model/portal-context';
import { CAPABILITY_BYPASS } from '../../portal.const';
import { Context } from '../../server/apollo-plugins/log';
import { createApolloServer } from '../../server/apollo-server';
import createSchema from '../../server/graphql-schema';
import { ProductInformationApp } from './product-information.app';

const REGISTERED_SAAS_PLATFORM_DATA_QUERY = `query ($input: RegisteredSaasPlatformDataInput!) {
  registeredSaasPlatformData(input: $input) {
    metadata { hostname }
  }
}`;

const HOSTNAME = 'my-platform.example.com';

const withPortalCapability = (
  capability: typeof CAPABILITY_READ_SAAS_METRICS
): PortalContext =>
  ({
    ...contextSimpleUserSecondOrga,
    user: {
      ...contextSimpleUserSecondOrga.user,
      capabilities: [capability],
    },
  }) as PortalContext;

describe('product information GraphQL schema', () => {
  const server: ApolloServer<Context> = createApolloServer({
    schema: createSchema(),
    exposeSchemaDetails: false,
  });

  beforeAll(async () => {
    await server.start();
  });

  beforeEach(() => {
    vi.spyOn(
      ProductInformationApp,
      'loadRegisteredSaasPlatformData'
    ).mockResolvedValue({
      metadata: {
        hostname: HOSTNAME,
        plan: null,
        start_date: null,
        end_date: null,
        region: null,
      },
    });
  });

  afterAll(async () => {
    await server.stop();
  });

  const queryRegisteredSaasPlatformData = async (
    contextValue: PortalContext
  ) => {
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

  it.each`
    description                                                      | context
    ${'BYPASS'}                                                      | ${withPortalCapability(CAPABILITY_BYPASS)}
    ${'READ_SAAS_METRICS'}                                           | ${withPortalCapability(CAPABILITY_READ_SAAS_METRICS)}
    ${'ADMINISTRATE_ORGANIZATION in their selected organization'}    | ${contextAdminSecondOrga}
    ${'MANAGE_PLATFORM_REGISTRATION in their selected organization'} | ${contextRegistererUserSecondOrga}
  `(
    'should let a user with $description query the SaaS platform data',
    async ({ context }: { context: PortalContext }) => {
      // Given / When
      const { data, errors } = await queryRegisteredSaasPlatformData(context);

      // Then
      expect(errors).toBeUndefined();
      expect(data).toEqual({
        registeredSaasPlatformData: { metadata: { hostname: HOSTNAME } },
      });
    }
  );

  it('should forbid a user without any of these capabilities to query the SaaS platform data', async () => {
    // Given / When
    const { data, errors } = await queryRegisteredSaasPlatformData(
      contextSimpleUserSecondOrga
    );

    // Then
    expect(errors?.[0]?.message).toMatch(/^Not authorized/);
    expect(data).toEqual({ registeredSaasPlatformData: null });
    expect(
      ProductInformationApp.loadRegisteredSaasPlatformData
    ).not.toHaveBeenCalled();
  });
});
