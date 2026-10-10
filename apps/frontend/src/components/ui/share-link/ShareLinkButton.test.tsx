import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import testRender from '@/utils/test/test-render';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCommitMutation,
  mockUpdateShareNumber,
  mockUsePublicPath,
  showSnackbarMock,
  copyOverride,
} = vi.hoisted(() => ({
  mockCommitMutation: vi.fn(),
  mockUpdateShareNumber: vi.fn(),
  mockUsePublicPath: vi.fn(),
  showSnackbarMock: vi.fn(),
  copyOverride: {
    current: undefined as undefined | ((text: string) => Promise<boolean>),
  },
}));

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  useMutation: () => [mockCommitMutation, false],
}));
vi.mock('@/components/ui/share-link/ShareLinkActions', () => ({
  updateShareNumber: mockUpdateShareNumber,
}));
vi.mock('@/hooks/use-public-path', () => ({
  default: mockUsePublicPath,
}));
vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));
// The real copy resolves false instead of rejecting, so a test needing a
// rejected copy swaps it in.
vi.mock('usehooks-ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('usehooks-ts')>();
  return {
    ...actual,
    useCopyToClipboard: () => {
      const [copiedText, copy] = actual.useCopyToClipboard();
      return [copiedText, copyOverride.current ?? copy];
    },
  };
});

const SHAREABLE_URL = 'https://hub.test/share';
const DOCUMENT_ID = 'document-1';
const COPY_ERROR_MESSAGE = 'Clipboard denied';

describe('ShareLinkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    copyOverride.current = undefined;
  });

  it.each`
    isPublicPath | documentId     | expectedClientCalls | expectedServerCalls
    ${false}     | ${DOCUMENT_ID} | ${1}                | ${0}
    ${false}     | ${undefined}   | ${0}                | ${0}
    ${true}      | ${DOCUMENT_ID} | ${0}                | ${1}
    ${true}      | ${undefined}   | ${0}                | ${0}
  `(
    'increments the share counter only when a document id is given (isPublicPath=$isPublicPath, documentId=$documentId)',
    async ({
      isPublicPath,
      documentId,
      expectedClientCalls,
      expectedServerCalls,
    }) => {
      // Given
      mockUsePublicPath.mockReturnValue(isPublicPath);
      const { user, container } = testRender(
        <ShareLinkButton
          url={SHAREABLE_URL}
          documentId={documentId}
        />
      );
      // userEvent.setup() installs its own clipboard stub, so read it after render
      const copied = vi.spyOn(navigator.clipboard, 'writeText');

      // When
      await user.click(container.querySelector('button')!);

      // Then
      await waitFor(() => expect(copied).toHaveBeenCalledWith(SHAREABLE_URL));
      await waitFor(() =>
        expect(mockCommitMutation).toHaveBeenCalledTimes(expectedClientCalls)
      );
      expect(mockUpdateShareNumber).toHaveBeenCalledTimes(expectedServerCalls);
      await waitFor(() =>
        expect(showSnackbarMock).toHaveBeenCalledWith({
          severity: 'success',
          title: 'Service.ShareableResources.Copied',
        })
      );
    }
  );

  it('should raise an error message when the copy is rejected', async () => {
    // Given
    mockUsePublicPath.mockReturnValue(false);
    copyOverride.current = vi
      .fn()
      .mockRejectedValue(new Error(COPY_ERROR_MESSAGE));
    const { user, container } = testRender(
      <ShareLinkButton
        url={SHAREABLE_URL}
        documentId={DOCUMENT_ID}
      />
    );

    // When
    await user.click(container.querySelector('button')!);

    // Then
    await waitFor(() =>
      expect(showSnackbarMock).toHaveBeenCalledWith({
        severity: 'error',
        title: 'Utils.FailedToCopy',
        description: COPY_ERROR_MESSAGE,
      })
    );
    expect(mockCommitMutation).not.toHaveBeenCalled();
  });
});
