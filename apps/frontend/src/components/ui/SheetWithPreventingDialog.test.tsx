import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import userEvent, {
  PointerEventsCheckLevel,
  type UserEvent,
} from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  SheetWithPreventingDialog,
  useDialogContext,
} from './SheetWithPreventingDialog';

const TITLE = 'Add user';
const EDIT_LABEL = 'Edit a field';
const UPLOAD_LABEL = 'Touch an upload';
const PREVENT_TITLE = 'DialogActions.PreventSheetTitle';
const CLOSE_LABEL = 'Utils.Close';
const BADGE_LABEL = 'Status badge';

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

const UploadButton = () => {
  const { setUploadsDirty } = useDialogContext();
  return (
    <button
      type="button"
      onClick={() => setUploadsDirty(true)}>
      {UPLOAD_LABEL}
    </button>
  );
};

const renderSheet = (children: ReactNode = <EditButton />) => {
  const setOpen = vi.fn();
  testRender(
    <SheetWithPreventingDialog
      open
      setOpen={setOpen}
      title={TITLE}>
      {children}
    </SheetWithPreventingDialog>
  );
  // The open modal sets pointer-events: none on the body, which user-event would refuse to click through.
  const user = userEvent.setup({
    pointerEventsCheck: PointerEventsCheckLevel.Never,
  });
  return { setOpen, user };
};

const pressCross = (user: UserEvent) =>
  user.click(screen.getByRole('button', { name: CLOSE_LABEL }));

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
    ['the cross is clicked', pressCross],
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
    ['the cross is clicked', pressCross],
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

  it('should close the sheet when the user confirms the dialog after clicking the cross on a dirty form', async () => {
    // Given
    const { setOpen, user } = renderSheet();
    await user.click(screen.getByRole('button', { name: EDIT_LABEL }));
    await pressCross(user);

    // When
    await user.click(
      await screen.findByRole('button', { name: 'MenuActions.Continue' })
    );

    // Then
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('should ask before closing when an upload was touched and the form itself is clean', async () => {
    // Given
    const { setOpen, user } = renderSheet(<UploadButton />);
    await user.click(screen.getByRole('button', { name: UPLOAD_LABEL }));

    // When
    await pressCross(user);

    // Then
    expect(
      await screen.findByRole('alertdialog', { name: PREVENT_TITLE })
    ).toBeInTheDocument();
    expect(setOpen).not.toHaveBeenCalled();
  });

  it('should show the title badge next to the title when one is given', () => {
    // Given a sheet with a title badge

    // When
    testRender(
      <SheetWithPreventingDialog
        open
        setOpen={vi.fn()}
        title={TITLE}
        titleBadge={<span>{BADGE_LABEL}</span>}>
        <EditButton />
      </SheetWithPreventingDialog>
    );

    // Then
    expect(screen.getByText(BADGE_LABEL)).toBeInTheDocument();
  });
});
