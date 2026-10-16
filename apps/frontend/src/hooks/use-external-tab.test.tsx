import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useExternalTab from './use-external-tab';

const PLATFORM_ORIGIN = 'https://opencti.example.com';

const dispatchMessage = (
  source: unknown,
  origin: string,
  data: Record<string, unknown>
) => {
  const event = new MessageEvent('message', { data, origin });
  Object.defineProperty(event, 'source', { value: source });
  window.dispatchEvent(event);
};

const openPlatformTab = (onMessage: (event: MessageEvent) => void) => {
  const tab = {
    closed: false,
    close: vi.fn(),
    focus: vi.fn(),
    postMessage: vi.fn(),
  };
  vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
  const { result } = renderHook(() =>
    useExternalTab({
      url: `${PLATFORM_ORIGIN}/dashboard/xtm-hub/deploy-playbook/1/2`,
      tabName: 'opencti-one-click-deploy',
      onMessage,
      preventUnload: false,
    })
  );
  act(() => {
    result.current.openTab();
  });
  return { tab, result };
};

describe('useExternalTab', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('posts messages to the origin of the opened tab only', () => {
    // Given
    const { tab, result } = openPlatformTab(vi.fn());

    // When
    act(() => {
      result.current.postMessage({ action: 'set-token', token: 'token' });
    });

    // Then
    expect(tab.postMessage).toHaveBeenCalledWith(
      { action: 'set-token', token: 'token' },
      PLATFORM_ORIGIN
    );
  });

  it('handles a message sent by the opened tab from its origin', () => {
    // Given
    const onMessage = vi.fn();
    const { tab } = openPlatformTab(onMessage);

    // When
    act(() => {
      dispatchMessage(tab, PLATFORM_ORIGIN, { action: 'refresh-token' });
    });

    // Then
    expect(onMessage).toHaveBeenCalledOnce();
  });

  it('ignores a message sent by the opened tab from another origin', () => {
    // Given
    const onMessage = vi.fn();
    const { tab } = openPlatformTab(onMessage);

    // When
    act(() => {
      dispatchMessage(tab, 'https://other.example', {
        action: 'refresh-token',
      });
    });

    // Then
    expect(onMessage).not.toHaveBeenCalled();
  });
});
