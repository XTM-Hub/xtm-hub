import { Portal, PortalContext } from '@/components/me/AppPortalContext';
import MeContext from '@/components/me/MeContext';
import testRender from '@/utils/test/test-render';
import type { MeQuery } from '@graphql/generated';
import { meKeys } from '@graphql/me/me.keys';
import { mockUser } from '@graphql/mocks';
import {
  defaultScheduler,
  dehydrate,
  hydrate,
  notifyManager,
  QueryClient,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { act, screen, waitFor } from '@testing-library/react';
import { Component, type ReactNode, useContext } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const FIRST_NAME = 'Ada';
const ERROR_FALLBACK = 'Error boundary reached';

const mocks = vi.hoisted(() => ({
  fetchMe: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useMeQuery: (
      _client: unknown,
      _variables: unknown,
      options: UseQueryOptions<MeQuery>
    ) => useQuery({ ...options, queryFn: mocks.fetchMe }),
  });
});

const PortalFirstName = () => {
  const { me } = useContext(PortalContext);
  return <p>{me?.first_name}</p>;
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

const renderWithMe = (queryClient?: QueryClient) =>
  testRender(
    <TestErrorBoundary>
      <MeContext>
        <PortalFirstName />
      </MeContext>
    </TestErrorBoundary>,
    { queryClient }
  );

const meResponse = (): MeQuery => ({
  me: mockUser({ first_name: FIRST_NAME }),
});

describe('MeContext', () => {
  afterEach(() => {
    mocks.fetchMe.mockReset();
    notifyManager.setScheduler(defaultScheduler);
  });

  it('should give the user to its children when the user is loaded', async () => {
    // Given
    mocks.fetchMe.mockResolvedValue(meResponse());

    // When
    renderWithMe();

    // Then
    expect(await screen.findByText(FIRST_NAME)).toBeInTheDocument();
  });

  it('should keep the loaded user when a background refetch fails', async () => {
    // Given
    const queryClient = createQueryClient();
    mocks.fetchMe.mockResolvedValueOnce(meResponse());
    renderWithMe(queryClient);
    await screen.findByText(FIRST_NAME);
    mocks.fetchMe.mockRejectedValueOnce(new Error('User unavailable'));

    // When
    await act(() => queryClient.refetchQueries());

    // Then
    await waitFor(() =>
      expect(queryClient.getQueryState(meKeys.detail())?.status).toBe('error')
    );
    expect(screen.getByText(FIRST_NAME)).toBeInTheDocument();
    expect(screen.queryByText(ERROR_FALLBACK)).not.toBeInTheDocument();
  });

  it.each([
    [
      'the window regains focus',
      (client: QueryClient) => client.getQueryCache().onFocus(),
    ],
    [
      'the network comes back',
      (client: QueryClient) => client.getQueryCache().onOnline(),
    ],
  ])('should not load the user again when %s', async (_event, triggerEvent) => {
    // Given
    const queryClient = createQueryClient();
    mocks.fetchMe.mockResolvedValue(meResponse());
    renderWithMe(queryClient);
    await screen.findByText(FIRST_NAME);

    // When
    act(() => triggerEvent(queryClient));

    // Then
    expect(queryClient.isFetching()).toBe(0);
  });

  it('should keep the same user when the layout renders again with the same user', async () => {
    // Given
    const queryClient = createQueryClient();
    const renderedUsers: Portal['me'][] = [];
    const RenderedUser = () => {
      renderedUsers.push(useContext(PortalContext).me);
      return null;
    };
    mocks.fetchMe.mockResolvedValue(meResponse());
    const { rerender } = testRender(
      <MeContext>
        <RenderedUser />
      </MeContext>,
      { queryClient }
    );
    await waitFor(() => expect(renderedUsers.at(-1)).toBeTruthy());
    const loadedUser = renderedUsers.at(-1);
    const renderCount = renderedUsers.length;
    // Re-render the consumers as soon as the cache changes.
    notifyManager.setScheduler((callback) => callback());
    const serverQueryClient = createQueryClient();
    serverQueryClient.setQueryData(meKeys.detail(), meResponse(), {
      updatedAt: Date.now() + 1,
    });

    // When
    act(() => hydrate(queryClient, dehydrate(serverQueryClient)));
    rerender(
      <MeContext>
        <RenderedUser />
      </MeContext>
    );

    // Then
    expect(queryClient.getQueryData(meKeys.detail())).toBe(
      serverQueryClient.getQueryData(meKeys.detail())
    );
    expect(renderedUsers.length).toBeGreaterThan(renderCount);
    expect(renderedUsers.at(-1)).toBe(loadedUser);
  });
});
