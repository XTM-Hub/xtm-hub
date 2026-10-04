import { portalGraphqlClient } from '@/lib/graphql-client';
import testRender from '@/utils/test/test-render';
import PageLoader from '@app/(application)/app/(user)/service/opencti_hunt_packs/[serviceInstanceId]/[documentId]/page-loader';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { useHuntPackDocumentQuery } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useHuntPackDocumentQuery: vi.fn(),
}));

vi.mock('@/components/Loader', () => ({
  default: () => <div data-testid="loader" />,
}));

vi.mock(
  '@/components/service/opencti-hunt-packs/[slug]/OpenctiHuntPackSlug',
  () => ({
    default: ({ documentData }: { documentData: { name: string } }) => (
      <div data-testid="hunt-pack-slug">{documentData.name}</div>
    ),
  })
);

const serviceInstance = {
  id: 'service-1',
} as unknown as serviceInstance_fragment$data;

const mockQuery = (result: Record<string, unknown>) =>
  vi
    .mocked(useHuntPackDocumentQuery)
    .mockReturnValue(
      result as unknown as ReturnType<typeof useHuntPackDocumentQuery>
    );

const renderLoader = () =>
  testRender(
    <PageLoader
      documentId="document-1"
      serviceInstance={serviceInstance}
    />
  );

describe('hunt pack page loader', () => {
  it('reads the hunt pack of the service instance with React Query', () => {
    mockQuery({
      data: { document: { id: 'document-1', name: 'Credential access' } },
      isPending: false,
      isError: false,
    });

    renderLoader();

    expect(useHuntPackDocumentQuery).toHaveBeenCalledWith(portalGraphqlClient, {
      documentId: 'document-1',
      serviceInstanceId: 'service-1',
    });
    expect(screen.getByTestId('hunt-pack-slug')).toHaveTextContent(
      'Credential access'
    );
  });

  it('shows the loader while the hunt pack loads', () => {
    mockQuery({ data: undefined, isPending: true, isError: false });

    renderLoader();

    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.queryByTestId('hunt-pack-slug')).not.toBeInTheDocument();
  });

  it('shows the not-found message when the hunt pack is null', () => {
    mockQuery({ data: { document: null }, isPending: false, isError: false });

    renderLoader();

    expect(screen.getByText('Utils.DocumentNotFound')).toBeInTheDocument();
    expect(screen.queryByTestId('hunt-pack-slug')).not.toBeInTheDocument();
  });

  it('shows an error message when the hunt pack cannot be read', () => {
    mockQuery({ data: undefined, isPending: false, isError: true });

    renderLoader();

    expect(screen.getByText('Error.AnErrorOccured')).toBeInTheDocument();
    expect(screen.queryByTestId('hunt-pack-slug')).not.toBeInTheDocument();
  });
});
