import { UsersListUser } from '@/components/admin/user/user-list.types';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import testRender from '@/utils/test/test-render';
import { OrganizationCapability } from '@graphql/generated';
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

type AdminUserUpdateFormModule =
  typeof import('@/components/admin/user/forms/admin/AdminUserUpdateForm');
type SheetModule = typeof import('@/components/ui/SheetWithPreventingDialog');
type AppSnackbarsModule =
  typeof import('@/components/ui/snackbar/AppSnackbars');

const SHEET_TITLE = 'Edit user';
const SELECTED_VALUES_LABEL = 'DesignSystem.Combobox.SelectedValues';
const ADD_ORGANIZATION_LABEL = 'UserForm.AddOrganization';
const FIRST_NAME_LABEL = 'UserForm.FirstName';
const LAST_NAME_LABEL = 'UserForm.LastName';
const MANAGE_ACCESS_OPTION = 'MANAGE ACCESS';
const MANAGE_SUBSCRIPTION_OPTION = 'MANAGE SUBSCRIPTION';
const SERVER_ERROR = 'UNKNOWN_ERROR';
const NEW_FIRST_NAME = 'Augusta';
const NEW_LAST_NAME = 'King';

const PERSONAL_SPACE = {
  id: 'org-personal',
  name: 'Ada Personal Space',
  personal_space: true,
};
const ACME_ORGANIZATION = {
  id: 'org-acme',
  name: 'Acme Corporation',
  personal_space: false,
  domains: [],
};
const GLOBEX_ORGANIZATION = {
  id: 'org-globex',
  name: 'Globex Industries',
  personal_space: false,
  domains: [],
};

const buildUser = (overrides: Partial<UsersListUser> = {}): UsersListUser => ({
  id: 'user-ada',
  email: 'ada.lovelace@filigran.io',
  first_name: 'Ada',
  last_name: 'Lovelace',
  country: null,
  disabled: false,
  invitation_date: null,
  last_login: null,
  status: null,
  organization_capabilities: [
    {
      id: 'capabilities-personal',
      organization: PERSONAL_SPACE,
      capabilities: [],
    },
    {
      id: 'capabilities-acme',
      organization: ACME_ORGANIZATION,
      capabilities: [OrganizationCapability.ManageAccess],
    },
    {
      id: 'capabilities-globex',
      organization: GLOBEX_ORGANIZATION,
      capabilities: [OrganizationCapability.ManageSubscription],
    },
  ],
  ...overrides,
});

const USER = buildUser();
const USER_WITH_ACME_ONLY = buildUser({
  organization_capabilities: USER.organization_capabilities?.slice(0, 2),
});

const mocks = vi.hoisted(() => ({
  refreshUsersList: vi.fn(),
  useUserAdminEditMutation: vi.fn(),
}));

let AdminUserUpdateForm: AdminUserUpdateFormModule['AdminUserUpdateForm'];
let SheetWithPreventingDialog: SheetModule['SheetWithPreventingDialog'];
let AppSnackbars: AppSnackbarsModule['AppSnackbars'];
// The mutate spy of the edit mutation, accepted unless a test says otherwise.
let mutate: Mock;

// The messages live at module level, and the sheet context must come from the
// same module instance as the form: everything is loaded again for each test.
beforeEach(async () => {
  mutate = mockMutationHook(mocks.useUserAdminEditMutation, 'success');
  vi.resetModules();
  ({ AdminUserUpdateForm } =
    await import('@/components/admin/user/forms/admin/AdminUserUpdateForm'));
  ({ SheetWithPreventingDialog } =
    await import('@/components/ui/SheetWithPreventingDialog'));
  ({ AppSnackbars } = await import('@/components/ui/snackbar/AppSnackbars'));
});

const refuseMutation = () => {
  mutate = mockMutationHook(mocks.useUserAdminEditMutation, 'error', {
    error: new Error(SERVER_ERROR),
  });
};

vi.mock('@/components/admin/user/use-refresh-users-list', () => ({
  useRefreshUsersList: () => mocks.refreshUsersList,
}));

// The organization list query answers the same organizations for every search.
vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useOrganizationsListQuery: () => ({
      data: {
        organizations: {
          totalCount: 2,
          edges: [{ node: ACME_ORGANIZATION }, { node: GLOBEX_ORGANIZATION }],
        },
      },
      isLoading: false,
      isError: false,
    }),
  }).then((generated) => ({
    ...generated,
    useUserAdminEditMutation: mocks.useUserAdminEditMutation,
  }));
});

