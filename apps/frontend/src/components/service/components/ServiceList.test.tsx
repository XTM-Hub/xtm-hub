import ServiceList from '@/components/service/components/ServiceList';
import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import testRender from '@/utils/test/test-render';
import {
  DocumentItemFragment,
  DocumentOrdering,
  IntegrationType,
  OrderingMode,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const FILTERS_BUTTON_LABEL = 'Service.List.Filters';

const testState = vi.hoisted(() => ({
  useServiceContext: vi.fn(),
  useServiceCapability: vi.fn(),
  useUserHasPortalCapability: vi.fn(),
  useServiceListStorageKeyContext: vi.fn(),
  useServiceListStorage: vi.fn(),
  useScrollPosition: vi.fn(),
  setDisplayMode: vi.fn(),
  setOrderBy: vi.fn(),
  setOrderMode: vi.fn(),
  removeLabels: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
}));

vi.mock('@/components/service/components/ServiceContext', () => ({
  useServiceContext: testState.useServiceContext,
}));

vi.mock('@/hooks/use-service-capability', () => ({
  default: testState.useServiceCapability,
}));

vi.mock('@/hooks/use-portal-capability', () => ({
  useUserHasPortalCapability: testState.useUserHasPortalCapability,
}));

vi.mock('@/components/service/components/ServiceListStorageKeyContext', () => ({
  useServiceListStorageKeyContext: testState.useServiceListStorageKeyContext,
}));

vi.mock('@/hooks/use-service-list-storage', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/hooks/use-service-list-storage')
  >()),
  useServiceListStorage: testState.useServiceListStorage,
}));

vi.mock('@/hooks/use-scroll-position', () => ({
  default: testState.useScrollPosition,
}));

vi.mock(
  '@/components/service/components/header/ServiceListHeaderButtons',
  () => ({
    default: () => <button type="button">header-buttons</button>,
  })
);

const buildStorageState = (displayMode = ServiceListDisplayMode.Tab) => ({
  removeLabels: testState.removeLabels,
  displayMode,
  setDisplayMode: testState.setDisplayMode,
  orderBy: DocumentOrdering.Name,
  orderMode: OrderingMode.Asc,
  setOrderBy: testState.setOrderBy,
  setOrderMode: testState.setOrderMode,
});

