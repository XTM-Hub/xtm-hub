import { UserForm } from '@/components/admin/user/forms/UserForm';
import { userFormSchema } from '@/components/admin/user/forms/user-form.schema';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import testRender from '@/utils/test/test-render';
import { OrganizationCapability } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const EMAIL_LABEL = 'UserForm.Email';
const CAPABILITIES_LABEL = 'UserForm.OrganizationCapabilities';
const USER_EMAIL = 'new.user@filigran.io';
const INVALID_EMAIL = 'not-an-email';
const INVALID_EMAIL_MESSAGE = 'This is not a valid email.';
const MANAGE_ACCESS_OPTION = 'MANAGE ACCESS';

const renderUserForm = (handleSubmit = vi.fn(), setOpen = vi.fn()) =>
  testRender(
    <SheetWithPreventingDialog
      open
      setOpen={setOpen}
      title="Add user">
      <UserForm
        handleSubmit={handleSubmit}
        validationSchema={userFormSchema}
      />
    </SheetWithPreventingDialog>
  );

describe('UserForm', () => {
  it('should not allow validating while nothing has been entered', () => {
    // Given / When
    renderUserForm();

    // Then
    expect(
      screen.getByRole('button', { name: 'Utils.Validate' })
    ).toBeDisabled();
  });

  it('should submit the email and the selected capabilities when the form is validated', async () => {
    // Given
    const handleSubmit = vi.fn();
    const { user } = renderUserForm(handleSubmit);

    // When
    await user.type(screen.getByLabelText(EMAIL_LABEL), USER_EMAIL);
    await user.click(
      screen.getByRole('combobox', { name: CAPABILITIES_LABEL })
    );
    await user.click(
      screen.getByRole('option', { name: MANAGE_ACCESS_OPTION })
    );
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    // Then
    expect(handleSubmit).toHaveBeenCalledWith({
      email: USER_EMAIL,
      password: '',
      capabilities: [OrganizationCapability.ManageAccess],
    });
  });

  it('should show an error and not submit when the email is not valid', async () => {
    // Given
    const handleSubmit = vi.fn();
    const { user } = renderUserForm(handleSubmit);

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
    const { user } = renderUserForm(vi.fn(), setOpen);

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('should ask for confirmation before discarding what has been typed when cancelling', async () => {
    // Given
    const setOpen = vi.fn();
    const { user } = renderUserForm(vi.fn(), setOpen);
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
