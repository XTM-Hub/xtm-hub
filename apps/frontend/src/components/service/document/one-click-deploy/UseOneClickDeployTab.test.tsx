import { useOneClickDeployTab } from '@/components/service/document/one-click-deploy/UseOneClickDeployTab';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { testRenderHook } from '@/utils/test/test-render';
import { DocumentItemFragment } from '@graphql/generated';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const TOKEN = 'refreshed-token';

const mocks = vi.hoisted(() => ({
  refreshUserPlatformToken: vi.fn(),
  postMessage: vi.fn(),
  showSnackbar: vi.fn(),
  onMessage: undefined as ((event: MessageEvent) => void) | undefined,
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useRefreshUserPlatformTokenMutation: () => ({
      mutate: mocks.refreshUserPlatformToken,
    }),
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

describe('useOneClickDeployTab', () => {
  beforeEach(() => {
    mocks.refreshUserPlatformToken.mockReset();
    mocks.postMessage.mockReset();
    mocks.showSnackbar.mockReset();
  });

  it('should send a fresh token to the platform when it asks for one', () => {
    // Given
    mocks.refreshUserPlatformToken.mockImplementation((_variables, options) =>
      options.onSuccess({ refreshUserPlatformToken: { token: TOKEN } })
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

  it('should show the server error when the token cannot be refreshed', () => {
    // Given
    mocks.refreshUserPlatformToken.mockImplementation((_variables, options) =>
      options.onError(new Error('UNKNOWN_ERROR'))
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
