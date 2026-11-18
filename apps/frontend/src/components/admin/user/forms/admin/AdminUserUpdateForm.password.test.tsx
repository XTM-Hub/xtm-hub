import { AdminUserUpdateForm } from '@/components/admin/user/forms/admin/AdminUserUpdateForm';
import { UsersListUser } from '@/components/admin/user/user-list.types';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useUserAdminEditMutation: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUserAdminEditMutation: mocks.useUserAdminEditMutation,
}));

vi.mock('@/components/ui/SheetWithPreventingDialog', () => ({
  useDialogContext: () => ({
    handleCloseSheet: vi.fn(),
    setIsDirty: vi.fn(),
    setOpenSheet: vi.fn(),
  }),
}));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: vi.fn(),
}));

vi.mock('@/components/admin/user/AutocompleteOrganization', () => ({
  AutocompleteOrganization: () => <div />,
}));

vi.mock('@/components/admin/user/CapabilityDescription', () => ({
  CapabilityDescription: () => <div />,
}));

vi.mock('@/components/ui/capability/MultiSelect', () => ({
  CapabilityMultiSelect: () => <div />,
}));

const USER_ID = 'user-id';
const ORGANIZATION_ID = 'organization-id';
const NEW_PASSWORD = 'new-password';
const NEW_FIRST_NAME = 'Jane';
const PASSWORD_LABEL = 'UserForm.Password';

const USER = {
  id: USER_ID,
  email: 'user@filigran.io',
  first_name: 'John',
  last_name: 'Doe',
  disabled: false,
  organization_capabilities: [
    {
      id: 'personal-space-capability-id',
      capabilities: ['ADMINISTRATE_ORGANIZATION'],
      organization: {
        id: 'personal-space-id',
        name: 'Personal space',
        personal_space: true,
      },
    },
    {
      id: 'organization-capability-id',
      capabilities: ['MANAGE_ACCESS'],
      organization: {
        id: ORGANIZATION_ID,
        name: 'Filigran',
        personal_space: false,
      },
    },
  ],
} as unknown as UsersListUser;

const EXPECTED_ORGANIZATION_CAPABILITIES = [
  { organization_id: ORGANIZATION_ID, capabilities: ['MANAGE_ACCESS'] },
];

const renderForm = (environment = 'development') =>
  testRender(
    <AdminUserUpdateForm
      user={USER}
      callback={vi.fn()}
    />,
    { settings: { environment } }
  );

const submit = async (user: ReturnType<typeof renderForm>['user']) => {
  const validateButton = screen.getByRole('button', {
    name: 'Utils.Validate',
  });
  await waitFor(() => expect(validateButton).toBeEnabled());
  await user.click(validateButton);
  await waitFor(() => expect(updateUserMutation).toHaveBeenCalledTimes(1));
};

// The spy of the edit mutation, called with the variables the form sends.
let updateUserMutation: Mock;

const getSubmittedVariables = () => updateUserMutation.mock.calls[0][0];

describe('AdminUserUpdateForm', () => {
  beforeEach(() => {
    updateUserMutation = mockMutationHook(
      mocks.useUserAdminEditMutation,
      'success'
    );
  });

  it.each`
    environment      | isVisible
    ${'development'} | ${true}
    ${'staging'}     | ${false}
    ${'production'}  | ${false}
    ${'local'}       | ${false}
    ${''}            | ${false}
  `(
    'should display the password field: $isVisible when the environment is $environment',
    ({ environment, isVisible }) => {
      // Given / When
      renderForm(environment);

      // Then
      if (isVisible) {
        expect(screen.getByLabelText(PASSWORD_LABEL)).toHaveAttribute(
          'type',
          'password'
        );
        expect(screen.getByText('UserForm.PasswordHelper')).toBeInTheDocument();
      } else {
        expect(screen.queryByLabelText(PASSWORD_LABEL)).not.toBeInTheDocument();
      }
    }
  );

  it('should send the typed password with the other fields', async () => {
    // Given
    const { user } = renderForm();

    // When
    await user.type(screen.getByLabelText(PASSWORD_LABEL), NEW_PASSWORD);
    await submit(user);

    // Then
    expect(getSubmittedVariables()).toEqual({
      id: USER_ID,
      input: {
        first_name: 'John',
        last_name: 'Doe',
        password: NEW_PASSWORD,
        organization_capabilities: EXPECTED_ORGANIZATION_CAPABILITIES,
        disabled: null,
        email: null,
      },
    });
  });

  it('should leave the current password unchanged when the field is left empty', async () => {
    // Given
    const { user } = renderForm();

    // When
    const firstNameInput = screen.getByLabelText('UserForm.FirstName');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, NEW_FIRST_NAME);
    await submit(user);

    // Then the API keeps the current password when it is null
    expect(getSubmittedVariables().input).toEqual({
      first_name: NEW_FIRST_NAME,
      last_name: 'Doe',
      password: null,
      organization_capabilities: EXPECTED_ORGANIZATION_CAPABILITIES,
      disabled: null,
      email: null,
    });
  });
});
