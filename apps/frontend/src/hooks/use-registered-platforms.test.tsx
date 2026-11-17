import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { testRenderHook } from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
import { registeredPlatformsKeys } from '@graphql/registered-platforms/registered-platforms.keys';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/hooks/use-registered-platforms');

const mocks = vi.hoisted(() => ({
  useRegisteredPlatformsListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useRegisteredPlatformsListQuery: mocks.useRegisteredPlatformsListQuery,
  });
});

const PLATFORM = {
  id: 'platform-id',
  title: 'Production OpenCTI',
  url: 'https://opencti.acme.com',
  version: '6.4.0',
  contract: 'EE',
};

describe('useRegisteredPlatforms', () => {
  beforeEach(() => {
    mocks.useRegisteredPlatformsListQuery.mockReset();
  });

  it.each([
    ['every', {}, false],
    ['only the active', { onlyActive: true }, true],
  ])(
    'should list %s registered platforms of the product',
    (_scope, options, onlyActive) => {
      // Given
      mocks.useRegisteredPlatformsListQuery.mockReturnValue({
        data: { registeredPlatforms: [PLATFORM] },
        isPending: false,
      });

      // When
      const { result } = testRenderHook(() =>
        useRegisteredPlatforms(PlatformIdentifier.Opencti, options)
      );

      // Then
      const variables = {
        input: {
          identifier: PlatformIdentifier.Opencti,
          onlyActive,
          onlyTrial: null,
          hasDeployedResources: null,
        },
      };
      expect(mocks.useRegisteredPlatformsListQuery).toHaveBeenCalledWith(
        portalGraphqlClient,
        variables,
        expect.objectContaining({
          queryKey: registeredPlatformsKeys.list(variables),
        })
      );
      expect(result.current).toEqual({
        platforms: [PLATFORM],
        isPending: false,
      });
    }
  );

  it('should report an empty list as pending until the platforms are loaded', () => {
    // Given
    mocks.useRegisteredPlatformsListQuery.mockReturnValue({
      data: undefined,
      isPending: true,
    });

    // When
    const { result } = testRenderHook(() =>
      useRegisteredPlatforms(PlatformIdentifier.Openaev)
    );

    // Then
    expect(result.current).toEqual({ platforms: [], isPending: true });
  });
});
