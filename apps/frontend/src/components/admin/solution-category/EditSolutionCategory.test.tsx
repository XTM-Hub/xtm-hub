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
import { screen, waitFor, within } from '@testing-library/react';

const GQL_OPERATION_SOLUTION_CATEGORY_EDIT = 'SolutionCategoryEdit';
const GQL_OPERATION_SOLUTION_CATEGORY_DELETE = 'SolutionCategoryDelete';

const SERVER_ERROR = 'SOLUTION_CATEGORY_NOT_FOUND';

type User = ReturnType<typeof testRender>['user'];
type EditSolutionCategoryModule =
  typeof import('@/components/admin/solution-category/EditSolutionCategory');
type AppSnackbarsModule =
  typeof import('@/components/ui/snackbar/AppSnackbars');

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

  it('should call onClose when the admin cancels the edition', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The snackbar messages live at module level: a fresh module per test keeps
  // one test's messages out of the next.
  describe('server errors', () => {
    let FreshEditSolutionCategory: EditSolutionCategoryModule['default'];
    let AppSnackbars: AppSnackbarsModule['AppSnackbars'];

    beforeEach(async () => {
      vi.resetModules();
      ({ default: FreshEditSolutionCategory } =
        await import('@/components/admin/solution-category/EditSolutionCategory'));
      ({ AppSnackbars } =
        await import('@/components/ui/snackbar/AppSnackbars'));
    });

    it.each([
      {
        action: 'edition',
        operation: GQL_OPERATION_SOLUTION_CATEGORY_EDIT,
        perform: async (user: User) => {
          await user.type(
            screen.getByLabelText(/SolutionCategory.Form.Name/i),
            ' v2'
          );
          await user.click(
            screen.getByRole('button', { name: /Utils.Validate/i })
          );
        },
      },
      {
        action: 'deletion',
        operation: GQL_OPERATION_SOLUTION_CATEGORY_DELETE,
        perform: async (user: User) => {
          await user.click(
            screen.getByRole('button', { name: 'MenuActions.Delete' })
          );
          const dialog = await screen.findByRole('alertdialog');
          await user.click(
            within(dialog).getByRole('button', { name: 'MenuActions.Delete' })
          );
        },
      },
    ])(
      'should show the server error when the $action is rejected',
      async ({ operation, perform }) => {
        // Given
        mswServer.use(
          mockGraphqlMutation({
            queryName: operation,
            errors: [{ message: SERVER_ERROR }],
          })
        );
        const { user } = testRender(
          <AppSnackbars>
            <FreshEditSolutionCategory
              open={true}
              onClose={vi.fn()}
              solutionCategory={solutionCategory}
            />
          </AppSnackbars>
        );

        // When
        await perform(user);

        // Then
        expect(
          await screen.findByText(`Error.Server.${SERVER_ERROR}`)
        ).toBeInTheDocument();
      }
    );
  });
});
