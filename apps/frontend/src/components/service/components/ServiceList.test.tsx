import ServiceList from '@/components/service/components/ServiceList';
import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import { ServiceListLocalStorageKey } from '@/hooks/use-service-list-local-storage';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import {
  DocumentOrdering,
  IntegrationType,
  OrderingMode,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  useServiceContext: vi.fn(),
  useServiceCapability: vi.fn(),
  useUserHasPortalCapability: vi.fn(),
  useServiceListLocalStorageKeyContext: vi.fn(),
  useServiceListLocalStorage: vi.fn(),
  useScrollPosition: vi.fn(),
  setDisplayMode: vi.fn(),
  setOrderBy: vi.fn(),
  setOrderMode: vi.fn(),
  setSelectedFilters: vi.fn(),
  removeLabels: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  selectedFilters: [] as string[],
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

vi.mock(
  '@/components/service/components/ServiceListLocalStorageKeyContext',
  () => ({
    useServiceListLocalStorageKeyContext:
      testState.useServiceListLocalStorageKeyContext,
  })
);

vi.mock('@/hooks/use-service-list-local-storage', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/hooks/use-service-list-local-storage')
  >()),
  useServiceListLocalStorage: testState.useServiceListLocalStorage,
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

const buildLocalStorageState = (displayMode = ServiceListDisplayMode.Tab) => ({
  removeLabels: testState.removeLabels,
  displayMode,
  setDisplayMode: testState.setDisplayMode,
  orderBy: DocumentOrdering.Name,
  orderMode: OrderingMode.Asc,
  setOrderBy: testState.setOrderBy,
  setOrderMode: testState.setOrderMode,
  selectedFilters: testState.selectedFilters,
  setSelectedFilters: testState.setSelectedFilters,
  productVersions: {},
  openctiVersions: {},
});

describe('ServiceList', () => {
  beforeEach(() => {
    testState.setDisplayMode.mockReset();
    testState.setOrderBy.mockReset();
    testState.setOrderMode.mockReset();
    testState.setSelectedFilters.mockReset();
    testState.removeLabels.mockReset();
    testState.restore.mockReset();
    testState.save.mockReset();
    testState.selectedFilters = [];
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
    testState.useServiceListLocalStorageKeyContext.mockReturnValue({
      localStorageKey: ServiceListLocalStorageKey.OpenCTIIntegrationFeeds,
    });
    testState.useServiceListLocalStorage.mockImplementation(() =>
      buildLocalStorageState()
    );
    testState.useScrollPosition.mockReturnValue({
      restore: testState.restore,
      save: testState.save,
    });
  });

  it('renders hero and draft section for updatable services', () => {
    const active = [
      {
        id: 'active-1',
        slug: 'active-doc',
        name: 'Active document',
        type: 'opencti_integration',
        integration_type: IntegrationType.CsvFeed,
        short_description: 'Active description',
        use_cases: [],
      },
    ] as Partial<documentItem_fragment$data>[];
    const draft = [
      {
        id: 'draft-1',
        slug: 'draft-doc',
        name: 'Draft document',
        type: 'opencti_integration',
        short_description: 'Draft description',
        use_cases: [],
      },
    ] as Partial<documentItem_fragment$data>[];

    testRender(
      <ServiceList
        active={active}
        draft={draft}
        search=""
        onSearchChange={vi.fn()}
      />
    );

    expect(screen.getByText('Service.LibraryHero.Eyebrow')).toBeInTheDocument();
    expect(screen.getByText('My Service')).toBeInTheDocument();
    expect(
      screen.getByText('Service.Connector.NonActive:')
    ).toBeInTheDocument();
    expect(screen.getByText('Service.Connector.Active:')).toBeInTheDocument();
    expect(screen.getByText('Draft document')).toBeInTheDocument();
    expect(testState.restore).toHaveBeenCalledOnce();
  });

  it('does not render draft section when user cannot upload', () => {
    testState.useServiceCapability.mockReturnValue(false);
    const active = [
      {
        id: 'active-1',
        slug: 'active-doc',
        name: 'Active document',
        type: 'opencti_integration',
        integration_type: IntegrationType.CsvFeed,
        short_description: 'Active description',
        use_cases: [],
      },
    ] as Partial<documentItem_fragment$data>[];
    const draft = [
      {
        id: 'draft-1',
        slug: 'draft-doc',
        name: 'Draft document',
        type: 'opencti_integration',
        short_description: 'Draft description',
        use_cases: [],
      },
    ] as Partial<documentItem_fragment$data>[];

    testRender(
      <ServiceList
        active={active}
        draft={draft}
        search=""
        onSearchChange={vi.fn()}
      />
    );

    expect(screen.queryByText('Service.Connector.NonActive:')).toBeNull();
    expect(screen.queryByText('Draft document')).toBeNull();
  });

  it('groups known integration types in accordion and keeps unknown types as plain lists', () => {
    const active = [
      {
        id: 'active-1',
        slug: 'connector-doc',
        name: 'Connector document',
        type: 'opencti_integration',
        integration_type: IntegrationType.Connector,
        short_description: 'Connector description',
        use_cases: [],
      },
      {
        id: 'active-2',
        slug: 'dashboard-doc',
        name: 'Dashboard document',
        type: 'opencti_custom_dashboard',
        short_description: 'Dashboard description',
        use_cases: [],
      },
    ] as Partial<documentItem_fragment$data>[];

    testRender(
      <ServiceList
        active={active}
        draft={[]}
        search=""
        onSearchChange={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        `Service.OpenctiIntegrations.Type.${IntegrationType.Connector}`
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Dashboard document')).toBeInTheDocument();

    expect(screen.getByText('Connector document')).toBeInTheDocument();
  });

  it('forwards display mode changes to local storage setter via header actions', async () => {
    const { user } = testRender(
      <ServiceList
        active={[]}
        draft={[]}
        search=""
        onSearchChange={vi.fn()}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Service.List.ViewTab' })
    );

    expect(testState.setDisplayMode).toHaveBeenCalledWith(
      ServiceListDisplayMode.Tab
    );
  });
});
