import SubscriptionSlug from '@/components/subcription/[slug]/SubscriptionSlug';
import type { SelectionState } from '@/components/ui/data-table';
import { toCursor } from '@/hooks/use-table-pagination';
import testRender from '@/utils/test/test-render';
import {
  OrderingMode,
  OrganizationCapability,
  PortalCapability,
  ServiceDefinitionIdentifier,
  ServiceInstanceItemFragment,
  ServiceRestriction,
  ServiceUserCapabilitiesQuery,
  UserServiceItemFragment,
  UserServiceOrdering,
  UserServicesFromSubscriptionQuery,
} from '@graphql/generated';
import type { PaginationState, Updater } from '@tanstack/react-table';
import { act, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const NOT_FOUND_ERROR = 'NEXT_NOT_FOUND';
const ORGANIZATION_NAME = 'Subscribed Organization';
const MANAGED_SERVICE_NAME = 'Managed service';

const SUBSCRIPTION = {
  id: 'subscription-1',
  organization: { id: 'organization-1', name: ORGANIZATION_NAME },
  service_instance: {
    id: 'service-instance-1',
    name: 'Service',
    description: null,
    tags: [],
    service_definition: { service_capability: [] },
  },
  subscription_capability: [],
};

const SERVICE_INSTANCE: ServiceInstanceItemFragment = {
  id: 'service-instance-1',
  name: 'Service',
  description: null,
  slug: null,
  capabilities: [],
  service_definition: {
    identifier: ServiceDefinitionIdentifier.OpenctiCustomDashboards,
  },
};

const USER_EMAIL = 'jane.doe@filigran.io';
const USER_SERVICE: UserServiceItemFragment = {
  id: 'user-service-1',
  user: {
    id: 'user-1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: USER_EMAIL,
  },
  subscription: null,
  user_service_capability: [],
};

// The first user of the next page.
const NEXT_PAGE_USER_SERVICE: UserServiceItemFragment = {
  ...USER_SERVICE,
  id: 'user-service-51',
  user: { ...USER_SERVICE.user!, id: 'user-51', email: 'zoe@filigran.io' },
};

const USER_SERVICES_TOTAL_COUNT = 120;
const PAGE_SIZE = 50;

const USER_SERVICES: UserServicesFromSubscriptionQuery = {
  userServiceFromSubscription: {
    totalCount: USER_SERVICES_TOTAL_COUNT,
    edges: [{ node: USER_SERVICE }, { node: null }],
  },
};

const NO_USER_SERVICES: UserServicesFromSubscriptionQuery = {
  userServiceFromSubscription: { totalCount: 0, edges: [] },
};

// 120 users read 50 by 50 end on the third page.
const LAST_PAGE_INDEX = 2;

const SETTLED_RESPONSE = {
  isSuccess: true,
  isFetching: false,
  isPlaceholderData: false,
};

// The previous users, shown while the response of the new variables loads.
const PLACEHOLDER_RESPONSE = {
  isSuccess: true,
  isFetching: true,
  isPlaceholderData: true,
};

const mockUserServicesResponse = (
  totalCount: number,
  response: typeof SETTLED_RESPONSE
) =>
  mocks.useUserServicesFromSubscriptionQuery.mockReturnValue({
    data: {
      userServiceFromSubscription: {
        totalCount,
        edges: totalCount > 0 ? [{ node: USER_SERVICE }] : [],
      },
    },
    ...response,
  });

const actorCapabilities = (
  subscriptionId: string | null,
  capabilityName: string
): ServiceUserCapabilitiesQuery => ({
  userServiceCapabilities: {
    subscription_id: subscriptionId,
    userServiceCapabilities: [
      {
        id: 'user-service-capability-1',
        user_service_id: 'actor-user-service',
        generic_service_capability: {
          id: 'generic-capability-1',
          name: capabilityName,
        },
        subscription_capability: null,
      },
    ],
  },
});

const mocks = vi.hoisted(() => ({
  useSubscriptionByIdQuery: vi.fn(),
  useUserServicesFromSubscriptionQuery: vi.fn(),
  useServiceUserCapabilitiesQuery: vi.fn(),
  dataTable: vi.fn(),
  addCapabilities: vi.fn(),
}));

type DataTableProps = {
  data: UserServiceItemFragment[];
  selectionOptions?: {
    selectionState: {
      state: SelectionState;
      onSelectionChange: (state: SelectionState) => void;
    };
    selectionHeader: {
      actions: (props: { selectionState: SelectionState }) => ReactNode;
    };
  };
  tableOptions: {
    manualPagination?: boolean;
    rowCount?: number;
    onPaginationChange: (updater: Updater<PaginationState>) => void;
  };
  tableState: { pagination: PaginationState };
};

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useSubscriptionByIdQuery: mocks.useSubscriptionByIdQuery,
    useUserServicesFromSubscriptionQuery:
      mocks.useUserServicesFromSubscriptionQuery,
    useServiceUserCapabilitiesQuery: mocks.useServiceUserCapabilitiesQuery,
  });
});

