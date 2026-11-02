import { OrganizationForm } from '@/components/organization/OrganizationForm';
import testRender from '@/utils/test/test-render';
import { OrganizationItemFragment } from '@graphql/generated';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/SheetWithPreventingDialog', () => ({
  useDialogContext: () => ({
    handleCloseSheet: vi.fn(),
    setIsDirty: vi.fn(),
    setOpenSheet: vi.fn(),
  }),
}));

const EXISTING_DOMAIN = 'filigran.io';
const NEW_DOMAIN = 'example.com';
const INVALID_DOMAIN = 'not-a-domain';
const DUPLICATE_DOMAIN = 'FILIGRAN.io';
const INVALID = 'OrganizationForm.Error.DomainsInvalid';
const DUPLICATE = 'OrganizationForm.Error.DuplicateName';
const NO_DOMAIN = 'OrganizationForm.Error.Domain';
const NEW_NAME = 'Filigran Labs';

const ORGANIZATION: OrganizationItemFragment = {
  id: 'organization-id',
  name: 'Filigran',
  domains: [EXISTING_DOMAIN],
  personal_space: false,
};

const getDomainsInput = () =>
  screen.getByRole('combobox', { name: 'OrganizationForm.Domains' });

const getDomainChips = () =>
  within(
    screen.getByRole('list', { name: 'DesignSystem.Combobox.SelectedValues' })
  )
    .getAllByRole('listitem')
    .map((chip) => chip.textContent);

const getValidateButton = () =>
  screen.getByRole('button', { name: 'Utils.Validate' });

describe('OrganizationForm', () => {
  it.each([
    { key: 'Enter', keyboard: '{Enter}' },
    { key: 'a comma', keyboard: ',' },
  ])(
    'should add the domain as a chip, empty the input and enable Validate when a valid domain is followed by $key',
    async ({ keyboard }) => {
      // Given
      const { user } = testRender(
        <OrganizationForm
          organization={ORGANIZATION}
          handleSubmit={vi.fn()}
        />
      );
      expect(getValidateButton()).toBeDisabled();

      // When
      await user.type(getDomainsInput(), `${NEW_DOMAIN}${keyboard}`);

      // Then
      expect(getDomainChips()).toEqual([EXISTING_DOMAIN, NEW_DOMAIN]);
      expect(getDomainsInput()).toHaveValue('');
      expect(getValidateButton()).toBeEnabled();
    }
  );

  it.each([
    { typed: '', key: '{Enter}', message: INVALID },
    { typed: INVALID_DOMAIN, key: '{Enter}', message: INVALID },
    { typed: INVALID_DOMAIN, key: ',', message: INVALID },
    { typed: DUPLICATE_DOMAIN, key: '{Enter}', message: DUPLICATE },
    { typed: DUPLICATE_DOMAIN, key: ',', message: DUPLICATE },
  ])(
    'should keep the typed text, add no chip, show $message and not submit when $typed is followed by $key',
    async ({ typed, key, message }) => {
      // Given
      const handleSubmit = vi.fn();
      const { user } = testRender(
        <OrganizationForm
          organization={ORGANIZATION}
          handleSubmit={handleSubmit}
        />
      );
      const nameInput = screen.getByRole('textbox', {
        name: 'OrganizationForm.Name',
      });
      await user.clear(nameInput);
      await user.type(nameInput, 'Filigran Labs');
      expect(getValidateButton()).toBeEnabled();

      // When
      await user.type(getDomainsInput(), `${typed}${key}`);

      // Then
      expect(getDomainChips()).toEqual([EXISTING_DOMAIN]);
      expect(getDomainsInput()).toHaveValue(typed);
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    }
  );

  it('should drop the domain when its chip remove control is clicked', async () => {
    // Given
    const { user } = testRender(
      <OrganizationForm
        organization={{
          ...ORGANIZATION,
          domains: [EXISTING_DOMAIN, NEW_DOMAIN],
        }}
        handleSubmit={vi.fn()}
      />
    );

    // When
    await user.click(
      screen.getByRole('button', { name: `Remove ${EXISTING_DOMAIN}` })
    );

    // Then
    expect(getDomainChips()).toEqual([NEW_DOMAIN]);
  });

  it('should submit the edited name with the domains when the user validates an existing organization', async () => {
    // Given
    const handleSubmit = vi.fn();
    const { user } = testRender(
      <OrganizationForm
        organization={ORGANIZATION}
        handleSubmit={handleSubmit}
      />
    );
    const nameInput = screen.getByRole('textbox', {
      name: 'OrganizationForm.Name',
    });
    await user.clear(nameInput);
    await user.type(nameInput, NEW_NAME);

    // When
    await user.click(getValidateButton());

    // Then
    await waitFor(() =>
      expect(handleSubmit).toHaveBeenCalledWith({
        name: NEW_NAME,
        domains: [EXISTING_DOMAIN],
      })
    );
  });

  it('should ask for at least one domain and not submit when the user validates a new organization without domain', async () => {
    // Given
    const handleSubmit = vi.fn();
    const { user } = testRender(
      <OrganizationForm handleSubmit={handleSubmit} />
    );
    await user.type(
      screen.getByRole('textbox', { name: 'OrganizationForm.Name' }),
      NEW_NAME
    );

    // When
    await user.click(getValidateButton());

    // Then
    expect(await screen.findByText(NO_DOMAIN)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('should disable Validate when the changed values are being saved', async () => {
    // Given
    const { user } = testRender(
      <OrganizationForm
        organization={ORGANIZATION}
        handleSubmit={vi.fn()}
        isSubmitting
      />
    );
    const nameInput = screen.getByRole('textbox', {
      name: 'OrganizationForm.Name',
    });

    // When
    await user.clear(nameInput);
    await user.type(nameInput, NEW_NAME);

    // Then
    expect(getValidateButton()).toBeDisabled();
  });
});
