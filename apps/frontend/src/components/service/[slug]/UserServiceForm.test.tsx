import { UserServiceForm } from '@/components/service/[slug]/UserServiceForm';
import testRender from '@/utils/test/test-render';
import {
  FilterKey,
  OrderingMode,
  SubscriptionByIdQuery,
  UserAccountStatus,
  UserOrdering,
  UsersQuery,
  UsersQueryVariables,
} from '@graphql/generated';
import { keepPreviousData } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const VALIDATE_LABEL = 'Utils.Validate';
const EMAIL_LABEL = 'InviteUserServiceForm.Email';
const ORGANIZATION_ID = 'organization-1';
const SEARCH_TERM = 'jane';
const LOADER_TEST_ID = 'loader';
// The user testRender signs in.
const ME_ID = 'mock_id';
const ME_EMAIL = 'me@filigran.io';
const OTHER_EMAIL = 'other@filigran.io';
const USER_STATUS = UserAccountStatus.Invited;
const LOADING_MESSAGE = 'Utils.Loading';

const SUBSCRIPTION = {
  subscriptionById: {
    id: 'subscription-1',
    organization: { id: ORGANIZATION_ID },
    service_instance: {
      id: 'service-instance-1',
      name: 'Service',
      service_definition: { service_capability: [] },
    },
    subscription_capability: [],
  },
} as unknown as SubscriptionByIdQuery;

const USERS: UsersQuery = {
  users: {
    edges: [
      { node: { id: ME_ID, email: ME_EMAIL, status: USER_STATUS } },
      { node: { id: 'other-id', email: OTHER_EMAIL, status: USER_STATUS } },
    ],
  },
};

const FIRST_LOAD_VARIABLES: UsersQueryVariables = {
  first: 50,
  orderMode: OrderingMode.Asc,
  orderBy: UserOrdering.Email,
  searchTerm: null,
  filters: [{ key: FilterKey.OrganizationId, value: [ORGANIZATION_ID] }],
};

type UsersQueryOptions = {
  placeholderData: unknown;
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

// The debounce delay is not under test: searches run as soon as they are asked
vi.mock('usehooks-ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('usehooks-ts')>()),
  useDebounceCallback: (callback: unknown) => callback,
}));

vi.mock('@/components/ui/SheetWithPreventingDialog', () => ({
  useDialogContext: () => ({
    handleCloseSheet: vi.fn(),
    setIsDirty: vi.fn(),
    setOpenSheet: vi.fn(),
  }),
}));

const lastQueryVariables = () =>
  mocks.usersQuery.mock.lastCall?.[1] as UsersQueryVariables;

const lastQueryOptions = () =>
  mocks.usersQuery.mock.lastCall?.[2] as UsersQueryOptions;

const renderUserServiceForm = () =>
  testRender(
    <UserServiceForm
      connectionId="connection-1"
      subscription={SUBSCRIPTION}
    />
  );

describe('UserServiceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usersQuery.mockReturnValue({ data: USERS });
  });

  it('should disable the validate button while the user service mutation is in flight', () => {
    // Given a user service mutation in flight
    // When the form renders
    renderUserServiceForm();

    // Then the form cannot be submitted again
    expect(
      screen.getByRole('button', { name: new RegExp(`^${VALIDATE_LABEL}`) })
    ).toBeDisabled();
  });

  it('should load the users of the subscription organization', () => {
    // When
    renderUserServiceForm();

    // Then
    expect(lastQueryVariables()).toEqual(FIRST_LOAD_VARIABLES);
  });

  it('should search the users with the typed text', async () => {
    // Given
    const { user } = renderUserServiceForm();

    // When
    await user.type(
      screen.getByRole('combobox', { name: EMAIL_LABEL }),
      SEARCH_TERM
    );

    // Then
    expect(lastQueryVariables()).toEqual({
      ...FIRST_LOAD_VARIABLES,
      searchTerm: SEARCH_TERM,
    });
  });

  it('should keep the current options on screen while a search loads', () => {
    // When
    renderUserServiceForm();

    // Then
    expect(lastQueryOptions().placeholderData).toBe(keepPreviousData);
  });

  it.each([
    {
      case: 'send the error to the error page when the first load fails',
      data: undefined,
      expected: true,
    },
    {
      case: 'keep the options when a background refetch fails',
      data: USERS,
      expected: false,
    },
  ])('should $case', ({ data, expected }) => {
    // Given
    renderUserServiceForm();

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
    renderUserServiceForm();

    // Then
    expect(screen.getByTestId(LOADER_TEST_ID)).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: EMAIL_LABEL })
    ).not.toBeInTheDocument();
  });

  it('should not offer the signed-in user', async () => {
    // Given
    const { user } = renderUserServiceForm();

    // When
    await user.click(screen.getByRole('combobox', { name: EMAIL_LABEL }));

    // Then
    expect(
      await screen.findByRole('option', { name: OTHER_EMAIL })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: ME_EMAIL })
    ).not.toBeInTheDocument();
  });

  it('should tell the user the options are loading while a search runs', async () => {
    // Given
    mocks.usersQuery.mockReturnValue({ data: USERS, isPlaceholderData: true });
    const { user } = renderUserServiceForm();

    // When
    await user.click(screen.getByRole('combobox', { name: EMAIL_LABEL }));

    // Then
    expect(await screen.findByText(LOADING_MESSAGE)).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: OTHER_EMAIL })
    ).not.toBeInTheDocument();
  });
});
