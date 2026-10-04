import { useRegisteredPlatformsFragment$data } from '@generated/useRegisteredPlatformsFragment.graphql';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBuildCompatibilityTranslationKey } from './use-build-compatibility-translation-key';

const platform = (title: string, version: string) =>
  ({ title, version }) as useRegisteredPlatformsFragment$data;

describe('useBuildCompatibilityTranslationKey', () => {
  it('reports an LTS platform older than the required version as incompatible', () => {
    const { result } = renderHook(() =>
      useBuildCompatibilityTranslationKey({
        platforms: [
          platform('Production', '7.260811.0-lts.1'),
          platform('Staging', '7.261010.0'),
          platform('Long-term support', '7.261003.0-lts'),
        ],
        requiredProductVersion: '7.261003.0',
      })
    );

    expect(result.current).toEqual({
      platformToBeUpdated: 'Production',
      incompatiblePlatformsCount: 1,
    });
  });

  it('reports every platform as compatible when no version is required', () => {
    const { result } = renderHook(() =>
      useBuildCompatibilityTranslationKey({
        platforms: [platform('Production', '7.260811.0-lts.1')],
        requiredProductVersion: null,
      })
    );

    expect(result.current).toEqual({
      platformToBeUpdated: '',
      incompatiblePlatformsCount: 0,
    });
  });
});
