import testRender from '@/utils/test/test-render';
import {
  OrganizationItemFragment,
  OrganizationsListQueryVariables,
} from '@graphql/generated';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutocompleteOrganization } from './AutocompleteOrganization';

const ADD_ORGANIZATION_LABEL = 'UserForm.AddOrganization';
const ACME_NAME = 'Acme Corporation';
const ACME_ORGANIZATION: OrganizationItemFragment = {
  id: 'org-acme',
  name: ACME_NAME,
  personal_space: false,
  domains: [],
};
const GLOBEX_ORGANIZATION: OrganizationItemFragment = {
  id: 'org-globex',
  name: 'Globex Industries',
  personal_space: false,
  domains: [],
};

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

const getCombobox = () =>
  screen.getByRole('combobox', { name: ADD_ORGANIZATION_LABEL });

describe('AutocompleteOrganization', () => {
  beforeEach(() => {
    mocks.useOrganizationsListQuery.mockReturnValue({
      data: {
        organizations: {
          totalCount: 2,
          edges: [{ node: ACME_ORGANIZATION }, { node: GLOBEX_ORGANIZATION }],
        },
      },
      isLoading: false,
      isError: false,
    });
  });

  it('should query with the typed text when typing', async () => {
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
    expect(queriedSearchTerms().at(-1)).toBe('Acme');
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
    expect(queriedSearchTerms().at(-1)).toBe('');
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
    testRender(
      <AutocompleteOrganization
        selectedOrganizationCapabilities={[]}
        onValueChange={vi.fn()}
      />
    );

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
        <AutocompleteOrganization
          selectedOrganizationCapabilities={[]}
          onValueChange={vi.fn()}
        />
      );

      // When
      await user.click(getCombobox());

      // Then
      expect(await screen.findByText('Utils.Loading')).toBeInTheDocument();
    }
  );
});
