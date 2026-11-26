import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationSolutionCategoryFilter } from './IntegrationSolutionCategoryFilter';

const setSolutionCategoriesMock = vi.fn();

const { CATEGORY_NAME } = vi.hoisted(() => ({
  CATEGORY_NAME: 'Threat Intelligence',
}));

vi.mock('@/components/service/form/UseSolutionCategories', () => ({
  useSolutionCategories: () => [{ id: 'cat-1', name: CATEGORY_NAME }],
}));

vi.mock('@/components/service/components/ServiceListStorageKeyContext', () => ({
  useServiceListStorageKeyContext: () => ({ storageKey: 'feeds' }),
}));

vi.mock('@/hooks/use-service-list-storage', () => ({
  useServiceListStorage: () => ({
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

  it('should send the name of the solution category when it is checked', async () => {
    // Given
    startAnalytics();
    const { user } = testRender(<IntegrationSolutionCategoryFilter />);

    // When
    await user.click(screen.getByRole('checkbox', { name: CATEGORY_NAME }));

    // Then
    expect(readTrackedEvents('filter_apply')).toEqual([
      {
        filter_name: 'Solution category',
        filter_value: CATEGORY_NAME,
        filter_action: 'Add',
        library: 'Integrations',
        product: 'OpenCTI',
      },
    ]);
  });
});