vi.mock('@/components/ui/data-table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/data-table')>()),
  DataTable: ({
    data,
    tableOptions,
    tableState,
    selectionOptions,
  }: DataTableProps) => {
    mocks.dataTable({ data, tableOptions, tableState, selectionOptions });
    return (
      <div>
        {data.map((userService) => (
          <span key={userService.id}>{userService.user?.email}</span>
        ))}
        {selectionOptions?.selectionHeader.actions({
          selectionState: selectionOptions.selectionState.state,
        })}
      </div>
    );
  },
}));

type AddCapabilitiesProps = {
  open: boolean;
  selectedUserServices: UserServiceItemFragment[];
};

vi.mock(
  '@/components/subcription/[slug]/SubscriptionSlugAddCapabilities',
  () => ({
    SubscriptionSlugAddCapabilities: ({
      open,
      selectedUserServices,
    }: AddCapabilitiesProps) => {
      mocks.addCapabilities({ open, selectedUserServices });
      return null;
    },
  })
);

const mockSubscriptionQuery = (subscriptionById: typeof SUBSCRIPTION | null) =>
  mocks.useSubscriptionByIdQuery.mockReturnValue({
    data: { subscriptionById },
  });

vi.mock('@/components/Loader', () => ({ default: () => <div>loader</div> }));

type SubscriptionQueryOptions = {
  throwOnError: (error: Error, query: { state: { data: unknown } }) => boolean;
};

const lastDataTableProps = () =>
  mocks.dataTable.mock.lastCall?.[0] as DataTableProps;

const lastUserServicesVariables = () =>
  mocks.useUserServicesFromSubscriptionQuery.mock.lastCall?.[1];

const openPage = (pageIndex: number) =>
  act(() =>
    lastDataTableProps().tableOptions.onPaginationChange({
      pageIndex,
      pageSize: PAGE_SIZE,
    })
  );

const lastAddCapabilitiesProps = () =>
  mocks.addCapabilities.mock.lastCall?.[0] as AddCapabilitiesProps;

const lastSelection = () =>
  lastDataTableProps().selectionOptions!.selectionState.state;

const selectRows = ({
  selectAll = false,
  selectedIds = [],
}: {
  selectAll?: boolean;
  selectedIds?: string[];
}) =>
  act(() =>
    lastDataTableProps().selectionOptions!.selectionState.onSelectionChange({
      selectAll,
      selectedIds: new Set(selectedIds),
      excludedIds: new Set(),
    })
  );

const openBulkCapabilitiesDialog = async (user: UserEvent) => {
  await user.click(
    screen.getByRole('button', {
      name: 'Service.Management.AddUserServiceCapabilities.Button',
    })
  );
  expect(lastAddCapabilitiesProps().open).toBe(true);
};

const mockUserServicesRows = (userServices: UserServiceItemFragment[]) =>
  mocks.useUserServicesFromSubscriptionQuery.mockReturnValue({
    data: {
      userServiceFromSubscription: {
        totalCount: USER_SERVICES_TOTAL_COUNT,
        edges: userServices.map((node) => ({ node })),
      },
    },
  });

const renderAsServiceAdministrator = () =>
  testRender(<SubscriptionSlug subscriptionId={SUBSCRIPTION.id} />, {
    me: { capabilities: [{ name: PortalCapability.Bypass }] },
  });

const lastQueryOptions = () =>
  mocks.useSubscriptionByIdQuery.mock.lastCall?.[2] as SubscriptionQueryOptions;

const renderSubscriptionSlug = (
  serviceInstance?: ServiceInstanceItemFragment,
  selectedOrgCapabilities: OrganizationCapability[] = []
) =>
  testRender(
    <SubscriptionSlug
      subscriptionId={SUBSCRIPTION.id}
      serviceInstance={serviceInstance}
    />,
    { me: { selected_org_capabilities: selectedOrgCapabilities } }
  );

