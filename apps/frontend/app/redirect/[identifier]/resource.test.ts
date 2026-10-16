import { serverMutateGraphQL } from '@/relay/server-portal-api-fetch';
import { loadMeUser } from '@/utils/load-me-user';
import {
  NewsFeedUtmContent,
  PlatformIdentifier,
  SendNewsFeedRedirectTelemetryDocument,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirectToResource } from './resource';
import {
  loadBaseUrlFront,
  loadPlatformOrganizationId,
  loadServiceInstances,
} from './utils/load';

const telemetryMocks = vi.hoisted(() => ({
  request: vi.fn(),
  createPortalGraphqlClient: vi.fn(),
}));

vi.mock('../../../src/relay/server-portal-api-fetch', () => ({
  serverMutateGraphQL: vi.fn(),
}));
vi.mock('@/lib/graphql-client', () => ({
  createPortalGraphqlClient: telemetryMocks.createPortalGraphqlClient,
}));
vi.mock('./utils/load');
vi.mock('../../../src/utils/load-me-user');

const BASE_URL = 'http://localhost:3002';
const IDENTIFIER = ServiceDefinitionIdentifier.OpenaevScenarios;

type LoadServiceInstancesResult = Awaited<
  ReturnType<typeof loadServiceInstances>
>;
type LoadMeUserResult = Awaited<ReturnType<typeof loadMeUser>>;

const makeRequest = (pathAndQuery = `/redirect/${IDENTIFIER}`) =>
  new NextRequest(`${BASE_URL}${pathAndQuery}`);

const defaultUser: LoadMeUserResult = {
  id: 'user-1',
  selected_organization_id: 'organization-id',
  organizations: [],
  capabilities: [],
  selected_org_capabilities: [],
};

