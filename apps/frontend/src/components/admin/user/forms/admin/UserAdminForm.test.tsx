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
const SHEET_TITLE = 'Add user';
const USER_EMAIL = 'new.user@filigran.io';
const USER_FIRST_NAME = 'Ada';
const USER_LAST_NAME = 'Lovelace';
const INVALID_EMAIL = 'not-an-email';
const INVALID_EMAIL_MESSAGE = 'This is not a valid email.';
const MANAGE_ACCESS_OPTION = 'MANAGE ACCESS';
const MANAGE_SUBSCRIPTION_OPTION = 'MANAGE SUBSCRIPTION';
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
  });
});

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
      title={SHEET_TITLE}>
      <UserAdminForm handleSubmit={handleSubmit} />
    </SheetWithPreventingDialog>,
    {
      settings: { environment },
    }
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

const selectCapability = async (
  user: ReturnType<typeof renderUserAdminForm>['user'],
  organizationName: string,
  capabilityOption: string
) => {
  await user.click(screen.getByRole('combobox', { name: organizationName }));
  await user.click(screen.getByRole('option', { name: capabilityOption }));
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

  it.each([
    { environment: 'local', visible: true },
    { environment: 'production', visible: false },
  ])(
    'should set the password field visibility to $visible when the platform environment is $environment',
    ({ environment, visible }) => {
      // Given / When
      renderUserAdminForm({ environment });

      // Then
      expect(Boolean(screen.queryByLabelText(PASSWORD_LABEL))).toBe(visible);
    }
  );

  it('should submit the identity and the capabilities granted in each organization when the form is validated', async () => {
    // Given
    const handleSubmit = vi.fn();
    const { user } = renderUserAdminForm({ handleSubmit });

    // When
    await user.type(screen.getByLabelText(EMAIL_LABEL), USER_EMAIL);
    await user.type(screen.getByLabelText(FIRST_NAME_LABEL), USER_FIRST_NAME);
    await user.type(screen.getByLabelText(LAST_NAME_LABEL), USER_LAST_NAME);
    await addOrganization(user, ACME_ORGANIZATION.name);
    await selectCapability(user, ACME_ORGANIZATION.name, MANAGE_ACCESS_OPTION);
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
      screen.getByRole('combobox', { name: ACME_ORGANIZATION.name })
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

  it('should remove the organization row when it is removed', async () => {
    // Given
    const { user } = renderUserAdminForm();
    await addOrganization(user, ACME_ORGANIZATION.name);

    // When
    await user.click(
      screen.getByRole('button', { name: 'MenuActions.Remove' })
    );

    // Then
    expect(screen.queryByText(ACME_ORGANIZATION.name)).not.toBeInTheDocument();
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
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ organization_capabilities: [] })
    );
  });

  it('should keep the capabilities of the remaining organization when the first one is removed', async () => {
    // Given
    const handleSubmit = vi.fn();
    const { user } = renderUserAdminForm({ handleSubmit });
    await user.type(screen.getByLabelText(EMAIL_LABEL), USER_EMAIL);
    await addOrganization(user, ACME_ORGANIZATION.name);
    await addOrganization(user, GLOBEX_ORGANIZATION.name);
    await selectCapability(user, ACME_ORGANIZATION.name, MANAGE_ACCESS_OPTION);
    await selectCapability(
      user,
      GLOBEX_ORGANIZATION.name,
      MANAGE_SUBSCRIPTION_OPTION
    );

    // When
    await user.click(
      screen.getAllByRole('button', { name: 'MenuActions.Remove' })[0]
    );

    // Then
    expect(screen.queryByText(ACME_ORGANIZATION.name)).not.toBeInTheDocument();
    expect(screen.getByText(GLOBEX_ORGANIZATION.name)).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: GLOBEX_ORGANIZATION.name })
    ).toBeInTheDocument();
    expect(screen.getByText(MANAGE_SUBSCRIPTION_OPTION)).toBeInTheDocument();
    expect(screen.queryByText(MANAGE_ACCESS_OPTION)).not.toBeInTheDocument();

    // When the form is validated
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    // Then only the remaining organization is submitted, with its own capability
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_capabilities: [
          {
            organization_id: GLOBEX_ORGANIZATION.id,
            capabilities: [OrganizationCapability.ManageSubscription],
          },
        ],
      })
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
