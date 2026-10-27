import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '@/utils/constant';
import { PlatformEnvironmentDocument } from '@graphql/generated';
import { describe, expect, it, vi } from 'vitest';
import {
  fetchPlatformEnvironment,
  isProductionPlatform,
} from './platform-environment.server';

vi.mock('@/lib/server-graphql-fetch', () => ({ serverGraphqlFetch: vi.fn() }));

const givenEnvironment = (environment: string) =>
  vi.mocked(serverGraphqlFetch).mockResolvedValue({
    settings: { environment },
  });

describe('fetchPlatformEnvironment', () => {
  it('should read the environment through the Data Cache like public pages', async () => {
    // Given
    givenEnvironment('staging');

    // When
    const environment = await fetchPlatformEnvironment();

    // Then
    expect(environment).toBe('staging');
    expect(serverGraphqlFetch).toHaveBeenCalledWith(
      PlatformEnvironmentDocument,
      {},
      { cache: undefined, next: { revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS } }
    );
  });

  it('should return null when the API cannot be reached', async () => {
    // Given
    vi.mocked(serverGraphqlFetch).mockRejectedValue(new Error('unreachable'));

    // When
    const environment = await fetchPlatformEnvironment();

    // Then
    expect(environment).toBeNull();
  });
});

describe('isProductionPlatform', () => {
  it.each`
    environment      | expected
    ${'production'}  | ${true}
    ${'staging'}     | ${false}
    ${'development'} | ${false}
    ${'Production'}  | ${false}
    ${''}            | ${false}
  `(
    'should return $expected when the environment is "$environment"',
    async ({ environment, expected }) => {
      // Given
      givenEnvironment(environment);

      // When
      const isProduction = await isProductionPlatform();

      // Then
      expect(isProduction).toBe(expected);
    }
  );

  it('should return false when the API cannot be reached', async () => {
    // Given
    vi.mocked(serverGraphqlFetch).mockRejectedValue(new Error('unreachable'));

    // When
    const isProduction = await isProductionPlatform();

    // Then
    expect(isProduction).toBe(false);
  });

  it('should return false when the API answers without settings', async () => {
    // Given
    vi.mocked(serverGraphqlFetch).mockResolvedValue(undefined);

    // When
    const isProduction = await isProductionPlatform();

    // Then
    expect(isProduction).toBe(false);
  });
});
