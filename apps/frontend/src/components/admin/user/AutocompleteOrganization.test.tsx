import testRender from '@/utils/test/test-render';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutocompleteOrganization } from './AutocompleteOrganization';

const ADD_ORGANIZATION_LABEL = 'UserForm.AddOrganization';
const ACME_NAME = 'Acme Corporation';
const ACME_ORGANIZATION = {
  id: 'org-acme',
  name: ACME_NAME,
  personal_space: false,
};
const GLOBEX_ORGANIZATION = {
  id: 'org-globex',
  name: 'Globex Industries',
  personal_space: false,
};

const refetchMock = vi.fn();

vi.mock('@/components/organization/Organization.service', () => ({
  getOrganizations: () => ({
    organizationsData: {
      organizations: {
        edges: [{ node: ACME_ORGANIZATION }, { node: GLOBEX_ORGANIZATION }],
      },
    },
    refetch: refetchMock,
  }),
}));

const getCombobox = () =>
  screen.getByRole('combobox', { name: ADD_ORGANIZATION_LABEL });

describe('AutocompleteOrganization', () => {
  beforeEach(() => {
    refetchMock.mockReset();
  });

  it('should refetch with the typed text when typing', async () => {
    // Given
    const { user } = testRender(
      <AutocompleteOrganization
        selectedOrganizationCapabilities={[]}
        onValueChange={vi.fn()}
      />
    );

    // When
    await user.type(getCombobox(), 'Acme');

    // Then
    expect(refetchMock).toHaveBeenLastCalledWith({ searchTerm: 'Acme' });
  });

  it('should hand the organization over and leave the field empty when one is picked', async () => {
    // Given
    const onValueChange = vi.fn();
    const { user } = testRender(
      <AutocompleteOrganization
        selectedOrganizationCapabilities={[]}
        onValueChange={onValueChange}
      />
    );

    // When
    await user.type(getCombobox(), 'Acme');
    await user.click(screen.getByRole('option', { name: ACME_NAME }));

    // Then
    expect(onValueChange).toHaveBeenCalledWith(ACME_ORGANIZATION);
    expect(getCombobox()).toHaveValue('');
  });

  it('should empty the field and reset the search when left after typing', async () => {
    // Given
    const { user } = testRender(
      <AutocompleteOrganization
        selectedOrganizationCapabilities={[]}
        onValueChange={vi.fn()}
      />
    );
    await user.type(getCombobox(), 'Acme');

    // When
    fireEvent.blur(getCombobox());

    // Then
    expect(getCombobox()).toHaveValue('');
    expect(refetchMock).toHaveBeenLastCalledWith({ searchTerm: '' });
  });
});
