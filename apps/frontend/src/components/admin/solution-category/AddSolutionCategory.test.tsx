import AddSolutionCategory from '@/components/admin/solution-category/AddSolutionCategory';
import { mockGraphqlMutation } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { SolutionCategoryAddMutation } from '@graphql/generated';
import { mockSolutionCategory } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';

const GQL_OPERATION_SOLUTION_CATEGORY_ADD = 'SolutionCategoryAdd';

describe('AddSolutionCategory', () => {
  it('should render add trigger and open sheet', async () => {
    const { user } = testRender(<AddSolutionCategory />);

    await user.click(
      screen.getByRole('button', { name: 'SolutionCategory.Actions.Add' })
    );

    expect(
      screen.getByRole('heading', { name: 'SolutionCategory.Actions.Add' })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('SolutionCategory.Form.Name')
    ).toBeInTheDocument();
  });

  it('should submit SolutionCategoryAdd mutation and close sheet on success', async () => {
    const addSolutionCategoryResponse: SolutionCategoryAddMutation = {
      addSolutionCategory: mockSolutionCategory({
        id: 'new-solution-category-id',
        name: 'threat hunting',
      }),
    };

    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_SOLUTION_CATEGORY_ADD,
        data: addSolutionCategoryResponse,
      })
    );

    const { user } = testRender(<AddSolutionCategory />);

    await user.click(
      screen.getByRole('button', { name: 'SolutionCategory.Actions.Add' })
    );
    await user.type(
      screen.getByLabelText(/SolutionCategory.Form.Name/i),
      'Threat Hunting'
    );
    await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

    await waitFor(() => {
      expect(
        screen.queryByLabelText(/SolutionCategory.Form.Name/i)
      ).not.toBeInTheDocument();
    });
  });

  it('should keep sheet open when SolutionCategoryAdd returns a GraphQL error', async () => {
    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_SOLUTION_CATEGORY_ADD,
        errors: [{ message: 'UNKNOWN_ERROR' }],
      })
    );

    const { user } = testRender(<AddSolutionCategory />);

    await user.click(
      screen.getByRole('button', { name: 'SolutionCategory.Actions.Add' })
    );
    await user.type(
      screen.getByLabelText(/SolutionCategory.Form.Name/i),
      'Threat Hunting'
    );
    await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

    expect(
      await screen.findByLabelText(/SolutionCategory.Form.Name/i)
    ).toBeInTheDocument();
  });

  it('should close the sheet when the admin cancels the creation', async () => {
    // Given
    const { user } = testRender(<AddSolutionCategory />);
    await user.click(
      screen.getByRole('button', { name: 'SolutionCategory.Actions.Add' })
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    await waitFor(() => {
      expect(
        screen.queryByLabelText('SolutionCategory.Form.Name')
      ).not.toBeInTheDocument();
    });
  });
});
