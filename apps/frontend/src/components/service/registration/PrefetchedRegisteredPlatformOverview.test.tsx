import { PrefetchedRegisteredPlatformOverview } from '@/components/service/registration/PrefetchedRegisteredPlatformOverview';
import { basePlatform } from '@/components/service/registration/registered-platform.fixtures';
import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { PlatformIdentifier } from '@graphql/generated';
import { registrationKeys } from '@graphql/registration/registration.keys';
import { DehydratedState } from '@tanstack/react-query';
import { GraphQLClient } from 'graphql-request';
import { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';
import { RequestCookiesAdapter } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  // What the server fetches, through `useRegisteredPlatformByServiceInstanceQuery.fetcher`.
  serverFetch: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useRegisteredPlatformByServiceInstanceQuery: Object.assign(vi.fn(), {
      fetcher:
        (...args: unknown[]) =>
        () =>
          mocks.serverFetch(...args),
    }),
  });
});

const VISITOR_COOKIE = 'xtm-hub-session=visitor-session';
const SERVICE_INSTANCE_ID = 'service instance/id';
const NOT_FOUND_ERROR = 'NEXT_NOT_FOUND';
const REDIRECT_ERROR = 'NEXT_REDIRECT';

const VARIABLES = { input: { service_instance_id: SERVICE_INSTANCE_ID } };

const renderPage = () =>
  PrefetchedRegisteredPlatformOverview({
    params: Promise.resolve({
      serviceInstanceId: encodeURIComponent(SERVICE_INSTANCE_ID),
    }),
    platformIdentifier: PlatformIdentifier.Opencti,
  }) as Promise<ReactElement<{ state: DehydratedState }>>;

describe('PrefetchedRegisteredPlatformOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue(
      RequestCookiesAdapter.seal(
        new RequestCookies(new Headers({ cookie: VISITOR_COOKIE }))
      )
    );
    vi.mocked(notFound).mockImplementation(() => {
      throw new Error(NOT_FOUND_ERROR);
    });
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error(REDIRECT_ERROR);
    });
    mocks.serverFetch.mockResolvedValue({ registeredPlatform: basePlatform });
  });

  it('should fetch the platform of the decoded service instance id with the visitor cookies', async () => {
    // When
    await renderPage();

    // Then
    const [client, variables] = mocks.serverFetch.mock.lastCall as [
      GraphQLClient,
      typeof VARIABLES,
    ];
    expect(variables).toEqual(VARIABLES);
    expect(client.requestConfig.headers).toMatchObject({
      cookie: VISITOR_COOKIE,
    });
  });

  it('should hand the platform to the overview under the key the overview reads', async () => {
    // When
    const page = await renderPage();

    // Then
    expect(page.props.state.queries).toEqual([
      expect.objectContaining({
        queryKey: registrationKeys.byServiceInstance(VARIABLES),
        state: expect.objectContaining({
          data: { registeredPlatform: basePlatform },
        }),
      }),
    ]);
  });

  it('should answer the not found page when the platform is not visible to the visitor', async () => {
    // Given
    mocks.serverFetch.mockResolvedValue({ registeredPlatform: null });

    // When
    const page = renderPage();

    // Then
    await expect(page).rejects.toThrow(NOT_FOUND_ERROR);
  });

  it('should send an anonymous visitor to the signup page', async () => {
    // Given
    mocks.serverFetch.mockRejectedValue(new UnauthenticatedError());
    vi.mocked(headers).mockResolvedValue(
      new Headers({ 'x-pathname': '/app/service/opencti_registration/id' })
    );

    // When
    const page = renderPage();

    // Then
    await expect(page).rejects.toThrow(REDIRECT_ERROR);
    expect(redirect).toHaveBeenCalled();
  });

  it('should reach the error page when the platform cannot be loaded', async () => {
    // Given
    mocks.serverFetch.mockRejectedValue(new Error('UNKNOWN_ERROR'));

    // When
    const page = renderPage();

    // Then
    await expect(page).rejects.toThrow('UNKNOWN_ERROR');
    expect(notFound).not.toHaveBeenCalled();
  });
});
