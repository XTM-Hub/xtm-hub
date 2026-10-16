import { useXtmoneIntegrationStatus } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/useXtmoneIntegrationStatus';
import { testRenderHook } from '@/utils/test/test-render';
import {
  XtmoneIntegrationStatusFragment,
  XtmonePlatformIntegrationStatusQuery,
} from '@graphql/generated';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SERVICE_INSTANCE_ID = 'xtmone-service-instance-1';
const LAST_CHECKED_AT = '2026-07-30T12:31:53+00:00';

const INTEGRATION_STATUS: XtmoneIntegrationStatusFragment = {
  opencti: {
    status: 'connected',
    connected: true,
    last_checked_at: LAST_CHECKED_AT,
  },
  openaev: {
    status: 'disconnected',
    connected: false,
    last_checked_at: LAST_CHECKED_AT,
  },
  linked: true,
  last_checked_at: LAST_CHECKED_AT,
};

const graphqlMocks = vi.hoisted(() => ({
  queryResponse: undefined as XtmonePlatformIntegrationStatusQuery | undefined,
  useXtmonePlatformIntegrationStatusQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useXtmonePlatformIntegrationStatusQuery:
    graphqlMocks.useXtmonePlatformIntegrationStatusQuery,
}));

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

describe('useXtmoneIntegrationStatus', () => {
  beforeEach(() => {
    graphqlMocks.queryResponse = {
      xtmonePlatformIntegrationStatus: INTEGRATION_STATUS,
    };
    graphqlMocks.useXtmonePlatformIntegrationStatusQuery.mockImplementation(
      (_client: unknown, _variables: unknown, { enabled }) => ({
        data: enabled ? graphqlMocks.queryResponse : undefined,
        isLoading: false,
        isError: false,
      })
    );
  });

  it.each([
    {
      context: 'the XTM One platform reports its status',
      queryResponse: { xtmonePlatformIntegrationStatus: INTEGRATION_STATUS },
      expectedStatus: INTEGRATION_STATUS,
    },
    {
      context: 'the XTM One platform reports no status',
      queryResponse: { xtmonePlatformIntegrationStatus: null },
      expectedStatus: undefined,
    },
  ])(
    'should return the status found in the query response when $context',
    ({ queryResponse, expectedStatus }) => {
      // Given
      graphqlMocks.queryResponse = queryResponse;

      // When
      const { result } = testRenderHook(() =>
        useXtmoneIntegrationStatus(SERVICE_INSTANCE_ID)
      );

      // Then
      expect(result.current.data).toEqual(expectedStatus);
    }
  );

  it.each([null, undefined, ''])(
    'should return no status when the service instance id is %o',
    (serviceInstanceId) => {
      // Given / When
      const { result } = testRenderHook(() =>
        useXtmoneIntegrationStatus(serviceInstanceId)
      );

      // Then
      expect(result.current.data).toBeUndefined();
    }
  );
});
