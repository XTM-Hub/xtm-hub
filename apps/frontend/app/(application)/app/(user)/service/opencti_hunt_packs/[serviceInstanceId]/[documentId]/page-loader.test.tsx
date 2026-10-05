import { portalGraphqlClient } from '@/lib/graphql-client';
import testRender from '@/utils/test/test-render';
import PageLoader from '@app/(application)/app/(user)/service/opencti_hunt_packs/[serviceInstanceId]/[documentId]/page-loader';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { useHuntPackDocumentQuery } from '@graphql/generated';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  name: 'OpenCTI Hunt Packs Library',
  service_definition: { identifier: 'opencti_hunt_packs' },
} as unknown as serviceInstance_fragment$data;

const expectLibraryLink = () =>
  expect(
    screen.getByRole('link', { name: 'OpenCTI Hunt Packs Library' })
  ).toHaveAttribute('href', '/app/service/opencti_hunt_packs/service-1');

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
    expectLibraryLink();
  });

  it('shows the not-found message when the API does not find the hunt pack', () => {
    mockQuery({
      data: undefined,
      error: new Error('DOCUMENT_NOT_FOUND'),
      isPending: false,
      isError: true,
    });

    renderLoader();

    expect(screen.getByText('Utils.DocumentNotFound')).toBeInTheDocument();
    expect(screen.queryByText('Error.AnErrorOccured')).not.toBeInTheDocument();
    expectLibraryLink();
  });

  it('says the hunt pack could not be loaded, with a way to try again', async () => {
    const refetch = vi.fn();
    mockQuery({
      data: undefined,
      error: new Error('Network request failed'),
      isPending: false,
      isError: true,
      isFetching: false,
      refetch,
    });

    renderLoader();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Error.SomethingWentWrong');
    expect(alert).toHaveTextContent(
      'Service.OpenCTIHuntPack.LoadError.Document'
    );
    expect(alert).not.toHaveTextContent('Error.AnErrorOccured');
    expect(screen.queryByTestId('hunt-pack-slug')).not.toBeInTheDocument();
    expectLibraryLink();

    await userEvent.click(
      screen.getByRole('button', { name: 'Error.TryAgain' })
    );
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('disables the try again button while the hunt pack is read again', () => {
    mockQuery({
      data: undefined,
      error: new Error('Network request failed'),
      isPending: false,
      isError: true,
      isFetching: true,
      refetch: vi.fn(),
    });

    renderLoader();

    expect(
      screen.getByRole('button', { name: 'Error.TryAgain' })
    ).toBeDisabled();
  });
});
