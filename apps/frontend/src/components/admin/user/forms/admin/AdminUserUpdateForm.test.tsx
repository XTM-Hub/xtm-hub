import testRender from '@/utils/test/test-render';
import { UserList_fragment$data } from '@generated/UserList_fragment.graphql';
import { OrganizationCapability } from '@graphql/generated';
import { act, screen, within } from '@testing-library/react';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import { RelayMockEnvironment } from 'relay-test-utils/lib/RelayModernMockEnvironment';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
const MUTATION_NAME = 'AdminUserUpdateFormMutation';
const ORGANIZATIONS_QUERY_NAME = 'organizationSelectQuery';
const MANAGE_ACCESS_OPTION = 'MANAGE ACCESS';
const MANAGE_SUBSCRIPTION_OPTION = 'MANAGE SUBSCRIPTION';
const SERVER_ERROR = 'UNKNOWN_ERROR';
const NEW_FIRST_NAME = 'Augusta';
const NEW_LAST_NAME = 'King';
const QUEUED_RESPONSES_COUNT = 10;

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

const buildUser = (
  overrides: Partial<UserList_fragment$data> = {}
): UserList_fragment$data => ({
  ' $fragmentType': 'UserList_fragment',
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

let AdminUserUpdateForm: AdminUserUpdateFormModule['AdminUserUpdateForm'];
let SheetWithPreventingDialog: SheetModule['SheetWithPreventingDialog'];
let AppSnackbars: AppSnackbarsModule['AppSnackbars'];

// The messages live at module level, and the sheet context must come from the
// same module instance as the form: everything is loaded again for each test.
beforeEach(async () => {
  vi.resetModules();
  ({ AdminUserUpdateForm } =
    await import('@/components/admin/user/forms/admin/AdminUserUpdateForm'));
  ({ SheetWithPreventingDialog } =
    await import('@/components/ui/SheetWithPreventingDialog'));
  ({ AppSnackbars } = await import('@/components/ui/snackbar/AppSnackbars'));
});

// The organization list is fetched through Relay. Only the organizations query
// is answered, so the mutation stays pending until the test settles it.
const createEnvironment = () => {
  const environment = createMockEnvironment();
  for (let request = 0; request < QUEUED_RESPONSES_COUNT; request += 1) {
    environment.mock.queueOperationResolver((operation) =>
      operation.request.node.params.name === ORGANIZATIONS_QUERY_NAME
        ? MockPayloadGenerator.generate(operation, {
            Query: () => ({
              organizations: {
                totalCount: 2,
                edges: [
                  { node: ACME_ORGANIZATION },
                  { node: GLOBEX_ORGANIZATION },
                ],
              },
            }),
          })
        : null
    );
  }
  return environment;
};

const renderForm = ({
  user = USER,
  callback = vi.fn(),
  setOpen = vi.fn(),
}: {
  user?: UserList_fragment$data;
  callback?: () => void;
  setOpen?: () => void;
} = {}) => {
  const environment = createEnvironment();
  return {
    environment,
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
      </AppSnackbars>,
      { relayConfig: environment }
    ),
  };
};

const getSentMutation = (environment: RelayMockEnvironment) => {
  const operation = environment.mock.getMostRecentOperation();
  expect(operation.request.node.params.name).toBe(MUTATION_NAME);
  return operation.request.variables;
};

const resolveMutation = async (environment: RelayMockEnvironment) => {
  await act(async () => {
    environment.mock.resolveMostRecentOperation((operation) =>
      MockPayloadGenerator.generate(operation)
    );
  });
};

const rejectMutation = async (environment: RelayMockEnvironment) => {
  await act(async () => {
    environment.mock.rejectMostRecentOperation(new Error(SERVER_ERROR));
  });
};

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
    const { user, environment } = renderForm();
    const firstName = screen.getByLabelText(FIRST_NAME_LABEL);
    const lastName = screen.getByLabelText(LAST_NAME_LABEL);

    // When
    await user.clear(firstName);
    await user.type(firstName, NEW_FIRST_NAME);
    await user.clear(lastName);
    await user.type(lastName, NEW_LAST_NAME);
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    // Then
    expect(getSentMutation(environment)).toEqual({
      id: USER.id,
      input: {
        first_name: NEW_FIRST_NAME,
        last_name: NEW_LAST_NAME,
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
    const { user, environment } = renderForm();

    // When
    await user.click(
      screen.getAllByRole('button', { name: 'MenuActions.Remove' })[0]
    );
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    // Then
    expect(screen.queryByText(ACME_ORGANIZATION.name)).not.toBeInTheDocument();
    expect(getSentMutation(environment)).toEqual(
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
    const { user, environment } = renderForm({ callback });
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    // When
    await resolveMutation(environment);

    // Then
    expect(await screen.findByText('Utils.Success')).toBeInTheDocument();
    expect(screen.getByText('UserActions.UserUpdated')).toBeInTheDocument();
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should report the server error and not notify the caller when the server refuses the update', async () => {
    // Given
    const callback = vi.fn();
    const { user, environment } = renderForm({ callback });
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    // When
    await rejectMutation(environment);

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
    const { user, environment } = renderForm({
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
    expect(
      environment.mock
        .getAllOperations()
        .some(({ request }) => request.node.params.name === MUTATION_NAME)
    ).toBe(false);
    await user.click(
      within(dialog).getByRole('button', { name: 'MenuActions.Disable' })
    );
    const variables = getSentMutation(environment);
    await resolveMutation(environment);

    // Then
    expect(variables).toEqual({ id: USER.id, input: { disabled: true } });
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should enable a disabled user without asking for confirmation', async () => {
    // Given
    const callback = vi.fn();
    const { user, environment } = renderForm({
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
    const variables = getSentMutation(environment);
    await resolveMutation(environment);

    // Then
    expect(variables).toEqual({ id: USER.id, input: { disabled: false } });
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should report the server error and not notify the caller when the status change is refused', async () => {
    // Given
    const callback = vi.fn();
    const { user, environment } = renderForm({
      user: buildUser({ disabled: true }),
      callback,
    });

    // When
    await user.click(
      screen.getByRole('button', { name: 'UserActions.Enable' })
    );
    await rejectMutation(environment);

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
});
