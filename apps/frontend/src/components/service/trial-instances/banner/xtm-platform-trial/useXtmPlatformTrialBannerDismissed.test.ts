import { useXtmPlatformTrialBannerDismissed } from '@/components/service/trial-instances/banner/xtm-platform-trial/useXtmPlatformTrialBannerDismissed';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

describe('useXtmPlatformTrialBannerDismissed', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('should not be dismissed by default for the "no-trial" state', () => {
    const { result } = renderHook(() =>
      useXtmPlatformTrialBannerDismissed('no-trial')
    );

    expect(result.current.dismissed).toBe(false);
  });

  it('should persist dismissal of the "no-trial" state independently from "active"', () => {
    const { result: noTrialResult } = renderHook(() =>
      useXtmPlatformTrialBannerDismissed('no-trial')
    );

    act(() => {
      noTrialResult.current.dismiss();
    });

    const { result: rerenderedNoTrialResult } = renderHook(() =>
      useXtmPlatformTrialBannerDismissed('no-trial')
    );
    const { result: activeResult } = renderHook(() =>
      useXtmPlatformTrialBannerDismissed('active')
    );

    expect(rerenderedNoTrialResult.current.dismissed).toBe(true);
    expect(activeResult.current.dismissed).toBe(false);
  });

  it('should always report "ending" as not dismissable, even after a prior "active" dismissal', () => {
    const { result: activeResult } = renderHook(() =>
      useXtmPlatformTrialBannerDismissed('active')
    );

    act(() => {
      activeResult.current.dismiss();
    });

    const { result: endingResult } = renderHook(() =>
      useXtmPlatformTrialBannerDismissed('ending')
    );

    expect(endingResult.current.dismissed).toBe(false);
  });

  it('should report "none" as not dismissable', () => {
    const { result } = renderHook(() =>
      useXtmPlatformTrialBannerDismissed('none')
    );

    expect(result.current.dismissed).toBe(false);
  });
});