describe('redirectToResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadBaseUrlFront).mockResolvedValue(BASE_URL);
    vi.mocked(loadMeUser).mockResolvedValue(defaultUser);
    vi.mocked(loadPlatformOrganizationId).mockResolvedValue(undefined);
    vi.mocked(loadServiceInstances).mockResolvedValue(
      [] as LoadServiceInstancesResult
    );
  });

  it('redirects to login when the user is not authenticated', async () => {
    // Given
    const pathAndQuery = `/redirect/${IDENTIFIER}?platform_id=platform-1&tenant_id=tenant-1`;
    const expectedLocation = `${BASE_URL}/login?redirect=${btoa(pathAndQuery)}`;
    vi.mocked(loadMeUser).mockResolvedValue(null);

    // When
    const response = await redirectToResource(
      { identifier: IDENTIFIER },
      makeRequest(pathAndQuery)
    );

    // Then
    expect(response.headers.get('location')).toBe(expectedLocation);
    expect(loadPlatformOrganizationId).not.toHaveBeenCalled();
    expect(serverMutateGraphQL).not.toHaveBeenCalled();
    expect(loadServiceInstances).not.toHaveBeenCalled();
  });

  it.each`
    pathAndQuery                                                            | expectedPlatformId | expectedTenantId | description
    ${`/redirect/${IDENTIFIER}?opencti_platform_id=opencti-1`}              | ${'opencti-1'}     | ${null}          | ${'uses opencti_platform_id without tenant_id'}
    ${`/redirect/${IDENTIFIER}?oaev_instance_id=oaev-1&tenant_id=tenant-1`} | ${'oaev-1'}        | ${'tenant-1'}    | ${'uses oaev_instance_id with tenant_id'}
    ${`/redirect/${IDENTIFIER}?oaev_instance_id=oaev-2`}                    | ${'oaev-2'}        | ${null}          | ${'uses oaev_instance_id without tenant_id'}
    ${`/redirect/${IDENTIFIER}?platform_id=platform-1`}                     | ${'platform-1'}    | ${null}          | ${'uses platform_id without tenant_id'}
  `(
    'loads platform organization from supported query params ($description)',
    async ({ pathAndQuery, expectedPlatformId, expectedTenantId }) => {
      // Given
      vi.mocked(loadPlatformOrganizationId).mockResolvedValue(
        'organization-from-platform'
      );

      // When
      await redirectToResource(
        { identifier: IDENTIFIER },
        makeRequest(pathAndQuery)
      );

      // Then
      expect(loadPlatformOrganizationId).toHaveBeenCalledOnce();
      expect(loadPlatformOrganizationId).toHaveBeenCalledWith(
        expectedPlatformId,
        expectedTenantId
      );
      expect(serverMutateGraphQL).toHaveBeenCalledWith(expect.anything(), {
        organization_id: 'organization-from-platform',
      });
    }
  );

  it('uses selected_organization_id when no platform organization is found', async () => {
    // Given
    vi.mocked(loadPlatformOrganizationId).mockResolvedValue(undefined);

    // When
    await redirectToResource(
      { identifier: IDENTIFIER },
      makeRequest(
        `/redirect/${IDENTIFIER}?platform_id=platform-1&tenant_id=tenant-1`
      )
    );

    // Then
    expect(serverMutateGraphQL).toHaveBeenCalledWith(expect.anything(), {
      organization_id: defaultUser.selected_organization_id,
    });
  });

  it('returns 400 for an invalid identifier', async () => {
    // Given
    const invalidIdentifier = 'invalid-identifier';
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    // When
    const response = await redirectToResource(
      { identifier: invalidIdentifier },
      makeRequest(
        `/redirect/${IDENTIFIER}?platform_id=platform-1&tenant_id=tenant-1`
      )
    );

    // Then
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid identifier');
    expect(serverMutateGraphQL).toHaveBeenCalledOnce();
    expect(loadServiceInstances).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  const redirectDestinationCases = [
    {
      description: 'to /app when no instance exists',
      serviceInstances: [],
      expectedLocation: `${BASE_URL}/app`,
    },
    {
      description: 'to the instance',
      serviceInstances: [
        {
          id: 'instance-target',
          service_definition: {
            identifier: ServiceDefinitionIdentifier.OpenaevScenarios,
          },
        },
      ],
      expectedLocation: `${BASE_URL}/app/service/${ServiceDefinitionIdentifier.OpenaevScenarios}/instance-target`,
    },
  ];

  it.each(redirectDestinationCases)(
    'redirects to the correct destination ($description)',
    async ({ serviceInstances, expectedLocation }) => {
      // Given
      vi.mocked(loadServiceInstances).mockResolvedValue(
        serviceInstances as LoadServiceInstancesResult
      );

      // When
      const response = await redirectToResource(
        { identifier: IDENTIFIER },
        makeRequest()
      );

      // Then
      expect(loadServiceInstances).toHaveBeenCalledWith(IDENTIFIER);
      expect(response.headers.get('location')).toBe(expectedLocation);
    }
  );

  it.each`
    pathAndQuery                                                                                         | expectedLocation                                                                         | description
    ${`/redirect/${IDENTIFIER}?label=foo&deployable=true`}                                               | ${`${BASE_URL}/app/service/${IDENTIFIER}/instance-target?label=foo&deployable=true`}     | ${'forwards extra params'}
    ${`/redirect/${IDENTIFIER}?platform_id=platform-1&label=foo`}                                        | ${`${BASE_URL}/app/service/${IDENTIFIER}/instance-target?label=foo`}                     | ${'strips internal platform_id, keeps extra params'}
    ${`/redirect/${IDENTIFIER}?opencti_platform_id=opencti-1&oaev_instance_id=oaev-1&label=bar`}         | ${`${BASE_URL}/app/service/${IDENTIFIER}/instance-target?label=bar`}                     | ${'strips all internal params, keeps extra params'}
    ${`/redirect/${IDENTIFIER}?platform_id=platform-1&tenant_id=tenant-1&oaev_instance_id=oaev-1`}       | ${`${BASE_URL}/app/service/${IDENTIFIER}/instance-target`}                               | ${'strips all internal params, no extra params → no query string'}
    ${`/redirect/${IDENTIFIER}?platform_id=platform-1&tenant_id=tenant-1&label=foo&integrationType=bar`} | ${`${BASE_URL}/app/service/${IDENTIFIER}/instance-target?label=foo&integrationType=bar`} | ${'strips internal params, forwards multiple extra params'}
    ${`/redirect/${IDENTIFIER}?label=foo&label=bar`}                                                     | ${`${BASE_URL}/app/service/${IDENTIFIER}/instance-target?label=foo&label=bar`}           | ${'preserves repeated params'}
    ${`/redirect/${IDENTIFIER}?document_id=doc-42`}                                                      | ${`${BASE_URL}/app/service/${IDENTIFIER}/instance-target/doc-42`}                        | ${'maps document_id to path segment'}
    ${`/redirect/${IDENTIFIER}?label=foo&document_id=doc-42`}                                            | ${`${BASE_URL}/app/service/${IDENTIFIER}/instance-target/doc-42?label=foo`}              | ${'places document_id as a path segment before the forwarded query string'}
  `(
    'forwards query params correctly to the instance redirect ($description)',
    async ({ pathAndQuery, expectedLocation }) => {
      // Given
      vi.mocked(loadServiceInstances).mockResolvedValue([
        {
          id: 'instance-target',
          service_definition: {
            identifier: ServiceDefinitionIdentifier.OpenaevScenarios,
          },
        },
      ] as LoadServiceInstancesResult);

      // When
      const response = await redirectToResource(
        { identifier: IDENTIFIER },
        makeRequest(pathAndQuery)
      );

      // Then
      expect(response.headers.get('location')).toBe(expectedLocation);
    }
  );

  it('does not forward extra params to the fallback /app redirect when no instance exists', async () => {
    // Given
    vi.mocked(loadServiceInstances).mockResolvedValue(
      [] as LoadServiceInstancesResult
    );

    // When
    const response = await redirectToResource(
      { identifier: IDENTIFIER },
      makeRequest(`/redirect/${IDENTIFIER}?label=foo&deployable=true`)
    );

    // Then
    expect(response.headers.get('location')).toBe(`${BASE_URL}/app`);
  });

  it('does not forward document_id to the fallback /app redirect when no instance exists', async () => {
    // Given
    vi.mocked(loadServiceInstances).mockResolvedValue(
      [] as LoadServiceInstancesResult
    );

    // When
    const response = await redirectToResource(
      { identifier: IDENTIFIER },
      makeRequest(`/redirect/${IDENTIFIER}?document_id=doc-42`)
    );

    // Then
    expect(response.headers.get('location')).toBe(`${BASE_URL}/app`);
  });

  it('percent-encodes the instance id and document_id when they contain base64 special characters', async () => {
    // Given
    // Relay global IDs are base64 and can contain `+`, `/`, `=`; embedding
    // them raw as path segments would corrupt or split the destination URL.
    const INSTANCE_ID_WITH_SPECIAL_CHARS = 'U2VydmljZUluc3RhbmNlOnh4/+PT0=';
    const DOCUMENT_ID_WITH_SPECIAL_CHARS = 'RG9jdW1lbnQ6eXl5/+PT0=';
    vi.mocked(loadServiceInstances).mockResolvedValue([
      {
        id: INSTANCE_ID_WITH_SPECIAL_CHARS,
        service_definition: {
          identifier: ServiceDefinitionIdentifier.OpenaevScenarios,
        },
      },
    ] as LoadServiceInstancesResult);

    // When
    const response = await redirectToResource(
      { identifier: IDENTIFIER },
      makeRequest(
        `/redirect/${IDENTIFIER}?document_id=${encodeURIComponent(DOCUMENT_ID_WITH_SPECIAL_CHARS)}`
      )
    );

    // Then
    expect(response.headers.get('location')).toBe(
      `${BASE_URL}/app/service/${IDENTIFIER}/${encodeURIComponent(INSTANCE_ID_WITH_SPECIAL_CHARS)}/${encodeURIComponent(DOCUMENT_ID_WITH_SPECIAL_CHARS)}`
    );
  });
});

