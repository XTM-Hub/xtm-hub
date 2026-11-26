import testRender from '@/utils/test/test-render';
import {
  FiligranProduct,
  PortalCapability,
  SolutionCategoriesListQuery,
  UseCasesListQuery,
} from '@graphql/generated';
import {
  mockSolutionCategory,
  mockSolutionCategoryConnection,
  mockSolutionCategoryEdge,
  mockUseCase,
  mockUseCaseConnection,
  mockUseCaseEdge,
} from '@graphql/mocks';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Page from './page';

const mocks = vi.hoisted(() => ({
  useSolutionCategoriesListQuery: vi.fn(),
  useUseCasesListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useSolutionCategoriesListQuery: mocks.useSolutionCategoriesListQuery,
    useUseCasesListQuery: mocks.useUseCasesListQuery,
  });
});

vi.mock('@/components/service/AdminServiceList', () => ({
  default: () => <div>AdminServiceList</div>,
}));

const ADMIN_USER = { capabilities: [{ name: PortalCapability.Bypass }] };
const STANDARD_USER = { capabilities: [] };
const SERVICE_CATALOG_PATH = '/app/admin/service-catalog';
const FORMATTED_CATEGORY_NAME = 'Threat Hunting';
const USE_CASE_NAME = 'Threat hunting';

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

const USE_CASES_RESPONSE: UseCasesListQuery = {
  useCases: mockUseCaseConnection({
    totalCount: 1,
    edges: [
      mockUseCaseEdge({
        node: mockUseCase({ id: 'use-case-1', name: USE_CASE_NAME }),
      }),
    ],
  }),
};

const openTab = (tab: string | null) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(tab ? { tab } : {}) as unknown as ReturnType<
      typeof useSearchParams
    >
  );
};

describe('Admin service catalog page', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue(SERVICE_CATALOG_PATH);
    mocks.useSolutionCategoriesListQuery.mockReturnValue({
      data: SOLUTION_CATEGORIES_RESPONSE,
      isLoading: false,
    });
    mocks.useUseCasesListQuery.mockReturnValue({
      data: USE_CASES_RESPONSE,
      isError: false,
    });
  });

  it('should show the services tab to an administrator by default', () => {
    // Given
    openTab(null);

    // When
    testRender(<Page />, { me: ADMIN_USER });

    // Then
    expect(
      screen.getByRole('heading', { name: 'MenuLinks.ServiceCatalog' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'MenuLinks.Services', selected: true })
    ).toBeInTheDocument();
    expect(screen.getByText('AdminServiceList')).toBeInTheDocument();
  });

  it('should show the settings breadcrumb like the other settings pages', () => {
    // Given
    openTab(null);

    // When
    testRender(<Page />, { me: ADMIN_USER });

    // Then
    const breadcrumb = screen.getByRole('navigation', {
      name: 'DesignSystem.Breadcrumbs.Label',
    });
    expect(
      within(breadcrumb).getByText('MenuLinks.Settings')
    ).toBeInTheDocument();
    expect(
      within(breadcrumb).getByText('MenuLinks.ServiceCatalog')
    ).toBeInTheDocument();
  });

  it.each`
    tab                      | tabName                           | rowName
    ${'solution-categories'} | ${'MenuLinks.SolutionCategories'} | ${FORMATTED_CATEGORY_NAME}
    ${'use-cases'}           | ${'MenuLinks.UseCases'}           | ${USE_CASE_NAME}
  `(
    'should show the $tabName tab when the page is opened on it',
    ({ tab, tabName, rowName }) => {
      // Given
      openTab(tab);

      // When
      testRender(<Page />, { me: ADMIN_USER });

      // Then
      expect(
        screen.getByRole('tab', { name: tabName, selected: true })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('row', { name: new RegExp(rowName) })
      ).toBeInTheDocument();
    }
  );

  it('should put the selected tab in the address when the user opens another tab', async () => {
    // Given
    const user = userEvent.setup();
    const replace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      ...vi.mocked(useRouter)(),
      replace,
    });
    openTab(null);
    testRender(<Page />, { me: ADMIN_USER });

    // When
    await user.click(screen.getByRole('tab', { name: 'MenuLinks.UseCases' }));

    // Then
    expect(replace).toHaveBeenCalledWith(
      `${SERVICE_CATALOG_PATH}?tab=use-cases`,
      { scroll: false }
    );
  });

  it('should tell a standard user that they are not authorized instead of showing the catalog', () => {
    // Given
    openTab(null);

    // When
    testRender(<Page />, { me: STANDARD_USER });

    // Then
    expect(screen.getByText('Error.YouAreNotAuthorized')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