const renderForm = ({
  user = USER,
  callback = vi.fn(),
  setOpen = vi.fn(),
}: {
  user?: UsersListUser;
  callback?: () => void;
  setOpen?: () => void;
} = {}) => {
  return {
    ...testRender(
      <AppSnackbars>
        <SheetWithPreventingDialog
          open
          setOpen={setOpen}
          title={SHEET_TITLE}>
          <AdminUserUpdateForm
            user={user}
            callback={callback}
          />
        </SheetWithPreventingDialog>
      </AppSnackbars>
    ),
  };
};

const getSentMutation = () => mutate.mock.lastCall?.[0];

describe('AdminUserUpdateForm', () => {
  it('should list each non personal organization of the user under its own name', () => {
    // Given / When
    renderForm();

    // Then
    expect(screen.getByText(ACME_ORGANIZATION.name)).toBeInTheDocument();
    expect(screen.getByText(GLOBEX_ORGANIZATION.name)).toBeInTheDocument();
    expect(screen.queryByText(PERSONAL_SPACE.name)).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: ACME_ORGANIZATION.name })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: GLOBEX_ORGANIZATION.name })
    ).toBeInTheDocument();
  });

  it('should show the current capabilities of the user in each organization', () => {
    // Given / When
    renderForm();

    // Then
    const [acmeCapabilities, globexCapabilities] = screen.getAllByLabelText(
      SELECTED_VALUES_LABEL
    );
    expect(
      within(acmeCapabilities).getByText(MANAGE_ACCESS_OPTION)
    ).toBeInTheDocument();
    expect(
      within(globexCapabilities).getByText(MANAGE_SUBSCRIPTION_OPTION)
    ).toBeInTheDocument();
  });

  it('should name the capabilities of an organization added by the administrator after that organization', async () => {
    // Given
    const { user } = renderForm({ user: USER_WITH_ACME_ONLY });

    // When
    await user.click(
      screen.getByRole('combobox', { name: ADD_ORGANIZATION_LABEL })
    );
    await user.click(
      screen.getByRole('option', { name: GLOBEX_ORGANIZATION.name })
    );

    // Then
    expect(screen.getByText(GLOBEX_ORGANIZATION.name)).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: GLOBEX_ORGANIZATION.name })
    ).toBeInTheDocument();
  });

  it('should send the edited identity and the capabilities of each organization when validated', async () => {
    // Given
    const { user } = renderForm();
    const firstName = screen.getByLabelText(FIRST_NAME_LABEL);
    const lastName = screen.getByLabelText(LAST_NAME_LABEL);

    // When
    await user.clear(firstName);
    await user.type(firstName, NEW_FIRST_NAME);
    await user.clear(lastName);
    await user.type(lastName, NEW_LAST_NAME);
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    // Then
    expect(getSentMutation()).toEqual({
      id: USER.id,
      input: {
        first_name: NEW_FIRST_NAME,
        last_name: NEW_LAST_NAME,
        password: null,
        disabled: null,
        email: null,
        organization_capabilities: [
          {
            organization_id: ACME_ORGANIZATION.id,
            capabilities: [OrganizationCapability.ManageAccess],
          },
          {
            organization_id: GLOBEX_ORGANIZATION.id,
            capabilities: [OrganizationCapability.ManageSubscription],
          },
        ],
      },
    });
  });

  it('should leave a removed organization out of what is sent', async () => {
    // Given
    const { user } = renderForm();

    // When
    await user.click(
      screen.getAllByRole('button', { name: 'MenuActions.Remove' })[0]
    );
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    // Then
    expect(screen.queryByText(ACME_ORGANIZATION.name)).not.toBeInTheDocument();
    expect(getSentMutation()).toEqual(
      expect.objectContaining({
        input: expect.objectContaining({
          organization_capabilities: [
            {
              organization_id: GLOBEX_ORGANIZATION.id,
              capabilities: [OrganizationCapability.ManageSubscription],
            },
          ],
        }),
      })
    );
  });

  it('should confirm the update and notify the caller when the server accepts it', async () => {
    // Given
    const callback = vi.fn();
    const { user } = renderForm({ callback });

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    // Then
    expect(await screen.findByText('Utils.Success')).toBeInTheDocument();
    expect(screen.getByText('UserActions.UserUpdated')).toBeInTheDocument();
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should report the server error and not notify the caller when the server refuses the update', async () => {
    // Given
    refuseMutation();
    const callback = vi.fn();
    const { user } = renderForm({ callback });

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    // Then
    expect(await screen.findByText('Utils.Error')).toBeInTheDocument();
    expect(
      screen.getByText(`Error.Server.${SERVER_ERROR}`)
    ).toBeInTheDocument();
    expect(callback).not.toHaveBeenCalled();
  });

  it('should disable an enabled user once the administrator confirms', async () => {
    // Given
    const callback = vi.fn();
    const { user } = renderForm({
      user: buildUser({ disabled: false }),
      callback,
    });
    expect(
      screen.queryByRole('button', { name: 'UserActions.Enable' })
    ).not.toBeInTheDocument();

    // When
    await user.click(
      screen.getByRole('button', { name: 'UserActions.Disable' })
    );
    const dialog = await screen.findByRole('alertdialog', {
      name: 'MenuActions.Disable',
    });
    expect(mutate).not.toHaveBeenCalled();
    await user.click(
      within(dialog).getByRole('button', { name: 'MenuActions.Disable' })
    );

    // Then
    expect(getSentMutation()).toEqual({
      id: USER.id,
      input: {
        disabled: true,
        first_name: null,
        last_name: null,
        organization_capabilities: null,
        password: null,
        email: null,
      },
    });
    await waitFor(() => expect(callback).toHaveBeenCalledOnce());
  });

  it('should enable a disabled user without asking for confirmation', async () => {
    // Given
    const callback = vi.fn();
    const { user } = renderForm({
      user: buildUser({ disabled: true }),
      callback,
    });
    expect(
      screen.queryByRole('button', { name: 'UserActions.Disable' })
    ).not.toBeInTheDocument();

    // When
    await user.click(
      screen.getByRole('button', { name: 'UserActions.Enable' })
    );

    // Then
    expect(getSentMutation()).toEqual({
      id: USER.id,
      input: {
        disabled: false,
        first_name: null,
        last_name: null,
        organization_capabilities: null,
        password: null,
        email: null,
      },
    });
    await waitFor(() => expect(callback).toHaveBeenCalledOnce());
  });

  it('should report the server error and not notify the caller when the status change is refused', async () => {
    // Given
    refuseMutation();
    const callback = vi.fn();
    const { user } = renderForm({
      user: buildUser({ disabled: true }),
      callback,
    });

    // When
    await user.click(
      screen.getByRole('button', { name: 'UserActions.Enable' })
    );

    // Then
    expect(await screen.findByText('Utils.Error')).toBeInTheDocument();
    expect(
      screen.getByText(`Error.Server.${SERVER_ERROR}`)
    ).toBeInTheDocument();
    expect(callback).not.toHaveBeenCalled();
  });

  it('should ask for confirmation before discarding what has been edited when cancelling', async () => {
    // Given
    const setOpen = vi.fn();
    const { user } = renderForm({ setOpen });
    await user.type(screen.getByLabelText(FIRST_NAME_LABEL), NEW_FIRST_NAME);

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    expect(
      await screen.findByRole('alertdialog', {
        name: 'DialogActions.PreventSheetTitle',
      })
    ).toBeInTheDocument();
    expect(setOpen).not.toHaveBeenCalled();
  });

  describe('users list refresh', () => {
    beforeEach(() => {
      mocks.refreshUsersList.mockClear();
    });

    it('should reload the users list when the update is accepted', async () => {
      // Given
      const { user } = renderForm();

      // When
      await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

      // Then
      await waitFor(() =>
        expect(mocks.refreshUsersList).toHaveBeenCalledOnce()
      );
    });

    it('should reload the users list when the status change is accepted', async () => {
      // Given
      const { user } = renderForm({
        user: buildUser({ disabled: true }),
      });

      // When
      await user.click(
        screen.getByRole('button', { name: 'UserActions.Enable' })
      );

      // Then
      await waitFor(() =>
        expect(mocks.refreshUsersList).toHaveBeenCalledOnce()
      );
    });

    it('should leave the users list as is when the update is refused', async () => {
      // Given
      refuseMutation();
      const { user } = renderForm();

      // When
      await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

      // Then
      expect(await screen.findByText('Utils.Error')).toBeInTheDocument();
      expect(mocks.refreshUsersList).not.toHaveBeenCalled();
    });

    it('should give the outcome callbacks to the mutation hook', () => {
      // When
      renderForm();

      // Then
      expect(mocks.useUserAdminEditMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });
  });
});
