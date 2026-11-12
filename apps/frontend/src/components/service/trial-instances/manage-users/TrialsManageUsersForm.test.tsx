import { TrialsManageUsersForm } from '@/components/service/trial-instances/manage-users/TrialsManageUsersForm';
import testRender from '@/utils/test/test-render';
import {
  FilterKey,
  OrderingMode,
  UserAccountStatus,
  UserOrdering,
  UsersQuery,
  UsersQueryVariables,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const GROUP_NAME = 'Administrators';
const USER_EMAIL = 'user@filigran.io';
const VALIDATE_LABEL = 'Utils.Validate';
const ORGANIZATION_ID = 'organization-1';
const LOADER_TEST_ID = 'loader';

const USERS: UsersQuery = {
  users: {
    edges: [
      {
        node: {
          id: 'user-1',
          email: USER_EMAIL,
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

const mocks = vi.hoisted(() => ({
  usersQuery: vi.fn(),
}));

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  readInlineData: (_fragment: unknown, node: unknown) => node,
  useLazyLoadQuery: () => ({
    serviceGroups: [{ id: 'group-1', name: GROUP_NAME, users: [] }],
  }),
  useMutation: () => [vi.fn(), true],
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useUsersQuery: mocks.usersQuery,
  });
});

vi.mock('@/components/Loader', () => ({
  default: () => <div data-testid="loader" />,
}));

const lastQueryVariables = () =>
  mocks.usersQuery.mock.lastCall?.[1] as UsersQueryVariables;

const lastQueryOptions = () =>
  mocks.usersQuery.mock.lastCall?.[2] as UsersQueryOptions;

const renderTrialsManageUsersForm = () =>
  testRender(
    <TrialsManageUsersForm
      onCancel={vi.fn()}
      onCompleted={vi.fn()}
      organizationId={ORGANIZATION_ID}
      serviceInstanceId="service-instance-1"
    />
  );

describe('TrialsManageUsersForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usersQuery.mockReturnValue({ data: USERS });
  });

  it('should disable the validate button while the service groups update is in flight', async () => {
    // Given a service groups update in flight
    const { user } = renderTrialsManageUsersForm();

    // When a user is added to a group
    await user.click(screen.getByRole('combobox', { name: GROUP_NAME }));
    await user.click(await screen.findByRole('option', { name: USER_EMAIL }));

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
});
