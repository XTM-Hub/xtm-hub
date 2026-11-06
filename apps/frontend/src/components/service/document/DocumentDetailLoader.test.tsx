import DocumentDetailLoader from '@/components/service/document/DocumentDetailLoader';
import testRender from '@/utils/test/test-render';
import { DocumentItemFragment } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const DOCUMENT_ID = 'document-1';
const SERVICE_INSTANCE_ID = 'service-instance-1';

const mocks = vi.hoisted(() => ({
  useDocumentDetailQuery: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useDocumentDetailQuery: mocks.useDocumentDetailQuery,
}));

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

vi.mock('@/components/Loader', () => ({
  default: () => <div data-testid="loader" />,
}));

const renderLoader = () =>
  testRender(
    <DocumentDetailLoader
      documentId={DOCUMENT_ID}
      serviceInstanceId={SERVICE_INSTANCE_ID}>
      {(document) => <div data-testid="detail">{document.name}</div>}
    </DocumentDetailLoader>
  );

describe('DocumentDetailLoader', () => {
  beforeEach(() => {
    mocks.useDocumentDetailQuery.mockReset();
    mocks.refetch.mockReset();
  });

  it('should query the document of the service instance', () => {
    // Given
    mocks.useDocumentDetailQuery.mockReturnValue({ data: undefined });

    // When
    renderLoader();

    // Then
    expect(mocks.useDocumentDetailQuery).toHaveBeenCalledWith(
      expect.anything(),
      { documentId: DOCUMENT_ID, serviceInstanceId: SERVICE_INSTANCE_ID }
    );
  });

  it('should show the loader while the document is loading', () => {
    // Given
    mocks.useDocumentDetailQuery.mockReturnValue({ data: undefined });

    // When
    renderLoader();

    // Then
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.queryByTestId('detail')).not.toBeInTheDocument();
  });

  it('should hand the loaded document to its children', () => {
    // Given
    mocks.useDocumentDetailQuery.mockReturnValue({
      data: { document: { id: DOCUMENT_ID, name: 'My document' } },
    });

    // When
    renderLoader();

    // Then
    expect(screen.getByTestId('detail')).toHaveTextContent('My document');
  });

  it('should tell the document was not found when the API returns none', () => {
    // Given
    mocks.useDocumentDetailQuery.mockReturnValue({ data: { document: null } });

    // When
    renderLoader();

    // Then
    expect(screen.getByRole('heading')).toHaveTextContent(
      'Utils.DocumentNotFound'
    );
    expect(screen.queryByTestId('detail')).not.toBeInTheDocument();
  });

  it('should show an error with a retry when the document cannot be loaded', async () => {
    // Given
    mocks.useDocumentDetailQuery.mockReturnValue({
      data: undefined,
      isError: true,
      refetch: mocks.refetch,
    });
    const { user } = renderLoader();

    // When
    await user.click(
      screen.getByRole('button', { name: 'Service.List.Retry' })
    );

    // Then
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it('should keep the document on screen when a background refetch fails', () => {
    // Given
    const document = {
      id: DOCUMENT_ID,
      name: 'My document',
    } as DocumentItemFragment;
    mocks.useDocumentDetailQuery.mockReturnValue({
      data: { document },
      isError: true,
    });

    // When
    renderLoader();

    // Then
    expect(screen.getByTestId('detail')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
