import { mswServer } from '@/utils/test/msw/server';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest';

import {
  getClientEnvironment,
  registerClientEnvironment,
} from '@/relay/environment/registry';

import '@testing-library/jest-dom';

import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';

vi.mock('@/components/error-frontend-log.graphql', () => ({
  logFrontendError: vi.fn(),
}));

vi.mock('@/hooks/use-registered-platforms', () => ({
  useRegisteredPlatforms: vi.fn(),
}));

vi.mock('@/hooks/use-is-feature-enabled', () => ({
  useIsFeatureEnabled: vi.fn(),
}));

vi.mock('next/image', async () => {
  const React = await import('react');
  return {
    __esModule: true,
    default: ({ src, alt }: { src: string; alt: string }) =>
      React.createElement('img', { src, alt }),
  };
});

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// cookies() throws outside a real Next.js request scope: default to an empty
// jar, so server-side edit mode is off in tests, like the client default.
vi.mock('next/headers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/headers')>()),
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

vi.mock('next-intl', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next-intl')>()),
  useTranslations: vi.fn(() =>
    Object.assign((key: string) => key, {
      has: () => false,
      rich: (key: string) => key,
    })
  ),
  useLocale: vi.fn(() => 'en'),
}));

const relayRegistryMocks = vi.hoisted(() => ({
  getClientEnvironment: vi.fn(),
  registerClientEnvironment: vi.fn(),
}));

vi.mock('@/relay/environment/registry', () => relayRegistryMocks);

let mockedClientEnvironment: ReturnType<typeof getClientEnvironment> = null;
type RegisterClientEnvironment = Parameters<
  typeof registerClientEnvironment
>[0];

const setDefaultGlobalMocks = () => {
  vi.mocked(useRegisteredPlatforms).mockReturnValue({ platforms: [] });
  vi.mocked(useIsFeatureEnabled).mockReturnValue(false);
  vi.mocked(usePathname).mockReturnValue('/mock');
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  });
  vi.mocked(useParams).mockReturnValue({});
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
  );
  vi.mocked(registerClientEnvironment).mockImplementation(
    (environment: RegisterClientEnvironment) => {
      mockedClientEnvironment = environment;
    }
  );
  vi.mocked(getClientEnvironment).mockImplementation(
    () => mockedClientEnvironment
  );
  registerClientEnvironment(null);
};

setDefaultGlobalMocks();

// relay-test-utils expects a global jest object internally.
// @ts-expect-error
global.jest = vi;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});

// jsdom does not implement the Pointer Capture API, which Radix UI's Select
// relies on when handling item selection. Without these, clicking a
// SelectItem throws "target.hasPointerCapture is not a function".
Object.defineProperty(window.HTMLElement.prototype, 'hasPointerCapture', {
  writable: true,
  value: vi.fn(() => false),
});
Object.defineProperty(window.HTMLElement.prototype, 'setPointerCapture', {
  writable: true,
  value: vi.fn(),
});
Object.defineProperty(window.HTMLElement.prototype, 'releasePointerCapture', {
  writable: true,
  value: vi.fn(),
});

expect.extend(matchers);

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  vi.resetAllMocks();
  setDefaultGlobalMocks();
  cleanup();
  mswServer.resetHandlers();
});

afterAll(() => {
  mswServer.close();
});
