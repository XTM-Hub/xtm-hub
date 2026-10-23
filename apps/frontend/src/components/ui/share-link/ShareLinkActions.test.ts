import { updateShareNumber } from '@/components/ui/share-link/ShareLinkActions';
import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { IncrementShareNumberDocumentDocument } from '@graphql/generated';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/graphql-client', () => ({
  getAuthenticatedGraphqlClient: vi.fn(),
}));

const DOCUMENT_ID = 'document-1';
const REDIRECT_SENTINEL = new Error('NEXT_REDIRECT');

const request = vi.fn();

describe('updateShareNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    request.mockResolvedValue({
      incrementShareNumberDocument: { share_number: 1 },
    });
    vi.mocked(getAuthenticatedGraphqlClient).mockResolvedValue({
      request,
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedGraphqlClient>>);
    // Next.js' redirect never returns: it throws to interrupt the action.
    vi.mocked(redirect).mockImplementation(() => {
      throw REDIRECT_SENTINEL;
    });
  });

  it('should increment the share counter of the given document', async () => {
    // Given
    const variables = { documentId: DOCUMENT_ID };

    // When
    await updateShareNumber({ variables });

    // Then
    expect(request).toHaveBeenCalledWith(
      IncrementShareNumberDocumentDocument,
      variables
    );
  });

  it('should redirect to the signup page when the session is unauthenticated', async () => {
    // Given
    request.mockRejectedValue(new UnauthenticatedError());

    // When
    const updated = updateShareNumber({
      variables: { documentId: DOCUMENT_ID },
    });

    // Then
    await expect(updated).rejects.toBe(REDIRECT_SENTINEL);
    expect(redirect).toHaveBeenCalledWith('/sign-up');
  });
});
