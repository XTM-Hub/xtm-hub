import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import userEvent, {
  PointerEventsCheckLevel,
  type UserEvent,
} from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  SheetWithPreventingDialog,
  useDialogContext,
} from './SheetWithPreventingDialog';

const TITLE = 'Add user';
const EDIT_LABEL = 'Edit a field';
const PREVENT_TITLE = 'DialogActions.PreventSheetTitle';

const EditButton = () => {
  const { setIsDirty } = useDialogContext();
  return (
    <button
      type="button"
      onClick={() => setIsDirty(true)}>
      {EDIT_LABEL}
    </button>
  );
};

const renderSheet = () => {
  const setOpen = vi.fn();
  testRender(
    <SheetWithPreventingDialog
      open
      setOpen={setOpen}
      title={TITLE}>
      <EditButton />
    </SheetWithPreventingDialog>
  );
  // The open modal sets pointer-events: none on the body, which user-event would refuse to click through.
  const user = userEvent.setup({
    pointerEventsCheck: PointerEventsCheckLevel.Never,
  });
  return { setOpen, user };
};

const pressEscape = (user: UserEvent) => user.keyboard('{Escape}');

const pressOutside = (user: UserEvent) =>
  user.click(
    screen.getByRole('dialog', { name: TITLE })
      .previousElementSibling as Element
  );

describe('SheetWithPreventingDialog', () => {
  it.each<[string, (user: UserEvent) => Promise<void>]>([
    ['Escape is pressed', pressEscape],
    ['an outside press happens', pressOutside],
  ])(
    'should close the sheet when %s on a clean form',
    async (_gesture, close) => {
      // Given
      const { setOpen, user } = renderSheet();

      // When
      await close(user);

      // Then
      expect(setOpen).toHaveBeenCalledWith(false);
      expect(
        screen.queryByRole('alertdialog', { name: PREVENT_TITLE })
      ).not.toBeInTheDocument();
    }
  );

  it.each<[string, (user: UserEvent) => Promise<void>]>([
    ['Escape is pressed', pressEscape],
    ['an outside press happens', pressOutside],
  ])(
    'should ask before closing when %s on a dirty form',
    async (_gesture, close) => {
      // Given
      const { setOpen, user } = renderSheet();
      await user.click(screen.getByRole('button', { name: EDIT_LABEL }));

      // When
      await close(user);

      // Then
      expect(
        await screen.findByRole('alertdialog', { name: PREVENT_TITLE })
      ).toBeInTheDocument();
      expect(setOpen).not.toHaveBeenCalled();
    }
  );
});
