import { ReachSalesDialogForm } from '@/components/service/trial-instances/reach-sales/ReachSalesDialogForm';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const MESSAGE_LABEL = 'Service.Trials.ReachOutToSalesMessageLabel';
const SUBMIT_LABEL = 'Service.Trials.ReachOutToSales';
const MESSAGE = 'We would like to extend our trial';
const BLANK_MESSAGE = '   ';

const renderForm = ({
  setIsDialogOpen = vi.fn(),
  onSubmit = vi.fn(),
}: {
  setIsDialogOpen?: (isOpen: boolean) => void;
  onSubmit?: (message: string) => void;
} = {}) =>
  testRender(
    <ReachSalesDialogForm
      isDialogOpen={true}
      setIsDialogOpen={setIsDialogOpen}
      onSubmit={onSubmit}
    />
  );

describe('ReachSalesDialogForm', () => {
  it('should close the dialog when the user clicks cancel', async () => {
    // Given
    const setIsDialogOpen = vi.fn();
    const { user } = renderForm({ setIsDialogOpen });

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    expect(setIsDialogOpen).toHaveBeenCalledWith(false);
  });

  it('should send the message when the user submits it', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = renderForm({ onSubmit });
    await user.type(
      screen.getByRole('textbox', { name: MESSAGE_LABEL }),
      MESSAGE
    );

    // When
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    // Then
    expect(onSubmit).toHaveBeenCalledWith(MESSAGE);
  });

  it('should not send the message when it only holds spaces', async () => {
    // Given
    const onSubmit = vi.fn();
    const { user } = renderForm({ onSubmit });
    await user.type(
      screen.getByRole('textbox', { name: MESSAGE_LABEL }),
      BLANK_MESSAGE
    );

    // When
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    // Then
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
