import useExternalTab from '@/hooks/use-external-tab';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TAB_ORIGIN = 'https://opencti.example.com';
const TAB_URL = `${TAB_ORIGIN}/dashboard/xtm-hub/deploy/instance-id/document-id`;
const OTHER_ORIGIN = 'https://other.example.com';
const TAB_NAME = 'opencti-one-click-deploy';
const MESSAGE = { action: 'set-token', token: 'a-token' };

const createWindow = (): Window => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  return iframe.contentWindow as Window;
};

const dispatchMessage = (
  source: Window,
  origin: string,
  data: Record<string, unknown> = MESSAGE
) => {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin, source }));
  });
};

interface TabCallbacks {
  onMessage?: (event: MessageEvent) => void;
  onClosingTab?: () => void;
}

const renderExternalTab = (
  url: string,
  onMessage: (event: MessageEvent) => void = vi.fn(),
  onClosingTab?: () => void
) => {
  const hook = renderHook(
    ({ onMessage, onClosingTab }: TabCallbacks) =>
      useExternalTab({
        url,
        tabName: TAB_NAME,
        onMessage,
        onClosingTab,
        preventUnload: false,
      }),
    { initialProps: { onMessage, onClosingTab } }
  );
  act(() => {
    hook.result.current.openTab();
  });
  return hook;
};

