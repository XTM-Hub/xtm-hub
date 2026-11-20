import { useOneClickDeployTab } from '@/components/service/document/one-click-deploy/UseOneClickDeployTab';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { testRenderHook } from '@/utils/test/test-render';
import { DocumentItemFragment } from '@graphql/generated';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const TOKEN = 'refreshed-token';

type RefreshResponse = { refreshUserPlatformToken: { token: string } };
type RefreshCallOptions = {
  onSuccess?: (data: RefreshResponse) => void;
  onError?: (error: Error) => void;
};

const refreshResponse = (token: string): RefreshResponse => ({
  refreshUserPlatformToken: { token },
});

const mocks = vi.hoisted(() => ({
  refreshUserPlatformToken: vi.fn(),
  hookOptions: undefined as
    { onSuccess?: (data: RefreshResponse) => void } | undefined,
  postMessage: vi.fn(),
  showSnackbar: vi.fn(),
  onMessage: undefined as ((event: MessageEvent) => void) | undefined,
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useRefreshUserPlatformTokenMutation: (
      _client: unknown,
      options?: { onSuccess?: (data: RefreshResponse) => void }
    ) => {
      mocks.hookOptions = options;
      return { mutate: mocks.refreshUserPlatformToken };
    },
  });
});

vi.mock('@/hooks/use-external-tab', () => ({
  default: ({ onMessage }: { onMessage: (event: MessageEvent) => void }) => {
    mocks.onMessage = onMessage;
    return { openTab: vi.fn(), postMessage: mocks.postMessage };
  },
}));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: mocks.showSnackbar,
}));

const DOCUMENT_DATA = {
  id: 'doc-1',
  type: ShareableResourceType.OPENCTI_PLAYBOOK,
  service_instance: { id: 'service-instance-1' },
} as unknown as DocumentItemFragment;

const sendMessageFromPlatform = (action: string) =>
  mocks.onMessage?.({ data: { action } } as MessageEvent);

const renderTabHook = () =>
  testRenderHook(() =>
    useOneClickDeployTab({
      platformBasePath: 'https://opencti.acme.com',
      documentData: DOCUMENT_DATA,
    })
  );

// Like react-query: the hook-level callback runs for every call, the per-call one only for the latest call of a
// mounted component.
const settleRefresh = (
  call: RefreshCallOptions | undefined,
  outcome: { token: string } | { error: Error },
  { isLatestMountedCall }: { isLatestMountedCall: boolean }
) => {
  if ('token' in outcome) {
    mocks.hookOptions?.onSuccess?.(refreshResponse(outcome.token));
    if (isLatestMountedCall) call?.onSuccess?.(refreshResponse(outcome.token));
    return;
  }
  if (isLatestMountedCall) call?.onError?.(outcome.error);
};

describe('useOneClickDeployTab', () => {
  beforeEach(() => {
    mocks.refreshUserPlatformToken.mockReset();
    mocks.postMessage.mockReset();
    mocks.showSnackbar.mockReset();
  });

  it('should send a fresh token to the platform when it asks for one', () => {
    // Given
    mocks.refreshUserPlatformToken.mockImplementation(
      (_variables, options: RefreshCallOptions) =>
        settleRefresh(options, { token: TOKEN }, { isLatestMountedCall: true })
    );
    testRenderHook(() =>
      useOneClickDeployTab({
        platformBasePath: 'https://opencti.acme.com',
        documentData: DOCUMENT_DATA,
      })
    );

    // When
    sendMessageFromPlatform('refresh-token');

    // Then
    expect(mocks.refreshUserPlatformToken).toHaveBeenCalledOnce();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      action: 'set-token',
      token: TOKEN,
    });
  });

  it('should send every rotated token when a later overlapping refresh fails', () => {
    // Given two refreshes in flight
    const calls: RefreshCallOptions[] = [];
    mocks.refreshUserPlatformToken.mockImplementation(
      (_variables, options: RefreshCallOptions) => calls.push(options)
    );
    renderTabHook();
    sendMessageFromPlatform('refresh-token');
    sendMessageFromPlatform('refresh-token');

    // When the first one succeeds and the second one fails
    settleRefresh(calls[0], { token: TOKEN }, { isLatestMountedCall: false });
    settleRefresh(
      calls[1],
      { error: new Error('UNKNOWN_ERROR') },
      { isLatestMountedCall: true }
    );

    // Then
    expect(mocks.postMessage).toHaveBeenCalledExactlyOnceWith({
      action: 'set-token',
      token: TOKEN,
    });
    expect(mocks.showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', title: 'Utils.Error' })
    );
  });

  it('should send the rotated token when the refresh succeeds after the page unmounts', () => {
    // Given a refresh in flight
    const calls: RefreshCallOptions[] = [];
    mocks.refreshUserPlatformToken.mockImplementation(
      (_variables, options: RefreshCallOptions) => calls.push(options)
    );
    const { unmount } = renderTabHook();
    sendMessageFromPlatform('refresh-token');

    // When
    unmount();
    settleRefresh(calls[0], { token: TOKEN }, { isLatestMountedCall: false });

    // Then
    expect(mocks.postMessage).toHaveBeenCalledExactlyOnceWith({
      action: 'set-token',
      token: TOKEN,
    });
  });

  it('should show the server error when the token cannot be refreshed', () => {
    // Given
    mocks.refreshUserPlatformToken.mockImplementation(
      (_variables, options: RefreshCallOptions) =>
        settleRefresh(
          options,
          { error: new Error('UNKNOWN_ERROR') },
          { isLatestMountedCall: true }
        )
    );
    testRenderHook(() =>
      useOneClickDeployTab({
        platformBasePath: 'https://opencti.acme.com',
        documentData: DOCUMENT_DATA,
      })
    );

    // When
    sendMessageFromPlatform('refresh-token');

    // Then
    expect(mocks.postMessage).not.toHaveBeenCalled();
    expect(mocks.showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', title: 'Utils.Error' })
    );
  });

  it('should ignore the other messages of the platform', () => {
    // Given
    testRenderHook(() =>
      useOneClickDeployTab({
        platformBasePath: 'https://opencti.acme.com',
        documentData: DOCUMENT_DATA,
      })
    );

    // When
    sendMessageFromPlatform('close');

    // Then
    expect(mocks.refreshUserPlatformToken).not.toHaveBeenCalled();
  });
});
