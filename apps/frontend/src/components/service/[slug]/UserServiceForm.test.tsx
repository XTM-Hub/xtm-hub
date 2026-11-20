import { UserServiceForm } from '@/components/service/[slug]/UserServiceForm';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import testRender from '@/utils/test/test-render';
import {
  FilterKey,
  OrderingMode,
  ServiceRestriction,
  SubscriptionByIdQuery,
  UserAccountStatus,
  UserOrdering,
  UserServiceItemFragment,
  UsersQuery,
  UsersQueryVariables,
} from '@graphql/generated';
import { userServicesKeys } from '@graphql/user-service/user-service.keys';
import { keepPreviousData, QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
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
const SERVER_ERROR = 'USER_SERVICE_ALREADY_EXISTS';

const SUBSCRIPTION_ID = 'subscription-1';
const SERVICE_INSTANCE_ID = 'service-instance-1';
const USER_SERVICE_ID = 'user-service-1';

const USER_SERVICE: UserServiceItemFragment = {
  id: USER_SERVICE_ID,
  user: {
    id: 'other-id',
    first_name: null,
    last_name: null,
    email: OTHER_EMAIL,
  },
  subscription: null,
  user_service_capability: [
    {
      id: 'user-service-capability-1',
      generic_service_capability: {
        id: 'generic-capability-1',
        name: ServiceRestriction.ManageAccess,
      },
      subscription_capability: null,
    },
  ],
};

const SUBSCRIPTION = {
  subscriptionById: {
    id: SUBSCRIPTION_ID,
    organization: { id: ORGANIZATION_ID },
    service_instance: {
      id: SERVICE_INSTANCE_ID,
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
  useAddUserServiceMutation: vi.fn(),
  useEditUserServiceMutation: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return {
    ...(await mockGeneratedQueryHooks(importOriginal, {
      useUsersQuery: mocks.usersQuery,
    })),
    useAddUserServiceMutation: mocks.useAddUserServiceMutation,
    useEditUserServiceMutation: mocks.useEditUserServiceMutation,
  };
});

vi.mock('@/components/Loader', () => ({
  default: () => <div data-testid="loader" />,
}));

// The debounce delay is not under test: searches run as soon as they are asked
vi.mock('usehooks-ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('usehooks-ts')>()),
  useDebounceCallback: (callback: unknown) => callback,
}));

const { setOpenSheet } = vi.hoisted(() => ({ setOpenSheet: vi.fn() }));

vi.mock('@/components/ui/SheetWithPreventingDialog', () => ({
  useDialogContext: () => ({
    handleCloseSheet: vi.fn(),
    setIsDirty: vi.fn(),
    setOpenSheet,
  }),
}));

const lastQueryVariables = () =>
  mocks.usersQuery.mock.lastCall?.[1] as UsersQueryVariables;

const lastQueryOptions = () =>
  mocks.usersQuery.mock.lastCall?.[2] as UsersQueryOptions;

const renderUserServiceForm = (userService?: UserServiceItemFragment) =>
  testRender(
    <UserServiceForm
      subscription={SUBSCRIPTION}
      userService={userService}
    />
  );

const pickOtherUser = async (
  user: ReturnType<typeof renderUserServiceForm>['user']
) => {
  await user.click(screen.getByRole('combobox', { name: EMAIL_LABEL }));
  await user.click(await screen.findByRole('option', { name: OTHER_EMAIL }));
};

