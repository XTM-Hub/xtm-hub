import { AppServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import { ServiceListLocalStorageKey } from '@/hooks/use-service-list-local-storage';
import testRender from '@/utils/test/test-render';
import { toast } from '@filigran/ui';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { screen, waitFor, within } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DocumentList from './DocumentList';
import { ServiceListDisplayMode } from './header/ServiceListHeader';

const ServiceIdentifier = 'opencti';
const ServiceInstanceId = 'service-instance-1';
const FirstDocumentId = 'doc-1';
const FirstDocumentSlug = 'first-document';
const FirstDocumentName = 'First document';
const FirstDocumentDescription = 'Description 1';
const SecondDocumentId = 'doc-2';
const SecondDocumentSlug = 'second-document';
const SecondDocumentName = 'Second document';
const SecondDocumentDescription = 'Description 2';
const ServiceSlug = 'my-service';
const TranslationKey = 'Service.Connector';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setIntegrationType: vi.fn(),
  handleDeleteSheet: vi.fn(),
  revalidatePathActions: vi.fn(),
}));

vi.mock('@/components/service/components/ServiceContext', () => ({
  useServiceContext: () => ({
    translationKey: TranslationKey,
    serviceInstance: {
      id: ServiceInstanceId,
      slug: ServiceSlug,
      service_definition: {
        identifier: ServiceIdentifier,
      },
      name: 'My service',
    },
    setIntegrationType: mocks.setIntegrationType,
  }),
}));

vi.mock('@/hooks/use-service-capability', () => ({
  default: () => true,
}));

vi.mock('@/components/service/document/use-document-context', () => ({
  useDocumentContext: () => ({
    handleDeleteSheet: mocks.handleDeleteSheet,
  }),
}));

vi.mock('@/utils/actions/revalidate-path.actions', () => ({
  default: mocks.revalidatePathActions,
}));

vi.mock('@/components/service/components/ServiceManageSheet', () => ({
  ServiceManageSheet: () => null,
}));

vi.mock('@filigran/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@filigran/ui')>()),
  toast: vi.fn(),
}));

describe('DocumentList', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: mocks.push,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });
    mocks.revalidatePathActions.mockResolvedValue(undefined);
    mocks.handleDeleteSheet.mockImplementation(
      (
        _document: documentItem_fragment$data,
        onDeleteCompleted: () => void
      ) => {
        onDeleteCompleted();
      }
    );
  });

  it('renders one service card per document with expected URLs', () => {
    // Given
    const documents = [
      {
        id: FirstDocumentId,
        slug: FirstDocumentSlug,
        name: FirstDocumentName,
        type: 'opencti_integration',
        short_description: FirstDocumentDescription,
        use_cases: [],
      },
      {
        id: SecondDocumentId,
        slug: SecondDocumentSlug,
        name: SecondDocumentName,
        type: 'opencti_integration',
        short_description: SecondDocumentDescription,
        use_cases: [],
      },
    ] as documentItem_fragment$data[];

    // When: Tab mode renders ShareableResourceCard, which reads the
    // selected product-version filter from ServiceListLocalStorageKeyContext.
    testRender(
      <AppServiceListLocalStorageKeyContext
        localStorageKey={ServiceListLocalStorageKey.OpenCTIIntegrationFeeds}>
        <DocumentList
          documents={documents}
          displayMode={ServiceListDisplayMode.Tab}
        />
      </AppServiceListLocalStorageKeyContext>
    );

    // Then
    expect(screen.getByText(FirstDocumentName)).toBeInTheDocument();
    expect(screen.getByText(SecondDocumentName)).toBeInTheDocument();

    const detailLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/app/service/'));

    expect(detailLinks).toHaveLength(2);
    expect(detailLinks[0]).toHaveAttribute(
      'href',
      `/app/service/${ServiceIdentifier}/${ServiceInstanceId}/${FirstDocumentId}`
    );
    expect(detailLinks[1]).toHaveAttribute(
      'href',
      `/app/service/${ServiceIdentifier}/${ServiceInstanceId}/${SecondDocumentId}`
    );
  });

  it('should navigate to detail page when clicking a row in list mode', async () => {
    // Given
    const documents = [
      {
        id: FirstDocumentId,
        slug: FirstDocumentSlug,
        name: FirstDocumentName,
        type: 'opencti_integration',
        short_description: FirstDocumentDescription,
        use_cases: [],
      },
    ] as documentItem_fragment$data[];
    const { user } = testRender(
      <DocumentList
        documents={documents}
        displayMode={ServiceListDisplayMode.List}
      />
    );

    // When
    await user.click(screen.getByText(FirstDocumentName).closest('tr')!);

    // Then
    expect(mocks.push).toHaveBeenCalledWith(
      `/app/service/${ServiceIdentifier}/${ServiceInstanceId}/${FirstDocumentId}`
    );
    expect(
      screen.queryByLabelText('Manage columns visibility')
    ).not.toBeInTheDocument();
  });

  it('should set integration type when clicking update on integration item', async () => {
    // Given
    const documents = [
      {
        id: FirstDocumentId,
        slug: FirstDocumentSlug,
        name: FirstDocumentName,
        type: 'opencti_integration',
        integration_type: IntegrationType.TaxiiFeed,
        short_description: FirstDocumentDescription,
        use_cases: [],
      },
    ] as documentItem_fragment$data[];
    const { user } = testRender(
      <DocumentList
        documents={documents}
        displayMode={ServiceListDisplayMode.List}
      />
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.OpenMenu' }));
    await user.click(
      screen.getByRole('menuitem', { name: 'MenuActions.Update' })
    );

    // Then
    expect(mocks.setIntegrationType).toHaveBeenCalledWith(
      IntegrationType.TaxiiFeed
    );
  });

  it('should revalidate, toast and navigate to service page when delete completes', async () => {
    // Given
    const documents = [
      {
        id: FirstDocumentId,
        slug: FirstDocumentSlug,
        name: FirstDocumentName,
        type: 'opencti_integration',
        short_description: FirstDocumentDescription,
        use_cases: [],
      },
    ] as documentItem_fragment$data[];
    const { user } = testRender(
      <DocumentList
        documents={documents}
        displayMode={ServiceListDisplayMode.List}
      />
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.OpenMenu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Utils.Delete' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'Utils.Delete' })
    );

    // Then
    expect(mocks.revalidatePathActions).toHaveBeenCalledWith([
      `/cybersecurity-solutions/${ServiceSlug}`,
    ]);
    expect(toast).toHaveBeenCalledWith({
      title: 'Utils.Success',
      description: `${TranslationKey}.Actions.Deleted`,
    });
    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(
        `/app/service/${ServiceIdentifier}/${ServiceInstanceId}`
      );
    });
  });
});
