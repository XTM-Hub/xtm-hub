import { UserAdminForm } from '@/components/admin/user/forms/admin/UserAdminForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import testRender from '@/utils/test/test-render';
import { OrganizationCapability } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const EMAIL_LABEL = 'UserForm.Email';
const FIRST_NAME_LABEL = 'UserForm.FirstName';
const LAST_NAME_LABEL = 'UserForm.LastName';
const PASSWORD_LABEL = 'UserForm.Password';
const ADD_ORGANIZATION_LABEL = 'UserForm.AddOrganization';
const CAPABILITIES_PLACEHOLDER =
  'UserForm.OrganizationsCapabilitiesPlaceholder';
const USER_EMAIL = 'new.user@filigran.io';
const USER_FIRST_NAME = 'Ada';
const USER_LAST_NAME = 'Lovelace';
const INVALID_EMAIL = 'not-an-email';
const INVALID_EMAIL_MESSAGE = 'This is not a valid email.';
const MANAGE_ACCESS_OPTION = 'MANAGE ACCESS';
const ACME_ORGANIZATION = {
  id: 'org-acme',
  name: 'Acme Corporation',
  personal_space: false,
};
const GLOBEX_ORGANIZATION = {
  id: 'org-globex',
  name: 'Globex Industries',
  personal_space: false,
};

// The organization list is fetched through Relay: it is the boundary of this form.
vi.mock('@/components/organization/Organization.service', () => ({
  getOrganizations: () => ({
    organizationsData: {
      organizations: {
        edges: [{ node: ACME_ORGANIZATION }, { node: GLOBEX_ORGANIZATION }],
      },
    },
    refetch: vi.fn(),
  }),
}));

const renderUserAdminForm = ({
  handleSubmit = vi.fn(),
  setOpen = vi.fn(),
  environment = 'local',
}: {
  handleSubmit?: () => void;
  setOpen?: () => void;
  environment?: string;
} = {}) =>
  testRender(
    <SheetWithPreventingDialog
      open
      setOpen={setOpen}
      title="Add user">
      <UserAdminForm handleSubmit={handleSubmit} />
    </SheetWithPreventingDialog>,
    { settings: { environment } }
  );

const addOrganization = async (
  user: ReturnType<typeof renderUserAdminForm>['user'],
  organizationName: string
) => {
  await user.click(
    screen.getByRole('combobox', { name: ADD_ORGANIZATION_LABEL })
  );
  await user.click(screen.getByRole('option', { name: organizationName }));
};

describe('UserAdminForm', () => {
  it('should not allow validating while nothing has been entered', () => {
    // Given / When
    renderUserAdminForm();

    // Then
    expect(
      screen.getByRole('button', { name: 'Utils.Validate' })
    ).toBeDisabled();
  });

  it('should let the administrator set a password when the platform is not in production', () => {
    // Given / When
    renderUserAdminForm({ environment: 'local' });

    // Then
    expect(screen.getByLabelText(PASSWORD_LABEL)).toBeInTheDocument();
  });

  it('should not offer a password field when the platform is in production', () => {
    // Given / When
    renderUserAdminForm({ environment: 'production' });

    // Then
    expect(screen.queryByLabelText(PASSWORD_LABEL)).not.toBeInTheDocument();
  });

  it('should submit the identity and the capabilities granted in each organization when the form is validated', async () => {
    // Given
    const handleSubmit = vi.fn();
    const { user } = renderUserAdminForm({ handleSubmit });

    // When
    await user.type(screen.getByLabelText(EMAIL_LABEL), USER_EMAIL);
    await user.type(screen.getByLabelText(FIRST_NAME_LABEL), USER_FIRST_NAME);
    await user.type(screen.getByLabelText(LAST_NAME_LABEL), USER_LAST_NAME);
    await addOrganization(user, ACME_ORGANIZATION.name);
    await user.click(
      screen.getByRole('combobox', { name: CAPABILITIES_PLACEHOLDER })
    );
    await user.click(
      screen.getByRole('option', { name: MANAGE_ACCESS_OPTION })
    );
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    // Then
    expect(handleSubmit).toHaveBeenCalledWith({
      email: USER_EMAIL,
      first_name: USER_FIRST_NAME,
      last_name: USER_LAST_NAME,
      password: '',
      organization_capabilities: [
        {
          organization_id: ACME_ORGANIZATION.id,
          capabilities: [OrganizationCapability.ManageAccess],
        },
      ],
    });
  });

  it('should show the organization name next to its capabilities when an organization is added', async () => {
    // Given
    const { user } = renderUserAdminForm();

    // When
    await addOrganization(user, ACME_ORGANIZATION.name);

    // Then
    expect(screen.getByText(ACME_ORGANIZATION.name)).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: CAPABILITIES_PLACEHOLDER })
    ).toBeInTheDocument();
  });

  it('should no longer propose an organization that has already been added', async () => {
    // Given
    const { user } = renderUserAdminForm();
    await addOrganization(user, ACME_ORGANIZATION.name);

    // When
    await user.click(
      screen.getByRole('combobox', { name: ADD_ORGANIZATION_LABEL })
    );

    // Then
    expect(
      screen.queryByRole('option', { name: ACME_ORGANIZATION.name })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: GLOBEX_ORGANIZATION.name })
    ).toBeInTheDocument();
  });

  it('should drop the organization from the submitted data when it is removed', async () => {
    // Given
    const handleSubmit = vi.fn();
    const { user } = renderUserAdminForm({ handleSubmit });
    await user.type(screen.getByLabelText(EMAIL_LABEL), USER_EMAIL);
    await addOrganization(user, ACME_ORGANIZATION.name);

    // When
    await user.click(
      screen.getByRole('button', { name: 'MenuActions.Remove' })
    );
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    // Then
    expect(screen.queryByText(ACME_ORGANIZATION.name)).not.toBeInTheDocument();
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ organization_capabilities: [] })
    );
  });

  it('should show an error and not submit when the email is not valid', async () => {
    // Given
    const handleSubmit = vi.fn();
    const { user } = renderUserAdminForm({ handleSubmit });

    // When
    await user.type(screen.getByLabelText(EMAIL_LABEL), INVALID_EMAIL);
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    // Then
    expect(await screen.findByText(INVALID_EMAIL_MESSAGE)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('should close the sheet when cancelling an untouched form', async () => {
    // Given
    const setOpen = vi.fn();
    const { user } = renderUserAdminForm({ setOpen });

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('should ask for confirmation before discarding what has been typed when cancelling', async () => {
    // Given
    const setOpen = vi.fn();
    const { user } = renderUserAdminForm({ setOpen });
    await user.type(screen.getByLabelText(EMAIL_LABEL), USER_EMAIL);

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
