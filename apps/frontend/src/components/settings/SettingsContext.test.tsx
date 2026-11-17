import { SettingsContext as SettingsReactContext } from '@/components/settings/EnvPortalContext';
import SettingsContext from '@/components/settings/SettingsContext';
import testRender from '@/utils/test/test-render';
import type { SettingsQuery } from '@graphql/generated';
import { mockSettings } from '@graphql/mocks';
import { settingsKeys } from '@graphql/settings/settings.keys';
import {
  QueryClient,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { act, screen } from '@testing-library/react';
import { Component, type ReactNode, useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL_FRONT = 'https://hub.filigran.io';
const ERROR_FALLBACK = 'Error boundary reached';

const mocks = vi.hoisted(() => ({
  fetchSettings: vi.fn(),
}));

// The real react-query hook with the component's own options: only the fetch is mocked, so throwOnError really
// decides whether a failure reaches the error boundary.
const useSettingsQueryWithMockedFetch = (
  _client: unknown,
  _variables: unknown,
  options: UseQueryOptions<SettingsQuery>
) => useQuery({ ...options, queryFn: mocks.fetchSettings });

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useSettingsQuery: (
      ...args: Parameters<typeof useSettingsQueryWithMockedFetch>
    ) => useSettingsQueryWithMockedFetch(...args),
  });
});

const BaseUrlFront = () => {
  const { settings } = useContext(SettingsReactContext);
  return <p>{settings?.base_url_front}</p>;
};

class TestErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    const { hasError } = this.state;
    const { children } = this.props;
    return hasError ? <p>{ERROR_FALLBACK}</p> : children;
  }
}

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderWithSettings = (queryClient = createQueryClient()) =>
  testRender(
    <TestErrorBoundary>
      <SettingsContext>
        <BaseUrlFront />
      </SettingsContext>
    </TestErrorBoundary>,
    { queryClient }
  );

const settingsResponse = (): SettingsQuery => ({
  settings: mockSettings({ base_url_front: BASE_URL_FRONT }),
});

describe('SettingsContext', () => {
  beforeEach(() => {
    // React reports every error caught by a boundary on the console.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mocks.fetchSettings.mockReset();
  });

  it('should give the loaded settings to its children', async () => {
    // Given
    mocks.fetchSettings.mockResolvedValue(settingsResponse());

    // When
    renderWithSettings();

    // Then
    expect(await screen.findByText(BASE_URL_FRONT)).toBeInTheDocument();
  });

  it('should render nothing while the settings are loading', () => {
    // Given
    mocks.fetchSettings.mockReturnValue(new Promise(() => {}));

    // When
    const { container } = renderWithSettings();

    // Then
    expect(container).toBeEmptyDOMElement();
  });

  it('should send the error to the nearest error boundary when the first load fails', async () => {
    // Given
    mocks.fetchSettings.mockRejectedValue(new Error('Settings unavailable'));

    // When
    renderWithSettings();

    // Then
    expect(await screen.findByText(ERROR_FALLBACK)).toBeInTheDocument();
  });

  it('should keep the loaded settings when a background refetch fails', async () => {
    // Given
    const queryClient = createQueryClient();
    mocks.fetchSettings.mockResolvedValueOnce(settingsResponse());
    renderWithSettings(queryClient);
    await screen.findByText(BASE_URL_FRONT);
    mocks.fetchSettings.mockRejectedValueOnce(
      new Error('Settings unavailable')
    );

    // When
    await act(() => queryClient.refetchQueries());
    // react-query notifies its observers on a later tick: let the component re-render with the failed refetch.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    // Then
    expect(queryClient.getQueryState(settingsKeys.detail())?.status).toBe(
      'error'
    );
    expect(screen.getByText(BASE_URL_FRONT)).toBeInTheDocument();
    expect(screen.queryByText(ERROR_FALLBACK)).not.toBeInTheDocument();
  });
});
