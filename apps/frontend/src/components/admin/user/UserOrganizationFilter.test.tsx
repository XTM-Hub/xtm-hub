import testRender from '@/utils/test/test-render';
import {
  OrganizationItemFragment,
  OrganizationsListQueryVariables,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserOrganizationFilter } from './UserOrganizationFilter';

const ORGANIZATION_LABEL = 'UserActions.Organization';
const ACME_ID = 'org-acme';
const ACME_NAME = 'Acme Corporation';

const makeEdge = (node: Omit<OrganizationItemFragment, 'domains'>) => ({
  node: { ...node, domains: [] },
});
const ACME_EDGE = makeEdge({
  id: ACME_ID,
  name: ACME_NAME,
  personal_space: false,
});
const GLOBEX_EDGE = makeEdge({
  id: 'org-globex',
  name: 'Globex Industries',
  personal_space: false,
});
const ALL_EDGES = [
  ACME_EDGE,
  GLOBEX_EDGE,
  makeEdge({
    id: 'org-perso',
    name: 'Personal Space Org',
    personal_space: true,
  }),
];

const mocks = vi.hoisted(() => ({
  useOrganizationsListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useOrganizationsListQuery: mocks.useOrganizationsListQuery,
  });
});

const queriedSearchTerms = () =>
  mocks.useOrganizationsListQuery.mock.calls.map(
    ([, variables]) => (variables as OrganizationsListQueryVariables).searchTerm
  );

const mockOrganizationsQuery = (
  getEdges: (searchTerm: string) => typeof ALL_EDGES
) =>
  mocks.useOrganizationsListQuery.mockImplementation(
    (_client: unknown, variables: OrganizationsListQueryVariables) => {
      const edges = getEdges(variables.searchTerm ?? '');
      return {
        data: { organizations: { totalCount: edges.length, edges } },
        isLoading: false,
        isError: false,
      };
    }
  );

const getCombobox = () =>
  screen.getByRole('combobox', { name: ORGANIZATION_LABEL });

describe('UserOrganizationFilter', () => {
  beforeEach(() => {
    mockOrganizationsQuery(() => ALL_EDGES);
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

  it('should query with the typed text and never with the picked label when typing then picking', async () => {
    // Given
    const { user } = testRender(<UserOrganizationFilter onChange={vi.fn()} />);

    // When
    await user.type(getCombobox(), 'Acme');
    await user.click(screen.getByRole('option', { name: ACME_NAME }));

    // Then
    expect(queriedSearchTerms()).toContain('Acme');
    expect(queriedSearchTerms()).not.toContain(ACME_NAME);
  });

  it('should keep the typed text when the search no longer returns the selected organization', async () => {
    // Given
    mockOrganizationsQuery((searchTerm) =>
      searchTerm ? [GLOBEX_EDGE] : ALL_EDGES
    );
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

  it('should show the load error when the organizations cannot be loaded', () => {
    // Given
    mocks.useOrganizationsListQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isPlaceholderData: false,
    });

    // When
    testRender(<UserOrganizationFilter onChange={vi.fn()} />);

    // Then
    expect(
      screen.getByText('OrganizationActions.LoadOrganizationsError')
    ).toBeInTheDocument();
  });

  it.each([
    {
      description: 'the first organizations load',
      isLoading: true,
      isPlaceholderData: false,
    },
    {
      description: 'the searched organizations load',
      isLoading: false,
      isPlaceholderData: true,
    },
  ])(
    'should show the loading message when $description',
    async ({ isLoading, isPlaceholderData }) => {
      // Given
      mocks.useOrganizationsListQuery.mockReturnValue({
        data: undefined,
        isLoading,
        isError: false,
        isPlaceholderData,
      });
      const { user } = testRender(
        <UserOrganizationFilter onChange={vi.fn()} />
      );

      // When
      await user.click(getCombobox());

      // Then
      expect(await screen.findByText('Utils.Loading')).toBeInTheDocument();
    }
  );
});