describe('ServiceList', () => {
  beforeEach(() => {
    testState.setDisplayMode.mockReset();
    testState.setOrderBy.mockReset();
    testState.setOrderMode.mockReset();
    testState.removeLabels.mockReset();
    testState.restore.mockReset();
    testState.save.mockReset();
    testState.useServiceContext.mockReturnValue({
      translationKey: 'Service.Connector',
      serviceInstance: {
        id: 'service-1',
        slug: 'my-service',
        name: 'My Service',
        description: 'A service description',
        service_definition: {
          identifier: 'opencti',
        },
      },
      type: 'opencti_integration',
      setIntegrationType: vi.fn(),
    });
    testState.useServiceCapability.mockReturnValue(true);
    testState.useUserHasPortalCapability.mockReturnValue(false);
    testState.useServiceListStorageKeyContext.mockReturnValue({
      storageKey: ServiceListStorageKey.OpenCTIIntegrationFeeds,
    });
    testState.useServiceListStorage.mockImplementation(() =>
      buildStorageState()
    );
    testState.useScrollPosition.mockReturnValue({
      restore: testState.restore,
      save: testState.save,
    });
  });

  it('renders hero and the draft, in validation and published sections for updatable services', () => {
    const published = [
      {
        id: 'published-1',
        slug: 'published-doc',
        name: 'Published document',
        type: 'opencti_integration',
        integration_type: IntegrationType.CsvFeed,
        short_description: 'Active description',
        use_cases: [],
      },
    ] as Partial<DocumentItemFragment>[];
    const draft = [
      {
        id: 'draft-1',
        slug: 'draft-doc',
        name: 'Draft document',
        type: 'opencti_integration',
        short_description: 'Draft description',
        use_cases: [],
      },
    ] as Partial<DocumentItemFragment>[];

    const inValidation = [
      {
        id: 'in-validation-1',
        slug: 'in-validation-doc',
        name: 'In validation document',
        type: 'opencti_integration',
        short_description: 'In validation description',
        use_cases: [],
      },
    ] as Partial<DocumentItemFragment>[];

    testRender(
      <ServiceList
        published={published}
        draft={draft}
        inValidation={inValidation}
        search=""
        onSearchChange={vi.fn()}
        additionalFilters={{}}
      />
    );

    expect(screen.getByText('Service.LibraryHero.Eyebrow')).toBeInTheDocument();
    expect(screen.getByText('My Service')).toBeInTheDocument();
    const titles = [
      'DocumentStatus.Draft:',
      'DocumentStatus.InValidation:',
      'DocumentStatus.Published:',
    ].map((title) => screen.getByText(title));
    titles.slice(1).forEach((title, index) => {
      expect(
        titles[index].compareDocumentPosition(title) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });
    expect(screen.getByText('Draft document')).toBeInTheDocument();
    expect(screen.getByText('In validation document')).toBeInTheDocument();
    expect(testState.restore).toHaveBeenCalledOnce();
  });

  it('does not render the draft and in validation sections when user cannot upload', () => {
    testState.useServiceCapability.mockReturnValue(false);
    const published = [
      {
        id: 'published-1',
        slug: 'published-doc',
        name: 'Published document',
        type: 'opencti_integration',
        integration_type: IntegrationType.CsvFeed,
        short_description: 'Active description',
        use_cases: [],
      },
    ] as Partial<DocumentItemFragment>[];
    const draft = [
      {
        id: 'draft-1',
        slug: 'draft-doc',
        name: 'Draft document',
        type: 'opencti_integration',
        short_description: 'Draft description',
        use_cases: [],
      },
    ] as Partial<DocumentItemFragment>[];

    const inValidation = [
      {
        id: 'in-validation-1',
        slug: 'in-validation-doc',
        name: 'In validation document',
        type: 'opencti_integration',
        short_description: 'In validation description',
        use_cases: [],
      },
    ] as Partial<DocumentItemFragment>[];

    testRender(
      <ServiceList
        published={published}
        draft={draft}
        inValidation={inValidation}
        search=""
        onSearchChange={vi.fn()}
        additionalFilters={{}}
      />
    );

    expect(screen.queryByText('DocumentStatus.Draft:')).toBeNull();
    expect(screen.queryByText('Draft document')).toBeNull();
    expect(screen.queryByText('DocumentStatus.InValidation:')).toBeNull();
    expect(screen.queryByText('In validation document')).toBeNull();
  });

  it('should render every published resource in a single list when they have different types', () => {
    const published = [
      {
        id: 'published-1',
        slug: 'connector-doc',
        name: 'Connector document',
        type: 'opencti_integration',
        integration_type: IntegrationType.Connector,
        short_description: 'Connector description',
        use_cases: [],
      },
      {
        id: 'published-2',
        slug: 'dashboard-doc',
        name: 'Dashboard document',
        type: 'opencti_custom_dashboard',
        short_description: 'Dashboard description',
        use_cases: [],
      },
    ] as Partial<DocumentItemFragment>[];

    testRender(
      <ServiceList
        published={published}
        draft={[]}
        inValidation={[]}
        search=""
        onSearchChange={vi.fn()}
        additionalFilters={{}}
      />
    );

    expect(screen.getByText('Connector document').closest('ul')).toBe(
      screen.getByText('Dashboard document').closest('ul')
    );
  });

  it('forwards display mode changes to local storage setter via header actions', async () => {
    const { user } = testRender(
      <ServiceList
        published={[]}
        draft={[]}
        inValidation={[]}
        search=""
        onSearchChange={vi.fn()}
        additionalFilters={{}}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Service.List.ViewTab' })
    );

    expect(testState.setDisplayMode).toHaveBeenCalledWith(
      ServiceListDisplayMode.Tab
    );
  });

  it('should open the filters sheet when the filters button is clicked', async () => {
    // Given
    const { user } = testRender(
      <ServiceList
        published={[]}
        draft={[]}
        inValidation={[]}
        search=""
        onSearchChange={vi.fn()}
        additionalFilters={{}}
      />
    );

    // When
    await user.click(
      screen.getByRole('button', { name: FILTERS_BUTTON_LABEL })
    );

    // Then
    expect(
      screen.getByRole('dialog', { name: FILTERS_BUTTON_LABEL })
    ).toBeInTheDocument();
  });
});