describe('useExternalTab', () => {
  let tab: Window;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    tab = createWindow();
    vi.spyOn(window, 'open').mockReturnValue(tab);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('should post the message to the origin of the opened url when posting to the tab', () => {
    // Given
    const tabPostMessage = vi
      .spyOn(tab, 'postMessage')
      .mockImplementation(() => undefined);
    const { result } = renderExternalTab(TAB_URL);

    // When
    result.current.postMessage(MESSAGE);

    // Then
    expect(tabPostMessage).toHaveBeenCalledWith(MESSAGE, TAB_ORIGIN);
  });

  it('should not post the message when the opened url has no valid origin', () => {
    // Given
    const tabPostMessage = vi
      .spyOn(tab, 'postMessage')
      .mockImplementation(() => undefined);
    const { result } = renderExternalTab('/dashboard/xtm-hub');

    // When
    result.current.postMessage(MESSAGE);

    // Then
    expect(tabPostMessage).not.toHaveBeenCalled();
  });

  it('should call onMessage when the message comes from the tab with the opened url origin', () => {
    // Given
    const onMessage = vi.fn();
    renderExternalTab(TAB_URL, onMessage);

    // When
    dispatchMessage(tab, TAB_ORIGIN);

    // Then
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ data: MESSAGE, origin: TAB_ORIGIN })
    );
  });

  it('should answer the origin of the tab when it was redirected to another origin', () => {
    // Given
    const onMessage = vi.fn();
    const tabPostMessage = vi
      .spyOn(tab, 'postMessage')
      .mockImplementation(() => undefined);
    const { result } = renderExternalTab(TAB_URL, onMessage);

    // When
    dispatchMessage(tab, OTHER_ORIGIN);
    result.current.postMessage(MESSAGE);

    // Then
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ origin: OTHER_ORIGIN })
    );
    expect(tabPostMessage).toHaveBeenCalledExactlyOnceWith(
      MESSAGE,
      OTHER_ORIGIN
    );
  });

  it('should ignore the message from the tab when its origin is not http(s)', () => {
    // Given
    const onMessage = vi.fn();
    const tabPostMessage = vi
      .spyOn(tab, 'postMessage')
      .mockImplementation(() => undefined);
    const { result } = renderExternalTab(TAB_URL, onMessage);

    // When
    dispatchMessage(tab, 'null');
    result.current.postMessage(MESSAGE);

    // Then
    expect(onMessage).not.toHaveBeenCalled();
    expect(tabPostMessage).toHaveBeenCalledExactlyOnceWith(MESSAGE, TAB_ORIGIN);
  });

  it('should ignore the message when it comes from another window with the opened url origin', () => {
    // Given
    const onMessage = vi.fn();
    const otherWindow = createWindow();
    renderExternalTab(TAB_URL, onMessage);

    // When
    dispatchMessage(otherWindow, TAB_ORIGIN);

    // Then
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('should answer the origin of the tab when the opened url has no valid origin', () => {
    // Given
    const onMessage = vi.fn();
    const tabPostMessage = vi
      .spyOn(tab, 'postMessage')
      .mockImplementation(() => undefined);
    const { result } = renderExternalTab('/dashboard/xtm-hub', onMessage);

    // When
    dispatchMessage(tab, TAB_ORIGIN);
    result.current.postMessage(MESSAGE);

    // Then
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(tabPostMessage).toHaveBeenCalledExactlyOnceWith(MESSAGE, TAB_ORIGIN);
  });

  it('should keep the same postMessage between renders', () => {
    // Given
    const { result, rerender } = renderExternalTab(TAB_URL);
    const firstPostMessage = result.current.postMessage;

    // When
    rerender({ onMessage: vi.fn() });

    // Then
    expect(result.current.postMessage).toBe(firstPostMessage);
  });

  it('should call the latest onMessage without subscribing the listener again', () => {
    // Given
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const firstOnMessage = vi.fn();
    const latestOnMessage = vi.fn();
    const { rerender } = renderExternalTab(TAB_URL, firstOnMessage);
    const subscriptionCount = addEventListener.mock.calls.filter(
      ([type]) => type === 'message'
    ).length;

    // When
    rerender({ onMessage: latestOnMessage });
    dispatchMessage(tab, TAB_ORIGIN);

    // Then
    expect(
      addEventListener.mock.calls.filter(([type]) => type === 'message')
    ).toHaveLength(subscriptionCount);
    expect(firstOnMessage).not.toHaveBeenCalled();
    expect(latestOnMessage).toHaveBeenCalledTimes(1);
  });

  it('should call the latest onClosingTab without subscribing the listener again', () => {
    // Given
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const firstOnClosingTab = vi.fn();
    const latestOnClosingTab = vi.fn();
    const onMessage = vi.fn();
    const { rerender } = renderExternalTab(
      TAB_URL,
      onMessage,
      firstOnClosingTab
    );
    const subscriptionCount = addEventListener.mock.calls.filter(
      ([type]) => type === 'message'
    ).length;

    // When
    rerender({ onMessage, onClosingTab: latestOnClosingTab });
    Object.defineProperty(tab, 'closed', { value: true, configurable: true });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Then
    expect(
      addEventListener.mock.calls.filter(([type]) => type === 'message')
    ).toHaveLength(subscriptionCount);
    expect(firstOnClosingTab).not.toHaveBeenCalled();
    expect(latestOnClosingTab).toHaveBeenCalledTimes(1);
  });

  it('should neither watch nor message the tab when the browser blocks it', () => {
    // Given
    vi.mocked(window.open).mockReturnValue(null);
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const tabPostMessage = vi.spyOn(tab, 'postMessage');
    const { result } = renderExternalTab(TAB_URL);

    // When
    result.current.postMessage(MESSAGE);

    // Then
    expect(result.current.isTabOpen).toBe(false);
    expect(
      addEventListener.mock.calls.filter(([type]) => type === 'message')
    ).toHaveLength(0);
    expect(tabPostMessage).not.toHaveBeenCalled();
  });

  it('should stop watching the tab once unmounted', () => {
    // Given
    const onClosingTab = vi.fn();
    const { unmount } = renderExternalTab(TAB_URL, vi.fn(), onClosingTab);
    unmount();

    // When
    Object.defineProperty(tab, 'closed', { value: true, configurable: true });
    vi.advanceTimersByTime(1000);

    // Then
    expect(onClosingTab).not.toHaveBeenCalled();
  });

  it('should call onClosingTab once when the opened tab is closed', () => {
    // Given
    const onClosingTab = vi.fn();
    renderExternalTab(TAB_URL, vi.fn(), onClosingTab);

    // When
    Object.defineProperty(tab, 'closed', { value: true, configurable: true });
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Then
    expect(onClosingTab).toHaveBeenCalledTimes(1);
  });
});
