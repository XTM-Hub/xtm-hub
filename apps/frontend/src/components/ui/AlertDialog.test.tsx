import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AlertDialogComponent } from './AlertDialog';

const TRIGGER_LABEL = 'Open';
const TITLE = 'Delete the item';
const DESCRIPTION = 'This cannot be undone.';
const ACTION_LABEL = 'Delete';
const BODY = 'The item will be removed.';

interface RenderAlertDialogOptions {
  onClickContinue?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  displayCancelButton?: boolean;
  description?: string;
}

const renderAlertDialog = ({
  onClickContinue = vi.fn(),
  displayCancelButton,
  description,
}: RenderAlertDialogOptions = {}) =>
  testRender(
    <AlertDialogComponent
      triggerElement={<button type="button">{TRIGGER_LABEL}</button>}
      AlertTitle={TITLE}
      description={description}
      actionButtonText={ACTION_LABEL}
      displayCancelButton={displayCancelButton}
      onClickContinue={onClickContinue}>
      {BODY}
    </AlertDialogComponent>
  );

const openDialog = async (user: ReturnType<typeof testRender>['user']) => {
  await user.click(screen.getByRole('button', { name: TRIGGER_LABEL }));
  return screen.findByRole('alertdialog', { name: TITLE });
};

describe('AlertDialogComponent', () => {
  it('should open an alertdialog named by its title when the trigger is clicked', async () => {
    // Given
    const { user } = renderAlertDialog();

    // When
    await user.click(screen.getByRole('button', { name: TRIGGER_LABEL }));

    // Then
    expect(
      await screen.findByRole('alertdialog', { name: TITLE })
    ).toHaveTextContent(BODY);
  });

  it('should describe the alertdialog with the description when one is set', async () => {
    // Given
    const { user } = renderAlertDialog({ description: DESCRIPTION });

    // When
    const dialog = await openDialog(user);

    // Then
    expect(dialog).toHaveAccessibleDescription(DESCRIPTION);
  });

  it('should leave the alertdialog without aria-describedby when no description is set', async () => {
    // Given
    const { user } = renderAlertDialog();

    // When
    const dialog = await openDialog(user);

    // Then
    expect(dialog).not.toHaveAttribute('aria-describedby');
  });

  it('should close when Cancel is clicked', async () => {
    // Given
    const { user } = renderAlertDialog();
    await openDialog(user);

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    );
  });

  it('should call onClickContinue and close when the action is clicked', async () => {
    // Given
    const onClickContinue = vi.fn();
    const { user } = renderAlertDialog({ onClickContinue });
    await openDialog(user);

    // When
    await user.click(screen.getByRole('button', { name: ACTION_LABEL }));

    // Then
    expect(onClickContinue).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    );
  });

  it('should stay open when the action prevents the default', async () => {
    // Given
    const onClickContinue = vi.fn((e: React.MouseEvent<HTMLButtonElement>) =>
      e.preventDefault()
    );
    const { user } = renderAlertDialog({ onClickContinue });
    await openDialog(user);

    // When
    await user.click(screen.getByRole('button', { name: ACTION_LABEL }));

    // Then
    expect(onClickContinue).toHaveBeenCalledOnce();
    expect(screen.getByRole('alertdialog', { name: TITLE })).toHaveAttribute(
      'data-state',
      'open'
    );
  });

  it('should stay open on a click outside the dialog', async () => {
    // Given
    renderAlertDialog();
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

  it('should hide the corner close icon when Cancel shows by default', async () => {
    // Given
    const { user } = renderAlertDialog();

    // When
    await openDialog(user);

    // Then
    expect(
      screen.queryByRole('button', { name: 'Close' })
    ).not.toBeInTheDocument();
  });

  it('should show the corner close icon when Cancel is hidden', async () => {
    // Given
    const { user } = renderAlertDialog({ displayCancelButton: false });

    // When
    await openDialog(user);

    // Then
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