describe('redirectToResource news feed telemetry', () => {
  const SESSION_COOKIE = 'session=session-1';
  const INSTANCE_ID = 'instance-1';
  const DOCUMENT_ID = 'document-1';
  const PLATFORM_ID = 'platform-1';
  const NEWS_FEED_QUERY = `utm_source=opencti&utm_medium=newsfeed&utm_campaign=hub_resources&utm_content=custom_dashboard&document_id=${DOCUMENT_ID}&platform_id=${PLATFORM_ID}`;
  const EXPECTED_LOCATION = `${BASE_URL}/app/service/${IDENTIFIER}/${INSTANCE_ID}/${DOCUMENT_ID}?utm_source=opencti&utm_medium=newsfeed&utm_campaign=hub_resources&utm_content=custom_dashboard`;

  const makeNewsFeedRequest = (query = NEWS_FEED_QUERY) =>
    new NextRequest(`${BASE_URL}/redirect/${IDENTIFIER}?${query}`, {
      headers: { cookie: SESSION_COOKIE },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadBaseUrlFront).mockResolvedValue(BASE_URL);
    vi.mocked(loadMeUser).mockResolvedValue(defaultUser);
    vi.mocked(loadPlatformOrganizationId).mockResolvedValue(undefined);
    vi.mocked(loadServiceInstances).mockResolvedValue([
      {
        id: INSTANCE_ID,
        service_definition: { identifier: IDENTIFIER },
      },
    ] as LoadServiceInstancesResult);
    telemetryMocks.request.mockResolvedValue({
      sendTelemetryEvent: { newsFeedRedirect: { result: true } },
    });
    telemetryMocks.createPortalGraphqlClient.mockReturnValue({
      request: telemetryMocks.request,
    });
  });

  it('should emit one news feed redirect event with the full payload when the user is sent to the resource page', async () => {
    // Given
    const request = makeNewsFeedRequest();

    // When
    const response = await redirectToResource(
      { identifier: IDENTIFIER },
      request
    );

    // Then
    expect(response.headers.get('location')).toBe(EXPECTED_LOCATION);
    expect(telemetryMocks.request).toHaveBeenCalledOnce();
    expect(telemetryMocks.request).toHaveBeenCalledWith(
      SendNewsFeedRedirectTelemetryDocument,
      {
        input: {
          service_identifier: IDENTIFIER,
          resource_id: DOCUMENT_ID,
          platform_id: PLATFORM_ID,
          platform_identifier: PlatformIdentifier.Opencti,
          utm_content: NewsFeedUtmContent.CustomDashboard,
        },
      }
    );
  });

  it('should send the event with the session of the user', async () => {
    // Given
    const request = makeNewsFeedRequest();

    // When
    await redirectToResource({ identifier: IDENTIFIER }, request);

    // Then
    expect(telemetryMocks.createPortalGraphqlClient).toHaveBeenCalledOnce();
    expect(telemetryMocks.createPortalGraphqlClient).toHaveBeenCalledWith(
      SESSION_COOKIE
    );
  });

  it('should leave out the values of the query that are not members of the enums', async () => {
    // Given
    const request = makeNewsFeedRequest(
      `utm_medium=newsfeed&utm_source=unknown&utm_content=blog_post&document_id=${DOCUMENT_ID}`
    );

    // When
    await redirectToResource({ identifier: IDENTIFIER }, request);

    // Then
    expect(telemetryMocks.request).toHaveBeenCalledWith(
      SendNewsFeedRedirectTelemetryDocument,
      {
        input: {
          service_identifier: IDENTIFIER,
          resource_id: DOCUMENT_ID,
          platform_id: null,
          platform_identifier: null,
          utm_content: null,
        },
      }
    );
  });

  it('should emit nothing when the user is sent to the login page', async () => {
    // Given
    vi.mocked(loadMeUser).mockResolvedValue(null);
    const request = makeNewsFeedRequest();

    // When
    const response = await redirectToResource(
      { identifier: IDENTIFIER },
      request
    );

    // Then
    expect(response.headers.get('location')).toContain(`${BASE_URL}/login`);
    expect(telemetryMocks.createPortalGraphqlClient).not.toHaveBeenCalled();
    expect(telemetryMocks.request).not.toHaveBeenCalled();
  });

  it('should emit nothing when the identifier is invalid', async () => {
    // Given
    const request = makeNewsFeedRequest();

    // When
    const response = await redirectToResource(
      { identifier: 'invalid-identifier' },
      request
    );

    // Then
    expect(response.status).toBe(400);
    expect(telemetryMocks.createPortalGraphqlClient).not.toHaveBeenCalled();
    expect(telemetryMocks.request).not.toHaveBeenCalled();
  });

  it('should emit nothing when the service has no instance', async () => {
    // Given
    vi.mocked(loadServiceInstances).mockResolvedValue(
      [] as LoadServiceInstancesResult
    );
    const request = makeNewsFeedRequest();

    // When
    const response = await redirectToResource(
      { identifier: IDENTIFIER },
      request
    );

    // Then
    expect(response.headers.get('location')).toBe(`${BASE_URL}/app`);
    expect(telemetryMocks.createPortalGraphqlClient).not.toHaveBeenCalled();
    expect(telemetryMocks.request).not.toHaveBeenCalled();
  });

  it.each([
    ['utm_medium is missing', `document_id=${DOCUMENT_ID}&utm_source=opencti`],
    [
      'utm_medium is another medium',
      `document_id=${DOCUMENT_ID}&utm_medium=referral`,
    ],
    ['the link has no query', ''],
  ])(
    'should emit nothing when %s',
    async (_description: string, query: string) => {
      // Given
      const request = makeNewsFeedRequest(query);

      // When
      await redirectToResource({ identifier: IDENTIFIER }, request);

      // Then
      expect(telemetryMocks.createPortalGraphqlClient).not.toHaveBeenCalled();
      expect(telemetryMocks.request).not.toHaveBeenCalled();
    }
  );

  describe('when the telemetry fails', () => {
    it.each([
      [
        'the request rejects',
        () => telemetryMocks.request.mockRejectedValue(new Error('boom')),
      ],
      [
        'the request throws',
        () =>
          telemetryMocks.request.mockImplementation(() => {
            throw new Error('boom');
          }),
      ],
      [
        'the client cannot be created',
        () =>
          telemetryMocks.createPortalGraphqlClient.mockImplementation(() => {
            throw new Error('boom');
          }),
      ],
      [
        'the request never resolves',
        () =>
          telemetryMocks.request.mockReturnValue(new Promise(() => undefined)),
      ],
    ])(
      'should keep the same redirect when %s',
      async (_description: string, makeTelemetryFail: () => void) => {
        // Given
        makeTelemetryFail();
        const request = makeNewsFeedRequest();

        // When
        const response = await redirectToResource(
          { identifier: IDENTIFIER },
          request
        );

        // Then
        expect(response.status).toBe(307);
        expect(response.headers.get('location')).toBe(EXPECTED_LOCATION);
      }
    );
  });
});
