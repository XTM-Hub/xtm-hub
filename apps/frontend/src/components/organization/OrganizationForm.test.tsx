import { OrganizationForm } from '@/components/organization/OrganizationForm';
import testRender from '@/utils/test/test-render';
import { organizationItem_fragment$data } from '@generated/organizationItem_fragment.graphql';
import { screen, within } from '@testing-library/react';
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

const ORGANIZATION: organizationItem_fragment$data = {
  id: 'organization-id',
  name: 'Filigran',
  domains: [EXISTING_DOMAIN],
  personal_space: false,
  ' $fragmentType': 'organizationItem_fragment',
};

const getDomainsInput = () =>
  screen.getByRole('combobox', { name: 'OrganizationForm.Domains' });

const getDomainChips = () =>
  within(screen.getByRole('list', { name: 'Selected values' }))
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
});
