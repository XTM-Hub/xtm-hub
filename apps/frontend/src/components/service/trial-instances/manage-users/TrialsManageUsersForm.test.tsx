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
    // Renders the groups the refetch of the opening answers.
    refreshServiceGroups: (data: ServiceGroupsQuery) => {
      mocks.useServiceGroupsQuery.mockReturnValue({ data });
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
    mocks.useServiceGroupsQuery.mockReturnValue({ data: SERVICE_GROUPS });
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
    mocks.useServiceGroupsQuery.mockReturnValue({ data: undefined });

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

  it('should keep the members a refresh brings to a group the admin has not edited', async () => {
    // Given a form opened on a cached snapshot, then refreshed
    const updateServiceGroups = mockMutationHook(
      mocks.useUpdateServiceGroupsMutation,
      'success'
    );
    const { user, refreshServiceGroups } = renderTrialsManageUsersForm();
    refreshServiceGroups(REFRESHED_SERVICE_GROUPS);

    // When the admin adds another user to that group
    await addUserToGroup(user, OTHER_USER_EMAIL);
    await validate(user);

    // Then the member added since the snapshot is kept
    await waitFor(() =>
      expect(updateServiceGroups).toHaveBeenCalledWith({
        input: {
          groups: [{ id: GROUP_ID, userIds: [USER_ID, OTHER_USER_ID] }],
        },
      })
    );
  });

  it('should keep the edits of a group when a refresh lands after them', async () => {
    // Given a group the admin has already edited
    const updateServiceGroups = mockMutationHook(
      mocks.useUpdateServiceGroupsMutation,
      'success'
    );
    const { user, refreshServiceGroups } = renderTrialsManageUsersForm();
    await addUserToGroup(user, OTHER_USER_EMAIL);

    // When the refreshed groups arrive, then the admin validates
    refreshServiceGroups(REFRESHED_SERVICE_GROUPS);
    await validate(user);

    // Then
    await waitFor(() =>
      expect(updateServiceGroups).toHaveBeenCalledWith({
        input: { groups: [{ id: GROUP_ID, userIds: [OTHER_USER_ID] }] },
      })
    );
  });

  it('should keep the edits on their group when a refresh answers the groups in another order', async () => {
    // Given an edited Admin group listed before the Reader group
    const updateServiceGroups = mockMutationHook(
      mocks.useUpdateServiceGroupsMutation,
      'success'
    );
    mocks.useServiceGroupsQuery.mockReturnValue({
      data: { serviceGroups: [...SERVICE_GROUPS.serviceGroups, READER_GROUP] },
    });
    const { user, refreshServiceGroups } = renderTrialsManageUsersForm();
    await addUserToGroup(user, OTHER_USER_EMAIL);

    // When the refresh lists the Reader group first, then the admin validates
    refreshServiceGroups({
      serviceGroups: [READER_GROUP, ...SERVICE_GROUPS.serviceGroups],
    });
    await validate(user);

    // Then the edit stays on the Admin group
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
