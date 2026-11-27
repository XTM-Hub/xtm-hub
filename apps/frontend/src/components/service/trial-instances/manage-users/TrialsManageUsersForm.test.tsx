import { TrialsManageUsersForm } from '@/components/service/trial-instances/manage-users/TrialsManageUsersForm';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import testRender from '@/utils/test/test-render';
import {
  FilterKey,
  OrderingMode,
  ServiceGroupName,
  ServiceGroupsQuery,
  UserAccountStatus,
  UserOrdering,
  UsersQuery,
  UsersQueryVariables,
} from '@graphql/generated';
import { serviceGroupsKeys } from '@graphql/service-group/service-group.keys';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const GROUP_ID = 'group-1';
const GROUP_NAME = ServiceGroupName.Admin;
const USER_ID = 'user-1';
const SERVICE_INSTANCE_ID = 'service-instance-1';
const USER_EMAIL = 'user@filigran.io';
const OTHER_USER_ID = 'user-2';
const OTHER_USER_EMAIL = 'other@filigran.io';
const VALIDATE_LABEL = 'Utils.Validate';
const ORGANIZATION_ID = 'organization-1';
const LOADER_TEST_ID = 'loader';

const USERS: UsersQuery = {
  users: {
    edges: [
      {
        node: {
          id: USER_ID,
          email: USER_EMAIL,
          status: UserAccountStatus.Invited,
        },
      },
      {
        node: {
          id: OTHER_USER_ID,
          email: OTHER_USER_EMAIL,
          status: UserAccountStatus.Invited,
        },
      },
    ],
  },
};

type UsersQueryOptions = {
  placeholderData?: unknown;
  throwOnError: (
    error: Error,
    query: { state: { data: UsersQuery | undefined } }
  ) => boolean;
};

const SERVICE_GROUPS: ServiceGroupsQuery = {
  serviceGroups: [{ id: GROUP_ID, name: GROUP_NAME, users: [] }],
};

// The same group once another admin added a user to it.
const REFRESHED_SERVICE_GROUPS: ServiceGroupsQuery = {
  serviceGroups: [
    {
      id: GROUP_ID,
      name: GROUP_NAME,
      users: [{ id: USER_ID, email: USER_EMAIL }],
    },
  ],
};

const READER_GROUP: ServiceGroupsQuery['serviceGroups'][number] = {
  id: 'group-2',
  name: ServiceGroupName.Reader,
  users: [],
};

const OPENING_FETCH_ERROR = 'Opening fetch failed';

// The groups query once the fetch of this opening has landed.
const fetchedServiceGroups = (data: ServiceGroupsQuery) => ({
  data,
  isFetchedAfterMount: true,
  isError: false,
  error: null,
});

// The groups query while the fetch of this opening is in flight.
const fetchingServiceGroups = (data?: ServiceGroupsQuery) => ({
  data,
  isFetchedAfterMount: false,
  isError: false,
  error: null,
});

// The groups query once a fetch has failed, the cached groups kept.
const failedServiceGroups = (data: ServiceGroupsQuery) => ({
  data,
  isFetchedAfterMount: true,
  isError: true,
  error: new Error(OPENING_FETCH_ERROR),
});

const mocks = vi.hoisted(() => ({
  usersQuery: vi.fn(),
  useServiceGroupsQuery: vi.fn(),
  useUpdateServiceGroupsMutation: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return {
    ...(await mockGeneratedQueryHooks(importOriginal, {
      useUsersQuery: mocks.usersQuery,
      useServiceGroupsQuery: mocks.useServiceGroupsQuery,
    })),
    useUpdateServiceGroupsMutation: mocks.useUpdateServiceGroupsMutation,
  };
});

vi.mock('@/components/Loader', () => ({
  default: () => <div data-testid="loader" />,
}));

const lastQueryVariables = () =>
  mocks.usersQuery.mock.lastCall?.[1] as UsersQueryVariables;

const lastQueryOptions = () =>
  mocks.usersQuery.mock.lastCall?.[2] as UsersQueryOptions;

const renderTrialsManageUsersForm = () => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockResolvedValue();
  const onCompleted = vi.fn();
  const buildForm = () => (
    <TrialsManageUsersForm
      onCancel={vi.fn()}
      onCompleted={onCompleted}
      organizationId={ORGANIZATION_ID}
      serviceInstanceId={SERVICE_INSTANCE_ID}
    />
  );
  const rendered = testRender(buildForm(), { queryClient });
  return {
    ...rendered,
    invalidateQueries,
    onCompleted,
    // Renders the groups query in a new state.
    updateServiceGroupsQuery: (
      result: ReturnType<typeof fetchedServiceGroups>
    ) => {
      mocks.useServiceGroupsQuery.mockReturnValue(result);
      rendered.rerender(buildForm());
    },
  };
};

