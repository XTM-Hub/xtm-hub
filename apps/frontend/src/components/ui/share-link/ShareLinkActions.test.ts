import { updateShareNumber } from '@/components/ui/share-link/ShareLinkActions';
import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { IncrementShareNumberDocumentDocument } from '@graphql/generated';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/graphql-client', () => ({
  getAuthenticatedGraphqlClient: vi.fn(),
}));

const DOCUMENT_ID = 'document-1';

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
});
