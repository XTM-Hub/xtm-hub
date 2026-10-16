import { useConnectedPlatforms } from '@/components/connected-products/useConnectedPlatforms';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import { testRenderHook } from '@/utils/test/test-render';
import { ServiceDefinitionIdentifier } from '@graphql/generated';
import { mockRegisteredPlatform } from '@graphql/mocks';
import { waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

const ACTIVE_PLATFORM = mockRegisteredPlatform({
  id: 'platform-active',
  title: 'Active OpenCTI',
  identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
});
const INACTIVE_PLATFORM = mockRegisteredPlatform({
  id: 'platform-inactive',
  title: 'Inactive OpenAEV',
  identifier: ServiceDefinitionIdentifier.OpenaevRegistration,
});

describe('useConnectedPlatforms', () => {
  it('should be loading with no platform until the platforms are received', async () => {
    // Given
    mswServer.use(
      mockGraphqlQuery({
        queryName: 'RegisteredPlatformsList',
        data: { registeredPlatforms: [ACTIVE_PLATFORM] },
      })
    );

    // When
    const { result } = testRenderHook(() => useConnectedPlatforms());

    // Then
    expect(result.current.isLoading).toBe(true);
    expect(result.current.connectedPlatforms).toEqual([]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('should only expose the active platforms', async () => {
    // Given
    mswServer.use(
      graphql.query('RegisteredPlatformsList', ({ variables }) =>
        HttpResponse.json({
          data: {
            registeredPlatforms: variables.input.onlyActive
              ? [ACTIVE_PLATFORM]
              : [ACTIVE_PLATFORM, INACTIVE_PLATFORM],
          },
        })
      )
    );

    // When
    const { result } = testRenderHook(() => useConnectedPlatforms());

    // Then
    await waitFor(() =>
      expect(result.current.connectedPlatforms).toHaveLength(1)
    );
    expect(result.current.connectedPlatforms[0].title).toBe(
      ACTIVE_PLATFORM.title
    );
    expect(result.current.isError).toBe(false);
  });

  it('should expose no platform when none is connected', async () => {
    // Given
    mswServer.use(
      mockGraphqlQuery({
        queryName: 'RegisteredPlatformsList',
        data: { registeredPlatforms: [] },
      })
    );

    // When
    const { result } = testRenderHook(() => useConnectedPlatforms());

    // Then
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.connectedPlatforms).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it('should report an error and no platform when the platforms cannot be loaded', async () => {
    // Given
    mswServer.use(
      mockGraphqlQuery({
        queryName: 'RegisteredPlatformsList',
        errors: [{ message: 'Something went wrong' }],
      })
    );

    // When
    const { result } = testRenderHook(() => useConnectedPlatforms());

    // Then
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.connectedPlatforms).toEqual([]);
  });
});
