import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { loadMeUser } from '@/utils/load-me-user';
import { buildSignupRedirect } from '@/utils/redirect';
import { ServiceDefinitionIdentifier } from '@graphql/generated';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirectToResource } from './resource';
import {
  loadBaseUrlFront,
  loadPlatformOrganizationId,
  loadServiceInstances,
} from './utils/load';
import { trackNewsFeedRedirect } from './utils/news-feed-telemetry';

const changeSelectedOrganizationFetcher = vi.fn();

vi.mock('./utils/load');
vi.mock('./utils/news-feed-telemetry');
vi.mock('../../../src/utils/load-me-user');
vi.mock('../../../src/lib/graphql-client', () => ({
  getAuthenticatedGraphqlClient: vi.fn(),
}));
vi.mock('@graphql/generated', async (importOriginal) => {
  const original = await importOriginal<typeof import('@graphql/generated')>();
  return {
    ...original,
    useChangeSelectedOrganizationMutation: {
      fetcher: (...args: unknown[]) =>
        changeSelectedOrganizationFetcher(...args),
    },
  };
});

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
    vi.mocked(getAuthenticatedGraphqlClient).mockResolvedValue(
      {} as Awaited<ReturnType<typeof getAuthenticatedGraphqlClient>>
    );
    changeSelectedOrganizationFetcher.mockReturnValue(() =>
      Promise.resolve({ changeSelectedOrganization: null })
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
    expect(changeSelectedOrganizationFetcher).not.toHaveBeenCalled();
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
      expect(changeSelectedOrganizationFetcher).toHaveBeenCalledWith(
        expect.anything(),
        { organization_id: 'organization-from-platform' }
      );
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
    expect(changeSelectedOrganizationFetcher).toHaveBeenCalledWith(
      expect.anything(),
      { organization_id: defaultUser.selected_organization_id }
    );
  });

  it('should send the visitor to the signup page when the organization switch is unauthenticated', async () => {
    // Given
    const redirectSentinel = new Error('NEXT_REDIRECT');
    // Next.js' redirect never returns: it throws to interrupt the render.
    vi.mocked(redirect).mockImplementation(() => {
      throw redirectSentinel;
    });
    changeSelectedOrganizationFetcher.mockReturnValue(() =>
      Promise.reject(new UnauthenticatedError())
    );

    // When
    const response = redirectToResource(
      { identifier: IDENTIFIER },
      makeRequest()
    );

    // Then
    await expect(response).rejects.toBe(redirectSentinel);
    expect(redirect).toHaveBeenCalledWith(buildSignupRedirect(null));
    expect(loadServiceInstances).not.toHaveBeenCalled();
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
    expect(changeSelectedOrganizationFetcher).toHaveBeenCalledOnce();
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

// What is tracked, and how failures are handled, is covered by utils/news-feed-telemetry.test.ts
describe('redirectToResource news feed telemetry', () => {
  const INSTANCE_ID = 'instance-1';
  const DOCUMENT_ID = 'document-1';
  const NEWS_FEED_QUERY = `utm_source=opencti&utm_medium=newsfeed&utm_campaign=hub_resources&utm_content=custom_dashboard&document_id=${DOCUMENT_ID}&platform_id=platform-1`;
  const EXPECTED_LOCATION = `${BASE_URL}/app/service/${IDENTIFIER}/${INSTANCE_ID}/${DOCUMENT_ID}?utm_source=opencti&utm_medium=newsfeed&utm_campaign=hub_resources&utm_content=custom_dashboard`;

  const makeNewsFeedRequest = () =>
    makeRequest(`/redirect/${IDENTIFIER}?${NEWS_FEED_QUERY}`);

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
    vi.mocked(getAuthenticatedGraphqlClient).mockResolvedValue(
      {} as Awaited<ReturnType<typeof getAuthenticatedGraphqlClient>>
    );
    changeSelectedOrganizationFetcher.mockReturnValue(() =>
      Promise.resolve({ changeSelectedOrganization: null })
    );
  });

  it('should track the news feed redirect once when the user is sent to the resource page', async () => {
    // Given
    const request = makeNewsFeedRequest();

    // When
    const response = await redirectToResource(
      { identifier: IDENTIFIER },
      request
    );

    // Then
    expect(response.headers.get('location')).toBe(EXPECTED_LOCATION);
    expect(trackNewsFeedRedirect).toHaveBeenCalledOnce();
    expect(trackNewsFeedRedirect).toHaveBeenCalledWith(IDENTIFIER, request);
  });

  it('should track nothing when the user is sent to the login page', async () => {
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
    expect(trackNewsFeedRedirect).not.toHaveBeenCalled();
  });

  it('should track nothing when the identifier is invalid', async () => {
    // Given
    const request = makeNewsFeedRequest();

    // When
    const response = await redirectToResource(
      { identifier: 'invalid-identifier' },
      request
    );

    // Then
    expect(response.status).toBe(400);
    expect(trackNewsFeedRedirect).not.toHaveBeenCalled();
  });

  it('should track nothing when the service has no instance', async () => {
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
    expect(trackNewsFeedRedirect).not.toHaveBeenCalled();
  });
});
