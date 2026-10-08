import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { MouseEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

const TRIGGER_LABEL = 'Open';
const TITLE = 'Delete the item';
const DESCRIPTION = 'This cannot be undone.';
const CONFIRM_LABEL = 'Delete';
const BODY = 'The item will be removed.';

interface RenderConfirmDialogOptions {
  onConfirm?: (e: MouseEvent<HTMLButtonElement>) => void;
  hideCancelButton?: boolean;
  description?: string;
  confirmDisabled?: boolean;
}

const renderConfirmDialog = ({
  onConfirm = vi.fn(),
  hideCancelButton,
  description,
  confirmDisabled,
}: RenderConfirmDialogOptions = {}) =>
  testRender(
    <ConfirmDialog
      trigger={<button type="button">{TRIGGER_LABEL}</button>}
      title={TITLE}
      description={description}
      confirmLabel={CONFIRM_LABEL}
      confirmDisabled={confirmDisabled}
      hideCancelButton={hideCancelButton}
      onConfirm={onConfirm}>
      {BODY}
    </ConfirmDialog>
  );

const openDialog = async (user: ReturnType<typeof testRender>['user']) => {
  await user.click(screen.getByRole('button', { name: TRIGGER_LABEL }));
  return screen.findByRole('alertdialog', { name: TITLE });
};

describe('ConfirmDialog', () => {
  it('should open an alertdialog named by its title when the trigger is clicked', async () => {
    // Given
    const { user } = renderConfirmDialog();

    // When
    await user.click(screen.getByRole('button', { name: TRIGGER_LABEL }));

    // Then
    expect(
      await screen.findByRole('alertdialog', { name: TITLE })
    ).toHaveTextContent(BODY);
  });

  it('should open from the open prop without a trigger', async () => {
    // Given / When
    testRender(
      <ConfirmDialog
        open
        title={TITLE}
        confirmLabel={CONFIRM_LABEL}
        onConfirm={vi.fn()}
      />
    );

    // Then
    expect(
      await screen.findByRole('alertdialog', { name: TITLE })
    ).toBeInTheDocument();
  });

  it('should describe the alertdialog with the description when one is set', async () => {
    // Given
    const { user } = renderConfirmDialog({ description: DESCRIPTION });

    // When
    const dialog = await openDialog(user);

    // Then
    expect(dialog).toHaveAccessibleDescription(DESCRIPTION);
  });

  it('should leave the alertdialog without aria-describedby when no description is set', async () => {
    // Given
    const { user } = renderConfirmDialog();

    // When
    const dialog = await openDialog(user);

    // Then
    expect(dialog).not.toHaveAttribute('aria-describedby');
  });

  it('should close when Cancel is clicked', async () => {
    // Given
    const { user } = renderConfirmDialog();
    await openDialog(user);

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    );
  });

  it('should call onConfirm and close when the confirm button is clicked', async () => {
    // Given
    const onConfirm = vi.fn();
    const { user } = renderConfirmDialog({ onConfirm });
    await openDialog(user);

    // When
    await user.click(screen.getByRole('button', { name: CONFIRM_LABEL }));

    // Then
    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    );
  });

  it('should stay open when onConfirm prevents the default', async () => {
    // Given
    const onConfirm = vi.fn((e: MouseEvent<HTMLButtonElement>) =>
      e.preventDefault()
    );
    const { user } = renderConfirmDialog({ onConfirm });
    await openDialog(user);

    // When
    await user.click(screen.getByRole('button', { name: CONFIRM_LABEL }));

    // Then
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole('alertdialog', { name: TITLE })).toHaveAttribute(
      'data-state',
      'open'
    );
  });

  it('should disable the confirm button when confirmDisabled is set', async () => {
    // Given
    const { user } = renderConfirmDialog({ confirmDisabled: true });

    // When
    await openDialog(user);

    // Then
    expect(screen.getByRole('button', { name: CONFIRM_LABEL })).toBeDisabled();
  });

  it('should stay open on a click outside the dialog', async () => {
    // Given
    renderConfirmDialog();
    // The open modal sets pointer-events: none on the body, which user-event would refuse to click through.
    const user = userEvent.setup({
      pointerEventsCheck: PointerEventsCheckLevel.Never,
    });
    await openDialog(user);

    // When
    await user.click(document.body);

    // Then
    expect(screen.getByRole('alertdialog', { name: TITLE })).toHaveAttribute(
      'data-state',
      'open'
    );
  });

  it('should hide the corner close icon when Cancel shows', async () => {
    // Given
    const { user } = renderConfirmDialog();

    // When
    await openDialog(user);

    // Then
    expect(
      screen.queryByRole('button', { name: 'Close' })
    ).not.toBeInTheDocument();
  });

  it('should show the corner close icon instead of Cancel when Cancel is hidden', async () => {
    // Given
    const { user } = renderConfirmDialog({ hideCancelButton: true });

    // When
    await openDialog(user);

    // Then
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Utils.Cancel' })
    ).not.toBeInTheDocument();
  });

  it('should label Cancel with cancelLabel when one is set', async () => {
    // Given / When
    testRender(
      <ConfirmDialog
        open
        title={TITLE}
        confirmLabel={CONFIRM_LABEL}
        cancelLabel="Keep"
        onConfirm={vi.fn()}
      />
    );

    // Then
    expect(
      await screen.findByRole('button', { name: 'Keep' })
    ).toBeInTheDocument();
  });
});