const validate = (
  user: ReturnType<typeof renderTrialsManageUsersForm>['user']
) =>
  user.click(
    screen.getByRole('button', { name: new RegExp(`^${VALIDATE_LABEL}`) })
  );

const addUserToGroup = async (
  user: ReturnType<typeof renderTrialsManageUsersForm>['user'],
  email = USER_EMAIL
) => {
  await user.click(screen.getByRole('combobox', { name: GROUP_NAME }));
  await user.click(await screen.findByRole('option', { name: email }));
  // The multiple combobox stays open after a pick.
  await user.keyboard('{Escape}');
};

describe('TrialsManageUsersForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usersQuery.mockReturnValue({ data: USERS });
    mocks.useServiceGroupsQuery.mockReturnValue(
      fetchedServiceGroups(SERVICE_GROUPS)
    );
    mockMutationHook(mocks.useUpdateServiceGroupsMutation, 'success');
  });

  it('should disable the validate button while the service groups update is in flight', async () => {
    // Given a service groups update in flight
    mockMutationHook(mocks.useUpdateServiceGroupsMutation, 'success', {
      isPending: true,
    });
    const { user } = renderTrialsManageUsersForm();

    // When a user is added to a group
    await addUserToGroup(user);

    // Then the form cannot be submitted again
    expect(
      screen.getByRole('button', { name: new RegExp(`^${VALIDATE_LABEL}`) })
    ).toBeDisabled();
  });

  it('should load the users of the trial organization', () => {
    // When
    renderTrialsManageUsersForm();

    // Then
    expect(lastQueryVariables()).toEqual({
      first: 50,
      orderMode: OrderingMode.Asc,
      orderBy: UserOrdering.Email,
      searchTerm: null,
      filters: [{ key: FilterKey.OrganizationId, value: [ORGANIZATION_ID] }],
    });
  });

  it('should not keep previous users, its variables never change', () => {
    // When
    renderTrialsManageUsersForm();

    // Then
    expect(lastQueryOptions().placeholderData).toBeUndefined();
  });

  it.each([
    {
      case: 'send the error to the error page when the first load fails',
      data: undefined,
      expected: true,
    },
    {
      case: 'keep the users when a background refetch fails',
      data: USERS,
      expected: false,
    },
  ])('should $case', ({ data, expected }) => {
    // Given
    renderTrialsManageUsersForm();

    // When
    const shouldThrow = lastQueryOptions().throwOnError(new Error(), {
      state: { data },
    });

    // Then
    expect(shouldThrow).toBe(expected);
  });

  it('should show the loader until the users are loaded', () => {
    // Given
    mocks.usersQuery.mockReturnValue({ data: undefined });

    // When
    renderTrialsManageUsersForm();

    // Then
    expect(screen.getByTestId(LOADER_TEST_ID)).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: GROUP_NAME })
    ).not.toBeInTheDocument();
  });

  it('should read the service groups of the trial service instance', () => {
    // When
    renderTrialsManageUsersForm();

    // Then
    expect(mocks.useServiceGroupsQuery.mock.lastCall?.[1]).toEqual({
      serviceInstanceId: SERVICE_INSTANCE_ID,
    });
  });

  it('should show the loader until the service groups are loaded', () => {
    // Given
    mocks.useServiceGroupsQuery.mockReturnValue(fetchingServiceGroups());

    // When
    renderTrialsManageUsersForm();

    // Then
    expect(screen.getByTestId(LOADER_TEST_ID)).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: GROUP_NAME })
    ).not.toBeInTheDocument();
  });

  it('should send the users picked for each group', async () => {
    // Given
    const updateServiceGroups = mockMutationHook(
      mocks.useUpdateServiceGroupsMutation,
      'success'
    );
    const { user } = renderTrialsManageUsersForm();
    await addUserToGroup(user);

    // When
    await user.click(
      screen.getByRole('button', { name: new RegExp(`^${VALIDATE_LABEL}`) })
    );

    // Then
    await waitFor(() =>
      expect(updateServiceGroups).toHaveBeenCalledWith({
        input: { groups: [{ id: GROUP_ID, userIds: [USER_ID] }] },
      })
    );
  });

  it('should refresh the service groups and close the form once they are updated', async () => {
    // Given
    const { user, invalidateQueries, onCompleted } =
      renderTrialsManageUsersForm();
    await addUserToGroup(user);

    // When
    await user.click(
      screen.getByRole('button', { name: new RegExp(`^${VALIDATE_LABEL}`) })
    );

    // Then
    await waitFor(() => expect(onCompleted).toHaveBeenCalled());
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: serviceGroupsKeys.all(),
    });
  });

  it('should refresh the service groups each time the form opens', () => {
    // When
    renderTrialsManageUsersForm();

    // Then
    expect(mocks.useServiceGroupsQuery.mock.lastCall?.[2]).toMatchObject({
      refetchOnMount: 'always',
    });
  });

  it('should show the loader on reopening until the fetch of the opening lands, even with cached groups', () => {
    // Given cached groups while the fetch of the opening is in flight
    mocks.useServiceGroupsQuery.mockReturnValue(
      fetchingServiceGroups(SERVICE_GROUPS)
    );
    const { updateServiceGroupsQuery } = renderTrialsManageUsersForm();
    expect(screen.getByTestId(LOADER_TEST_ID)).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: GROUP_NAME })
    ).not.toBeInTheDocument();

    // When the fetch of the opening lands
    updateServiceGroupsQuery(fetchedServiceGroups(REFRESHED_SERVICE_GROUPS));

    // Then the form opens
    expect(screen.queryByTestId(LOADER_TEST_ID)).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: GROUP_NAME })
    ).toBeInTheDocument();
  });

  it('should open the form on the memberships the fetch of the opening answers, not on the cached ones', async () => {
    // Given cached groups, then the fetch of the opening bringing a member
    const updateServiceGroups = mockMutationHook(
      mocks.useUpdateServiceGroupsMutation,
      'success'
    );
    mocks.useServiceGroupsQuery.mockReturnValue(
      fetchingServiceGroups(SERVICE_GROUPS)
    );
    const { user, updateServiceGroupsQuery } = renderTrialsManageUsersForm();
    updateServiceGroupsQuery(fetchedServiceGroups(REFRESHED_SERVICE_GROUPS));

    // When the admin adds another user to that group
    await addUserToGroup(user, OTHER_USER_EMAIL);
    await validate(user);

    // Then the member the fetch brought is kept
    await waitFor(() =>
      expect(updateServiceGroups).toHaveBeenCalledWith({
        input: {
          groups: [{ id: GROUP_ID, userIds: [USER_ID, OTHER_USER_ID] }],
        },
      })
    );
  });

  it('should send the error to the error page when the fetch of the opening fails, even with cached groups', () => {
    // Given cached groups and a failed fetch of the opening
    mocks.useServiceGroupsQuery.mockReturnValue(
      failedServiceGroups(SERVICE_GROUPS)
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    // When the form renders
    const render = () => renderTrialsManageUsersForm();

    // Then
    expect(render).toThrow(OPENING_FETCH_ERROR);
  });

  it('should keep the form open when a later refetch fails', () => {
    // Given an opened form
    const { updateServiceGroupsQuery } = renderTrialsManageUsersForm();

    // When a later refetch fails
    updateServiceGroupsQuery(failedServiceGroups(SERVICE_GROUPS));

    // Then
    expect(
      screen.getByRole('combobox', { name: GROUP_NAME })
    ).toBeInTheDocument();
  });

  it('should keep the fields and their values when a refetch lands after the form opened', async () => {
    // Given an opened form with an edited Admin group listed before the Reader group
    const updateServiceGroups = mockMutationHook(
      mocks.useUpdateServiceGroupsMutation,
      'success'
    );
    mocks.useServiceGroupsQuery.mockReturnValue(
      fetchedServiceGroups({
        serviceGroups: [...SERVICE_GROUPS.serviceGroups, READER_GROUP],
      })
    );
    const { user, updateServiceGroupsQuery } = renderTrialsManageUsersForm();
    await addUserToGroup(user, OTHER_USER_EMAIL);

    // When a refetch lists the Reader group first with new Admin members
    updateServiceGroupsQuery(
      fetchedServiceGroups({
        serviceGroups: [
          READER_GROUP,
          ...REFRESHED_SERVICE_GROUPS.serviceGroups,
        ],
      })
    );
    await validate(user);

    // Then the fields keep their order and the form sends the edits only
    expect(
      screen
        .getByRole('combobox', { name: GROUP_NAME })
        .compareDocumentPosition(
          screen.getByRole('combobox', { name: READER_GROUP.name })
        )
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    await waitFor(() =>
      expect(updateServiceGroups).toHaveBeenCalledWith({
        input: {
          groups: [
            { id: GROUP_ID, userIds: [OTHER_USER_ID] },
            { id: READER_GROUP.id, userIds: [] },
          ],
        },
      })
    );
  });
});
