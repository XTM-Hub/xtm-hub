import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import testRender from '@/utils/test/test-render';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCommitMutation, mockUpdateShareNumber, mockUsePublicPath } =
  vi.hoisted(() => ({
    mockCommitMutation: vi.fn(),
    mockUpdateShareNumber: vi.fn(),
    mockUsePublicPath: vi.fn(),
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

const SHAREABLE_URL = 'https://hub.test/share';
const DOCUMENT_ID = 'document-1';

describe('ShareLinkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    }
  );
});