describe('UserServiceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usersQuery.mockReturnValue({ data: USERS });
    mockMutationHook(mocks.useAddUserServiceMutation, 'success');
    mockMutationHook(mocks.useEditUserServiceMutation, 'success');
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
  });

  it('should disable the validate button while the user service mutation is in flight', () => {
    // Given a user service mutation in flight
    mockMutationHook(mocks.useAddUserServiceMutation, 'success', {
      isPending: true,
    });

    // When the form renders
    renderUserServiceForm();

    // Then the form cannot be submitted again
    expect(
      screen.getByRole('button', { name: new RegExp(`^${VALIDATE_LABEL}`) })
    ).toBeDisabled();
  });

  it('should render the capabilities on a design system Paper one layer above the drawer, with its title above it', () => {
    // When
    renderUserServiceForm();

    // Then
    const title = screen.getByText('OrganizationInServiceAction.SelectCapa');
    const surface = screen
      .getByText('InviteUserServiceForm.Description')
      .closest('section');
    // The surface carries the design system layer, radius and padding classes.
    // These pin the design system's class names on purpose, as jsdom does no
    // layout: a rename in the design system needs this test updated.
    expect(surface).toHaveClass('layer-3', 'rounded-sm', 'p-4');
    expect(surface).not.toContainElement(title);
    expect(surface?.parentElement).toContainElement(title);
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

  it('should invite the picked users to the subscription', async () => {
    // Given
    const addUserService = mockMutationHook(
      mocks.useAddUserServiceMutation,
      'success'
    );
    const { user } = renderUserServiceForm();
    await pickOtherUser(user);

    // When
    await user.click(
      screen.getByRole('button', { name: new RegExp(`^${VALIDATE_LABEL}`) })
    );

    // Then
    await waitFor(() =>
      expect(addUserService).toHaveBeenCalledWith({
        input: {
          email: [OTHER_EMAIL],
          capabilities: [],
          subscription_id: SUBSCRIPTION_ID,
        },
        service_instance_id: SERVICE_INSTANCE_ID,
      })
    );
  });

  it('should send the checked capabilities of the edited user', async () => {
    // Given
    const editUserService = mockMutationHook(
      mocks.useEditUserServiceMutation,
      'success'
    );
    const { user } = renderUserServiceForm(USER_SERVICE);

    // When
    await user.click(
      screen.getByRole('button', { name: new RegExp(`^${VALIDATE_LABEL}`) })
    );

    // Then
    await waitFor(() =>
      expect(editUserService).toHaveBeenCalledWith({
        input: {
          userServiceId: USER_SERVICE_ID,
          capabilities: [ServiceRestriction.ManageAccess],
        },
        service_instance_id: SERVICE_INSTANCE_ID,
      })
    );
  });

  it.each([
    {
      action: 'invitation',
      hook: () => mocks.useAddUserServiceMutation,
      userService: undefined,
      description: 'ServiceActions.UserServiceAdded',
      fillForm: pickOtherUser,
    },
    {
      action: 'edition',
      hook: () => mocks.useEditUserServiceMutation,
      userService: USER_SERVICE,
      description: 'ServiceActions.UserCapabilitiesModified',
      fillForm: async () => undefined,
    },
  ])(
    'should refresh the users, confirm and close the sheet once the $action succeeds',
    async ({ hook, userService, description, fillForm }) => {
      // Given
      const queryClient = new QueryClient();
      const invalidateQueries = vi
        .spyOn(queryClient, 'invalidateQueries')
        .mockResolvedValue();
      mockMutationHook(hook(), 'success');
      const { user } = testRender(
        <UserServiceForm
          subscription={SUBSCRIPTION}
          userService={userService}
        />,
        { queryClient }
      );
      await fillForm(user);

      // When
      await user.click(
        screen.getByRole('button', { name: new RegExp(`^${VALIDATE_LABEL}`) })
      );

      // Then
      await waitFor(() => expect(setOpenSheet).toHaveBeenCalledWith(false));
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: userServicesKeys.all(),
      });
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success', description })
      );
    }
  );

  it.each([
    {
      action: 'invitation',
      hook: () => mocks.useAddUserServiceMutation,
      userService: undefined,
      fillForm: pickOtherUser,
      description: <>{`Error.Server.${SERVER_ERROR}`}</>,
    },
    {
      action: 'edition',
      hook: () => mocks.useEditUserServiceMutation,
      userService: USER_SERVICE,
      fillForm: async () => undefined,
      description: `Error.Server.${SERVER_ERROR}`,
    },
  ])(
    'should show the server error and keep the sheet open when the $action is rejected',
    async ({ hook, userService, fillForm, description }) => {
      // Given
      mockMutationHook(hook(), 'error', { error: new Error(SERVER_ERROR) });
      const { user } = renderUserServiceForm(userService);
      await fillForm(user);

      // When
      await user.click(
        screen.getByRole('button', { name: new RegExp(`^${VALIDATE_LABEL}`) })
      );

      // Then
      await waitFor(() =>
        expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith({
          severity: 'error',
          title: 'Utils.Error',
          description,
        })
      );
      expect(setOpenSheet).not.toHaveBeenCalled();
    }
  );
});
