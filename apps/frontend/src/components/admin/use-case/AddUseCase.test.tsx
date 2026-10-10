import AddUseCase from '@/components/admin/use-case/AddUseCase';
import { mockGraphqlMutation } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { UseCaseAddMutation } from '@graphql/generated';
import { mockUseCase } from '@graphql/mocks';
import { fireEvent, screen, waitFor } from '@testing-library/react';

const GQL_OPERATION_USE_CASE_ADD = 'UseCaseAdd';

describe('AddUseCase', () => {
  it('should render add trigger and open sheet', async () => {
    const { user } = testRender(<AddUseCase />);

    // Given
    const addButton = screen.getByRole('button', {
      name: 'UseCaseActions.AddUseCase',
    });

    // When
    await user.click(addButton);

    // Then
    expect(
      screen.getByRole('heading', { name: 'UseCaseActions.AddUseCase' })
    ).toBeTruthy();
    expect(screen.getByLabelText('UseCaseForm.Name')).toBeTruthy();
  });

  it('should submit UseCaseAdd mutation and close sheet on success', async () => {
    const addUseCaseResponse: UseCaseAddMutation = {
      addUseCase: mockUseCase({
        id: 'new-use-case-id',
        name: 'threat hunting',
        color: '#11aa22',
      }),
    };

    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_USE_CASE_ADD,
        data: addUseCaseResponse,
      })
    );

    const { user } = testRender(<AddUseCase />);

    await user.click(
      screen.getByRole('button', { name: 'UseCaseActions.AddUseCase' })
    );

    const colorInput = screen.getByRole('textbox', {
      name: 'UseCaseForm.Color',
    });
    await user.type(
      screen.getByLabelText(/UseCaseForm.Name/i),
      'Threat Hunting'
    );
    fireEvent.change(colorInput, { target: { value: '#11aa22' } });
    await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

    await waitFor(() => {
      expect(
        screen.queryByLabelText(/UseCaseForm.Name/i)
      ).not.toBeInTheDocument();
    });
  });

  it('should keep sheet open when UseCaseAdd returns a GraphQL error', async () => {
    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_USE_CASE_ADD,
        errors: [{ message: 'UNKNOWN_ERROR' }],
      })
    );

    const { user } = testRender(<AddUseCase />);

    await user.click(
      screen.getByRole('button', { name: 'UseCaseActions.AddUseCase' })
    );

    const colorInput = screen.getByRole('textbox', {
      name: 'UseCaseForm.Color',
    });
    await user.type(
      screen.getByLabelText(/UseCaseForm.Name/i),
      'Threat Hunting'
    );
    fireEvent.change(colorInput, { target: { value: '#11aa22' } });
    await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

    expect(
      await screen.findByLabelText(/UseCaseForm.Name/i)
    ).toBeInTheDocument();
  });
});
