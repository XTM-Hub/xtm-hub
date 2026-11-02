import testRender from '@/utils/test/test-render';
import {
  FiligranProduct,
  PortalCapability,
  SolutionCategoriesListQuery,
} from '@graphql/generated';
import {
  mockSolutionCategory,
  mockSolutionCategoryConnection,
  mockSolutionCategoryEdge,
} from '@graphql/mocks';
import { screen } from '@testing-library/react';
import Page from './page';

const mocks = vi.hoisted(() => ({
  useSolutionCategoriesListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useSolutionCategoriesListQuery: mocks.useSolutionCategoriesListQuery,
  });
});

const ADMIN_USER = { capabilities: [{ name: PortalCapability.Bypass }] };
const STANDARD_USER = { capabilities: [] };
const FORMATTED_CATEGORY_NAME = 'Threat Hunting';

const SOLUTION_CATEGORIES_RESPONSE: SolutionCategoriesListQuery = {
  solutionCategories: mockSolutionCategoryConnection({
    totalCount: 1,
    edges: [
      mockSolutionCategoryEdge({
        node: mockSolutionCategory({
          id: 'solution-category-1',
          name: 'threat hunting',
          product: [FiligranProduct.Opencti],
        }),
      }),
    ],
  }),
};

describe('Admin solution categories page', () => {
  beforeEach(() => {
    mocks.useSolutionCategoriesListQuery.mockReturnValue({
      data: SOLUTION_CATEGORIES_RESPONSE,
      isLoading: false,
    });
  });

  it('should show the solution categories to an administrator', () => {
    // Given / When
    testRender(<Page />, { me: ADMIN_USER });

    // Then
    expect(
      screen.getByRole('heading', { name: 'MenuLinks.SolutionCategory' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: new RegExp(FORMATTED_CATEGORY_NAME) })
    ).toBeInTheDocument();
  });

  it('should tell a standard user that they are not authorized instead of showing the solution categories', () => {
    // Given / When
    testRender(<Page />, { me: STANDARD_USER });

    // Then
    expect(screen.getByText('Error.YouAreNotAuthorized')).toBeInTheDocument();
    expect(screen.queryByText(FORMATTED_CATEGORY_NAME)).not.toBeInTheDocument();
  });
});