describe('SubscriptionSlug', () => {
  beforeEach(() => {
    mocks.useUserServicesFromSubscriptionQuery.mockReturnValue({
      data: USER_SERVICES,
    });
    mocks.useServiceUserCapabilitiesQuery.mockReturnValue({ data: undefined });
  });

  it.each([
    { page: 'admin', serviceInstance: undefined },
    { page: 'manage', serviceInstance: SERVICE_INSTANCE },
  ])(
    'should redirect to the not found page when the subscription cannot be loaded on the $page page',
    ({ serviceInstance }) => {
      // Given a subscription that cannot be loaded
      mockSubscriptionQuery(null);
      vi.mocked(notFound).mockImplementation(() => {
        throw new Error(NOT_FOUND_ERROR);
      });
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      // When the page renders
      const render = () => renderSubscriptionSlug(serviceInstance);

      // Then
      expect(render).toThrow(NOT_FOUND_ERROR);
    }
  );

  it('should display the subscription organization in the breadcrumb when the subscription is loaded', () => {
    // Given a loaded subscription
    mockSubscriptionQuery(SUBSCRIPTION);

    // When the admin page renders
    renderSubscriptionSlug();

    // Then
    expect(screen.getByText(ORGANIZATION_NAME)).toBeInTheDocument();
  });

  it('should display the loader while the subscription is loading', () => {
    // Given a subscription still loading
    mocks.useSubscriptionByIdQuery.mockReturnValue({ data: undefined });

    // When the admin page renders
    renderSubscriptionSlug();

    // Then
    expect(screen.getByText('loader')).toBeInTheDocument();
    expect(screen.queryByText(ORGANIZATION_NAME)).not.toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('should read the subscription of the page', () => {
    // Given a loaded subscription
    mockSubscriptionQuery(SUBSCRIPTION);

    // When the admin page renders
    renderSubscriptionSlug();

    // Then
    expect(mocks.useSubscriptionByIdQuery.mock.lastCall?.[1]).toEqual({
      subscriptionId: SUBSCRIPTION.id,
    });
  });

  it('should send the error to the error page when a load fails before the subscription is shown', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);
    renderSubscriptionSlug();

    // When
    const shouldThrow = lastQueryOptions().throwOnError(new Error(), {
      state: { data: undefined },
    });

    // Then
    expect(shouldThrow).toBe(true);
  });

  it('should keep the subscription on screen when a background refetch fails', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);
    renderSubscriptionSlug();

    // When
    const shouldThrow = lastQueryOptions().throwOnError(new Error(), {
      state: { data: { subscriptionById: SUBSCRIPTION } },
    });

    // Then
    expect(shouldThrow).toBe(false);
  });

  it('should list the users of the subscription', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);

    // When
    renderSubscriptionSlug();

    // Then
    expect(screen.getByText(USER_EMAIL)).toBeInTheDocument();
  });

  it('should read the users of the subscription ordered by first name', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);

    // When
    renderSubscriptionSlug();

    // Then
    expect(
      mocks.useUserServicesFromSubscriptionQuery.mock.lastCall?.[1]
    ).toEqual({
      subscriptionId: SUBSCRIPTION.id,
      count: PAGE_SIZE,
      cursor: toCursor(PAGE_SIZE, 0),
      orderBy: UserServiceOrdering.FirstName,
      orderMode: OrderingMode.Asc,
    });
  });

  it('should display the loader while the users are loading', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);
    mocks.useUserServicesFromSubscriptionQuery.mockReturnValue({
      data: undefined,
    });

    // When
    renderSubscriptionSlug();

    // Then
    expect(screen.getByText('loader')).toBeInTheDocument();
  });

  it('should head the manage page with its own service instance', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);

    // When
    renderSubscriptionSlug({ ...SERVICE_INSTANCE, name: MANAGED_SERVICE_NAME });

    // Then
    expect(
      screen.getByRole('heading', { name: MANAGED_SERVICE_NAME })
    ).toBeInTheDocument();
  });

  it('should head the admin page with the service instance of the subscription', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);

    // When
    renderSubscriptionSlug();

    // Then
    expect(
      screen.getByRole('heading', { name: SUBSCRIPTION.service_instance.name })
    ).toBeInTheDocument();
  });

  it('should page the users of the subscription on the server', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);

    // When
    renderSubscriptionSlug();

    // Then every user stays reachable, whatever page the ordering puts them on
    expect(lastDataTableProps().tableOptions).toMatchObject({
      manualPagination: true,
      rowCount: USER_SERVICES_TOTAL_COUNT,
    });
  });

  it('should read the users after the first page when the next page is opened', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);
    renderSubscriptionSlug();

    // When
    act(() =>
      lastDataTableProps().tableOptions.onPaginationChange({
        pageIndex: 1,
        pageSize: PAGE_SIZE,
      })
    );

    // Then
    expect(
      mocks.useUserServicesFromSubscriptionQuery.mock.lastCall?.[1]
    ).toMatchObject({
      count: PAGE_SIZE,
      cursor: toCursor(PAGE_SIZE, 1),
    });
  });

  it.each([
    { change: 'the next page is opened', pageIndex: 1, pageSize: PAGE_SIZE },
    { change: 'the page size changes', pageIndex: 0, pageSize: 100 },
  ])(
    'should drop the selection and close the bulk capabilities dialog when $change',
    async ({ pageIndex, pageSize }) => {
      // Given an admin who selected all the rows and opened the bulk
      // capabilities dialog
      mockSubscriptionQuery(SUBSCRIPTION);
      const { user } = renderAsServiceAdministrator();
      selectRows({ selectAll: true });
      await openBulkCapabilitiesDialog(user);

      // When
      act(() =>
        lastDataTableProps().tableOptions.onPaginationChange({
          pageIndex,
          pageSize,
        })
      );

      // Then no user of the new view is selected behind the admin's back
      expect(lastAddCapabilitiesProps().open).toBe(false);
      expect(lastSelection()).toEqual({
        selectAll: false,
        selectedIds: new Set(),
        excludedIds: new Set(),
      });
    }
  );

  it('should keep the bulk capabilities dialog open on the users the admin selected when a refetch brings new users', async () => {
    // Given an admin who selected all the rows and opened the bulk
    // capabilities dialog
    mockSubscriptionQuery(SUBSCRIPTION);
    const { user, rerender } = renderAsServiceAdministrator();
    selectRows({ selectAll: true });
    await openBulkCapabilitiesDialog(user);

    // When a background refetch brings a user added by another admin
    mockUserServicesRows([USER_SERVICE, NEXT_PAGE_USER_SERVICE]);
    rerender(<SubscriptionSlug subscriptionId={SUBSCRIPTION.id} />);

    // Then
    expect(lastAddCapabilitiesProps()).toEqual({
      open: true,
      selectedUserServices: [USER_SERVICE],
    });
    expect(lastSelection()).toEqual({
      selectAll: false,
      selectedIds: new Set([USER_SERVICE.id]),
      excludedIds: new Set(),
    });
  });

  it('should close the bulk capabilities dialog when a refetch removes every selected user', async () => {
    // Given an admin who selected all the rows and opened the bulk
    // capabilities dialog
    mockSubscriptionQuery(SUBSCRIPTION);
    const { user, rerender } = renderAsServiceAdministrator();
    selectRows({ selectAll: true });
    await openBulkCapabilitiesDialog(user);

    // When a refetch replaces the rows, as the page arriving after its
    // placeholder does
    mockUserServicesRows([NEXT_PAGE_USER_SERVICE]);
    rerender(<SubscriptionSlug subscriptionId={SUBSCRIPTION.id} />);

    // Then
    expect(lastAddCapabilitiesProps()).toEqual({
      open: false,
      selectedUserServices: [],
    });
    expect(lastSelection().selectAll).toBe(false);
  });

  it('should keep the removal confirmation open when a refetch brings new users', async () => {
    // Given an admin who selected a user and asked to remove their access
    mockSubscriptionQuery(SUBSCRIPTION);
    const { user, rerender } = renderAsServiceAdministrator();
    selectRows({ selectedIds: [USER_SERVICE.id] });
    await user.click(screen.getByRole('button', { name: 'Utils.Delete' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    // When a background refetch brings a user added by another admin
    mockUserServicesRows([USER_SERVICE, NEXT_PAGE_USER_SERVICE]);
    rerender(<SubscriptionSlug subscriptionId={SUBSCRIPTION.id} />);

    // Then
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('should read the capabilities of the user on the service of the subscription', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);

    // When
    renderSubscriptionSlug();

    // Then
    expect(mocks.useServiceUserCapabilitiesQuery.mock.lastCall?.[1]).toEqual({
      service_instance_id: SUBSCRIPTION.service_instance.id,
    });
  });

  it('should let a service manager manage the users when their own access is on another page', () => {
    // Given a manager of the subscription whose own row is not on this page
    mockSubscriptionQuery(SUBSCRIPTION);
    mocks.useServiceUserCapabilitiesQuery.mockReturnValue({
      data: actorCapabilities(SUBSCRIPTION.id, ServiceRestriction.ManageAccess),
    });

    // When
    renderSubscriptionSlug(SERVICE_INSTANCE);

    // Then
    expect(lastDataTableProps().selectionOptions).toBeDefined();
  });

  it('should not let a user manage the users with the access of another subscription', () => {
    // Given a manager of another subscription of the service
    mockSubscriptionQuery(SUBSCRIPTION);
    mocks.useServiceUserCapabilitiesQuery.mockReturnValue({
      data: actorCapabilities(
        'other-subscription',
        ServiceRestriction.ManageAccess
      ),
    });

    // When
    renderSubscriptionSlug();

    // Then
    expect(lastDataTableProps().selectionOptions).toBeUndefined();
  });

  it('should not let a user without the manage access manage the users', () => {
    // Given
    mockSubscriptionQuery(SUBSCRIPTION);
    mocks.useServiceUserCapabilitiesQuery.mockReturnValue({
      data: actorCapabilities(SUBSCRIPTION.id, ServiceRestriction.Access),
    });

    // When
    renderSubscriptionSlug(SERVICE_INSTANCE);

    // Then
    expect(lastDataTableProps().selectionOptions).toBeUndefined();
  });

  it.each([
    OrganizationCapability.AdministrateOrganization,
    OrganizationCapability.ManageSubscription,
  ])(
    'should let a user with %s manage the users when the page is empty',
    (organizationCapability) => {
      // Given
      mockSubscriptionQuery(SUBSCRIPTION);
      mocks.useUserServicesFromSubscriptionQuery.mockReturnValue({
        data: NO_USER_SERVICES,
      });

      // When
      renderSubscriptionSlug(SERVICE_INSTANCE, [organizationCapability]);

      // Then
      expect(lastDataTableProps().selectionOptions).toBeDefined();
    }
  );

  it.each([
    {
      case: 'the new last page when a removal empties the last page',
      totalCount: 60,
      expectedPageIndex: 1,
    },
    {
      case: 'the first page when the last user is removed',
      totalCount: 0,
      expectedPageIndex: 0,
    },
  ])('should go back to $case', ({ totalCount, expectedPageIndex }) => {
    // Given an admin on the last page
    mockSubscriptionQuery(SUBSCRIPTION);
    mockUserServicesResponse(USER_SERVICES_TOTAL_COUNT, SETTLED_RESPONSE);
    const { rerender } = renderSubscriptionSlug();
    openPage(LAST_PAGE_INDEX);

    // When the refetch after a removal answers a smaller total
    mockUserServicesResponse(totalCount, SETTLED_RESPONSE);
    rerender(<SubscriptionSlug subscriptionId={SUBSCRIPTION.id} />);

    // Then
    expect(lastUserServicesVariables()).toMatchObject({
      cursor: toCursor(PAGE_SIZE, expectedPageIndex),
    });
    expect(lastDataTableProps().tableState.pagination.pageIndex).toBe(
      expectedPageIndex
    );
  });

  it('should keep the page until the real response replaces the placeholder', () => {
    // Given an admin on the last page
    mockSubscriptionQuery(SUBSCRIPTION);
    mockUserServicesResponse(USER_SERVICES_TOTAL_COUNT, SETTLED_RESPONSE);
    const { rerender } = renderSubscriptionSlug();
    openPage(LAST_PAGE_INDEX);

    // When a placeholder with a smaller total is shown
    mockUserServicesResponse(60, PLACEHOLDER_RESPONSE);
    rerender(<SubscriptionSlug subscriptionId={SUBSCRIPTION.id} />);

    // Then the page is not corrected yet
    expect(lastUserServicesVariables()).toMatchObject({
      cursor: toCursor(PAGE_SIZE, LAST_PAGE_INDEX),
    });
    expect(lastDataTableProps().tableState.pagination.pageIndex).toBe(
      LAST_PAGE_INDEX
    );

    // When the real response arrives
    mockUserServicesResponse(60, SETTLED_RESPONSE);
    rerender(<SubscriptionSlug subscriptionId={SUBSCRIPTION.id} />);

    // Then
    expect(lastDataTableProps().tableState.pagination.pageIndex).toBe(1);
  });
});
