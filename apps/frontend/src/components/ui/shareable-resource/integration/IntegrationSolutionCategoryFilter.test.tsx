import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationSolutionCategoryFilter } from './IntegrationSolutionCategoryFilter';

const setSolutionCategoriesMock = vi.fn();

vi.mock('@/components/service/form/UseSolutionCategories', () => ({
  useSolutionCategories: () => [{ id: 'cat-1', name: 'Threat Intelligence' }],
}));

vi.mock(
  '@/components/service/components/ServiceListLocalStorageKeyContext',
  () => ({
    useServiceListLocalStorageKeyContext: () => ({ localStorageKey: 'feeds' }),
  })
);

vi.mock('@/hooks/use-service-list-local-storage', () => ({
  useServiceListLocalStorage: () => ({
    solutionCategories: {},
    setSolutionCategories: setSolutionCategoriesMock,
    removeSolutionCategories: vi.fn(),
  }),
}));

describe('IntegrationSolutionCategoryFilter', () => {
  it('renders solution category subfilters as visible checkboxes', () => {
    testRender(<IntegrationSolutionCategoryFilter />);

    expect(
      screen.getByText(
        'Service.OpenctiIntegrations.Filter.SolutionCategory.Label'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Threat Intelligence' })
    ).toBeInTheDocument();
  });

  it('calls setSolutionCategories when an option is selected', async () => {
    const { user } = testRender(<IntegrationSolutionCategoryFilter />);

    await user.click(
      screen.getByRole('checkbox', { name: 'Threat Intelligence' })
    );

    expect(setSolutionCategoriesMock).toHaveBeenCalledWith({ 'cat-1': [] });
  });

  it('does not render a clickable filter title button', () => {
    testRender(<IntegrationSolutionCategoryFilter />);

    expect(
      screen.queryByRole('button', {
        name: 'Service.OpenctiIntegrations.Filter.SolutionCategory.Placeholder',
      })
    ).not.toBeInTheDocument();
  });
});
