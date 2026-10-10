import EditUseCase from '@/components/admin/use-case/EditUseCase';
import { UseCaseFormModel } from '@/components/admin/use-case/UseCaseForm';
import { mockGraphqlMutation } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { UseCaseDeleteMutation, UseCaseEditMutation } from '@graphql/generated';
import { mockUseCase } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { useState } from 'react';

const mocks = vi.hoisted(() => ({
  showSnackbar: vi.fn(),
}));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: mocks.showSnackbar,
}));

const GQL_OPERATION_USE_CASE_EDIT = 'UseCaseEdit';
const GQL_OPERATION_USE_CASE_DELETE = 'UseCaseDelete';

const useCase: UseCaseFormModel = {
  id: 'use-case-id',
  name: 'Threat hunting',
  color: '#123456',
};

describe('EditUseCase', () => {
  beforeEach(() => {
    mocks.showSnackbar.mockReset();
  });

  it('should render opened sheet with prefilled values', () => {
    const onClose = vi.fn();

    testRender(
      <EditUseCase
        open={true}
        onClose={onClose}
        useCase={useCase}
      />
    );

    // Then
    expect(screen.getByLabelText('UseCaseForm.Name')).toBeTruthy();
    expect(screen.getByDisplayValue('Threat hunting')).toBeTruthy();
  });

  it('should submit UseCaseEdit mutation, close sheet and call onClose', async () => {
    const onClose = vi.fn();
    const editUseCaseResponse: UseCaseEditMutation = {
      editUseCase: mockUseCase({
        id: useCase.id,
        name: 'Updated UseCase',
        color: '#123456',
      }),
    };

    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_USE_CASE_EDIT,
        data: editUseCaseResponse,
      })
    );

    const { user } = testRender(
      <EditUseCase
        open={true}
        onClose={onClose}
        useCase={useCase}
      />
    );

    const nameInput = screen.getByLabelText(/UseCaseForm.Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated UseCase');
    await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onClose once when Escape closes a clean sheet', async () => {
    // Given
    const onClose = vi.fn();
    const { user } = testRender(
      <EditUseCase
        open={true}
        onClose={onClose}
        useCase={useCase}
      />
    );

    // When
    await user.keyboard('{Escape}');

    // Then
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose again when a save completes after the sheet was closed', async () => {
    // Given a save still waiting for the server
    const onClose = vi.fn();
    const saveReceived = vi.fn();
    let answerSave = () => {};
    const saveAnswered = new Promise<void>((resolve) => {
      answerSave = resolve;
    });
    const editUseCaseResponse: UseCaseEditMutation = {
      editUseCase: mockUseCase({ id: useCase.id, name: 'Updated UseCase' }),
    };
    mswServer.use(
      graphql.mutation(GQL_OPERATION_USE_CASE_EDIT, async () => {
        saveReceived();
        await saveAnswered;
        return HttpResponse.json({ data: editUseCaseResponse });
      })
    );
    // Like the list, the parent unmounts the sheet as soon as it closes
    const Parent = () => {
      const [isEditing, setIsEditing] = useState(true);
      const handleClose = () => {
        onClose();
        setIsEditing(false);
      };
      return isEditing ? (
        <EditUseCase
          open={true}
          onClose={handleClose}
          useCase={useCase}
        />
      ) : null;
    };
    const { user } = testRender(<Parent />);
    const nameInput = screen.getByLabelText(/UseCaseForm.Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated UseCase');
    await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));
    await waitFor(() => expect(saveReceived).toHaveBeenCalledTimes(1));

    // When the sheet is closed, then the save completes
    await user.click(screen.getByRole('button', { name: 'Close' }));
    answerSave();
    await waitFor(() =>
      expect(mocks.showSnackbar).toHaveBeenCalledWith({
        severity: 'success',
        title: 'Utils.Success',
      })
    );

    // Then only the close notified the parent
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should submit UseCaseDelete mutation after confirmation and call onClose', async () => {
    const onClose = vi.fn();
    const deleteUseCaseResponse: UseCaseDeleteMutation = {
      deleteUseCase: mockUseCase({
        id: useCase.id,
      }),
    };

    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_USE_CASE_DELETE,
        data: deleteUseCaseResponse,
      })
    );

    const { user } = testRender(
      <EditUseCase
        open={true}
        onClose={onClose}
        useCase={useCase}
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
