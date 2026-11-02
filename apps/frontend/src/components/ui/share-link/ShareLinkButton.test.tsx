import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  IncrementShareNumberDocumentMutation,
  IncrementShareNumberDocumentMutationVariables,
} from '@graphql/generated';
import { mockDefaultDocument } from '@graphql/mocks';
import { waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { showSnackbarMock, copyOverride } = vi.hoisted(() => ({
  showSnackbarMock: vi.fn(),
  copyOverride: {
    current: undefined as undefined | ((text: string) => Promise<boolean>),
  },
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
const GQL_OPERATION_INCREMENT_SHARE_NUMBER = 'IncrementShareNumberDocument';

const mockIncrementShareNumber = (
  respond: () => Response = () =>
    HttpResponse.json<{ data: IncrementShareNumberDocumentMutation }>({
      data: {
        incrementShareNumberDocument: mockDefaultDocument({ share_number: 1 }),
      },
    })
) => {
  const capturedVariables: IncrementShareNumberDocumentMutationVariables[] = [];
  mswServer.use(
    graphql.mutation(GQL_OPERATION_INCREMENT_SHARE_NUMBER, ({ variables }) => {
      capturedVariables.push(
        variables as IncrementShareNumberDocumentMutationVariables
      );
      return respond();
    })
  );
  return capturedVariables;
};

describe('ShareLinkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    copyOverride.current = undefined;
  });

  it.each`
    documentId     | expectedCalls
    ${DOCUMENT_ID} | ${1}
    ${undefined}   | ${0}
  `(
    'increments the share counter only when a document id is given (documentId=$documentId)',
    async ({ documentId, expectedCalls }) => {
      // Given
      const capturedVariables = mockIncrementShareNumber();
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
        expect(showSnackbarMock).toHaveBeenCalledWith({
          severity: 'success',
          title: 'Service.ShareableResources.Copied',
        })
      );
      await waitFor(() =>
        expect(capturedVariables).toHaveLength(expectedCalls)
      );
      if (expectedCalls > 0) {
        expect(capturedVariables[0]).toEqual({ documentId: DOCUMENT_ID });
      }
    }
  );

  it('should notify the share once the counter is incremented', async () => {
    // Given
    mockIncrementShareNumber();
    const onShare = vi.fn();
    const { user, container } = testRender(
      <ShareLinkButton
        url={SHAREABLE_URL}
        documentId={DOCUMENT_ID}
        onShare={onShare}
      />
    );

    // When
    await user.click(container.querySelector('button')!);

    // Then
    await waitFor(() => expect(onShare).toHaveBeenCalledTimes(1));
  });

  it('should stay silent and not notify the share when the counter increment fails', async () => {
    // Given
    const capturedVariables = mockIncrementShareNumber(() =>
      HttpResponse.json({ errors: [{ message: 'NOT_FOUND' }] })
    );
    const onShare = vi.fn();
    const { user, container } = testRender(
      <ShareLinkButton
        url={SHAREABLE_URL}
        documentId={DOCUMENT_ID}
        onShare={onShare}
      />
    );

    // When
    await user.click(container.querySelector('button')!);

    // Then
    await waitFor(() => expect(capturedVariables).toHaveLength(1));
    await waitFor(() =>
      expect(showSnackbarMock).toHaveBeenCalledWith({
        severity: 'success',
        title: 'Service.ShareableResources.Copied',
      })
    );
    expect(showSnackbarMock).toHaveBeenCalledTimes(1);
    expect(onShare).not.toHaveBeenCalled();
  });

  it('should raise an error message when the copy is rejected', async () => {
    // Given
    const capturedVariables = mockIncrementShareNumber();
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
    expect(capturedVariables).toHaveLength(0);
  });
});
