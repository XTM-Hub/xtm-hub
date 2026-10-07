import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserOrganizationFilter } from './UserOrganizationFilter';

const ORGANIZATION_LABEL = 'UserActions.Organization';
const ACME_ID = 'org-acme';
const ACME_NAME = 'Acme Corporation';

const ACME_EDGE = {
  node: { id: ACME_ID, name: ACME_NAME, personal_space: false },
};
const GLOBEX_EDGE = {
  node: { id: 'org-globex', name: 'Globex Industries', personal_space: false },
};
const ALL_EDGES = [
  ACME_EDGE,
  GLOBEX_EDGE,
  {
    node: {
      id: 'org-perso',
      name: 'Personal Space Org',
      personal_space: true,
    },
  },
];

const refetchMock = vi.fn();
let organizationEdges = ALL_EDGES;

vi.mock('@/components/organization/Organization.service', () => ({
  getOrganizations: () => ({
    organizationsData: {
      organizations: {
        edges: organizationEdges,
      },
    },
    refetch: refetchMock,
  }),
}));

const getCombobox = () =>
  screen.getByRole('combobox', { name: ORGANIZATION_LABEL });

describe('UserOrganizationFilter', () => {
  beforeEach(() => {
    refetchMock.mockReset();
    organizationEdges = ALL_EDGES;
  });

  it('renders the placeholder and lists non-personal organizations plus "All organizations"', async () => {
    const { user } = testRender(<UserOrganizationFilter onChange={vi.fn()} />);

    const combobox = screen.getByRole('combobox', {
      name: 'UserActions.Organization',
    });
    expect(combobox).toHaveAttribute('placeholder', 'UserActions.Organization');

    await user.click(combobox);

    expect(
      screen.getByText('UserActions.AllOrganizations')
    ).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('Globex Industries')).toBeInTheDocument();
    expect(screen.queryByText('Personal Space Org')).not.toBeInTheDocument();
  });

  it('calls onChange with the organization id when one is selected', async () => {
    const onChange = vi.fn();
    const { user } = testRender(<UserOrganizationFilter onChange={onChange} />);

    await user.click(
      screen.getByRole('combobox', { name: 'UserActions.Organization' })
    );
    await user.click(screen.getByText('Acme Corporation'));

    expect(onChange).toHaveBeenCalledWith('org-acme');
  });

  it('calls onChange with undefined when "All organizations" is selected', async () => {
    const onChange = vi.fn();
    const { user } = testRender(<UserOrganizationFilter onChange={onChange} />);

    await user.click(
      screen.getByRole('combobox', { name: 'UserActions.Organization' })
    );
    await user.click(screen.getByText('UserActions.AllOrganizations'));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('should refetch with the typed text and never with the picked label when typing then picking', async () => {
    // Given
    const { user } = testRender(<UserOrganizationFilter onChange={vi.fn()} />);

    // When
    await user.type(getCombobox(), 'Acme');
    await user.click(screen.getByRole('option', { name: ACME_NAME }));

    // Then
    expect(refetchMock).toHaveBeenCalledWith({ searchTerm: 'Acme' });
    expect(refetchMock).not.toHaveBeenCalledWith({ searchTerm: ACME_NAME });
  });

  it('should keep the typed text when the search no longer returns the selected organization', async () => {
    // Given
    refetchMock.mockImplementation(({ searchTerm }: { searchTerm: string }) => {
      organizationEdges = searchTerm ? [GLOBEX_EDGE] : ALL_EDGES;
    });
    const onChange = vi.fn();
    const renderFilter = () => (
      <UserOrganizationFilter
        value={ACME_ID}
        onChange={onChange}
      />
    );
    const { user, rerender } = testRender(renderFilter());

    // When
    await user.clear(getCombobox());
    await user.type(getCombobox(), 'Glo');
    rerender(renderFilter());

    // Then
    expect(getCombobox()).toHaveValue('Glo');
  });
});
