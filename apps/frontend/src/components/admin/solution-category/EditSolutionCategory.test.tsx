import EditSolutionCategory from '@/components/admin/solution-category/EditSolutionCategory';
import { SolutionCategoryFormModel } from '@/components/admin/solution-category/SolutionCategoryForm';
import { mockGraphqlMutation } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  FiligranProduct,
  SolutionCategoryDeleteMutation,
  SolutionCategoryEditMutation,
} from '@graphql/generated';
import { mockSolutionCategory } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';

const GQL_OPERATION_SOLUTION_CATEGORY_EDIT = 'SolutionCategoryEdit';
const GQL_OPERATION_SOLUTION_CATEGORY_DELETE = 'SolutionCategoryDelete';

const solutionCategory: SolutionCategoryFormModel = {
  id: 'solution-category-id',
  name: 'threat hunting',
  product: [FiligranProduct.Opencti],
};

describe('EditSolutionCategory', () => {
  it('should render opened sheet with prefilled values', () => {
    const onClose = vi.fn();

    testRender(
      <EditSolutionCategory
        open={true}
        onClose={onClose}
        solutionCategory={solutionCategory}
      />
    );

    expect(
      screen.getByLabelText('SolutionCategory.Form.Name')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('threat hunting')).toBeInTheDocument();
  });

  it('should call onClose once when Escape closes a clean sheet', async () => {
    // Given
    const onClose = vi.fn();
    const { user } = testRender(
      <EditSolutionCategory
        open={true}
        onClose={onClose}
        solutionCategory={solutionCategory}
      />
    );

    // When
    await user.keyboard('{Escape}');

    // Then
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should submit SolutionCategoryEdit mutation, close sheet and call onClose', async () => {
    const onClose = vi.fn();
    const editSolutionCategoryResponse: SolutionCategoryEditMutation = {
      editSolutionCategory: mockSolutionCategory({
        id: solutionCategory.id,
        name: 'updated solution category',
      }),
    };

    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_SOLUTION_CATEGORY_EDIT,
        data: editSolutionCategoryResponse,
      })
    );

    const { user } = testRender(
      <EditSolutionCategory
        open={true}
        onClose={onClose}
        solutionCategory={solutionCategory}
      />
    );

    const nameInput = screen.getByLabelText(/SolutionCategory.Form.Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'updated solution category');
    await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should submit SolutionCategoryDelete mutation after confirmation and call onClose', async () => {
    const onClose = vi.fn();
    const deleteSolutionCategoryResponse: SolutionCategoryDeleteMutation = {
      deleteSolutionCategory: mockSolutionCategory({
        id: solutionCategory.id,
      }),
    };

    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_SOLUTION_CATEGORY_DELETE,
        data: deleteSolutionCategoryResponse,
      })
    );

    const { user } = testRender(
      <EditSolutionCategory
        open={true}
        onClose={onClose}
        solutionCategory={solutionCategory}
      />
    );

    await user.click(
      screen.getByRole('button', { name: /^MenuActions.Delete$/i })
    );
    await user.click(
      screen.getByRole('button', { name: /^MenuActions.Delete$/i })
    );

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
