import { CookieConsentBanner } from '@/components/cookie-consent/CookieConsentBanner';
import { CookieConsentProvider } from '@/components/cookie-consent/CookieConsentProvider';
import { COPILOT_SCRIPT_ID } from '@/components/external/Copilot';
import testRender from '@/utils/test/test-render';
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BANNER_HEIGHT_VAR = '--cookie-banner-height';
const BANNER_HEIGHT = 145;
const RESIZED_BANNER_HEIGHT = 212;
const COPILOT_OFFSET = '130px';
const COPILOT_POLL_MS = 300;

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];
  readonly targets = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {
    ResizeObserverMock.instances.push(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.targets.clear();
  }

  notify() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

const readBannerHeightVar = () =>
  document.documentElement.style.getPropertyValue(BANNER_HEIGHT_VAR);

const renderBanner = () =>
  testRender(
    <CookieConsentProvider initialConsent={null}>
      <CookieConsentBanner />
    </CookieConsentProvider>
  );

// jsdom has no layout: the banner reports the height a browser would measure, then the observer fires.
const resizeBanner = (height: number) => {
  const banner = screen.getByRole('region');
  Object.defineProperty(banner, 'offsetHeight', {
    configurable: true,
    value: height,
  });
  act(() => {
    ResizeObserverMock.instances
      .filter((observer) => observer.targets.has(banner))
      .forEach((observer) => observer.notify());
  });
};

const loadCopilot = (polls: number) => {
  const host = document.createElement('div');
  host.id = COPILOT_SCRIPT_ID;
  host.attachShadow({ mode: 'open' });
  document.body.appendChild(host);
  act(() => {
    vi.advanceTimersByTime(polls * COPILOT_POLL_MS);
  });
};

const readCopilotStyles = () =>
  Array.from(
    document
      .getElementById(COPILOT_SCRIPT_ID)
      ?.shadowRoot?.querySelectorAll('style') ?? [],
    (style) => style.textContent
  );

describe('CookieConsentBanner', () => {
  const globalResizeObserver = globalThis.ResizeObserver;

  // The global stub is writable but not configurable, so vi.stubGlobal cannot redefine it.
  beforeEach(() => {
    ResizeObserverMock.instances = [];
    globalThis.ResizeObserver = ResizeObserverMock;
  });

  afterEach(() => {
    globalThis.ResizeObserver = globalResizeObserver;
    document.documentElement.style.removeProperty(BANNER_HEIGHT_VAR);
    document.cookie.split('; ').forEach((entry) => {
      document.cookie = `${entry.split('=')[0]}=; path=/; max-age=0`;
    });
    vi.useRealTimers();
    document.getElementById(COPILOT_SCRIPT_ID)?.remove();
  });

  it('should publish the banner height on the document root when the banner shows', () => {
    // Given
    renderBanner();

    // When
    resizeBanner(BANNER_HEIGHT);

    // Then
    expect(readBannerHeightVar()).toBe(`${BANNER_HEIGHT}px`);
  });

  it('should follow the banner height when the banner is resized', () => {
    // Given
    renderBanner();
    resizeBanner(BANNER_HEIGHT);

    // When
    resizeBanner(RESIZED_BANNER_HEIGHT);

    // Then
    expect(readBannerHeightVar()).toBe(`${RESIZED_BANNER_HEIGHT}px`);
  });

  it('should remove the banner height when the visitor answers', async () => {
    // Given
    const { user } = renderBanner();
    resizeBanner(BANNER_HEIGHT);

    // When
    await user.click(screen.getByRole('button', { name: 'AcceptAll' }));

    // Then
    expect(readBannerHeightVar()).toBe('');
  });

  it('should remove the banner height when the banner unmounts', () => {
    // Given
    const { unmount } = renderBanner();
    resizeBanner(BANNER_HEIGHT);

    // When
    unmount();

    // Then
    expect(readBannerHeightVar()).toBe('');
  });

  it('should lift the Copilot button once when Copilot loads after the banner', () => {
    // Given
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    renderBanner();

    // When
    loadCopilot(2);

    // Then
    expect(readCopilotStyles()).toEqual([
      expect.stringContaining(`bottom: ${COPILOT_OFFSET}`),
    ]);
  });

  it('should put the Copilot button back when the visitor answers', async () => {
    // Given
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { user } = renderBanner();
    loadCopilot(1);

    // When
    await user.click(screen.getByRole('button', { name: 'AcceptAll' }));

    // Then
    expect(readCopilotStyles()).toEqual([]);
  });
});
