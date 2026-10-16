import { ReachSalesDialogForm } from '@/components/service/trial-instances/reach-sales/ReachSalesDialogForm';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const MESSAGE_LABEL = 'Service.Trials.ReachOutToSalesMessageLabel';
const SUBMIT_LABEL = 'Service.Trials.ReachOutToSales';
const BLANK_MESSAGE = '   ';

const renderForm = (setIsDialogOpen = vi.fn()) =>
  testRender(
    <ReachSalesDialogForm
      isDialogOpen={true}
      setIsDialogOpen={setIsDialogOpen}
      onSubmit={vi.fn()}
    />
  );

describe('ReachSalesDialogForm', () => {
  it('should close the dialog when the user clicks cancel', async () => {
    // Given
    const setIsDialogOpen = vi.fn();
    const { user } = renderForm(setIsDialogOpen);

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    expect(setIsDialogOpen).toHaveBeenCalledWith(false);
  });

  it('should keep the submit button disabled when the message only holds spaces', async () => {
    // Given
    const { user } = renderForm();

    // When
    await user.type(
      screen.getByRole('textbox', { name: MESSAGE_LABEL }),
      BLANK_MESSAGE
    );

    // Then
    expect(screen.getByRole('button', { name: SUBMIT_LABEL })).toBeDisabled();
  });
});
