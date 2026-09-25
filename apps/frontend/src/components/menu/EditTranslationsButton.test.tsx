import { EditTranslationsButton } from '@/components/menu/EditTranslationsButton';
import { EditModeProvider } from '@/context/edit-mode-context';
import setContentEditModeAction from '@/utils/actions/content-edit-mode.actions';
import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/actions/content-edit-mode.actions', () => ({
  default: vi.fn(),
}));

const EDIT_LABEL = 'MenuButton';
const EXIT_LABEL = 'MenuButtonExit';

const renderButton = ({
  canEditContent,
  isEditMode,
  pendingChangeCount = 0,
}: {
  canEditContent: boolean;
  isEditMode: boolean;
  pendingChangeCount?: number;
}) =>
  testRender(
    <EditModeProvider
      canEditContent={canEditContent}
      isEditMode={isEditMode}
      pendingChangeCount={pendingChangeCount}
      overriddenKeys={[]}>
      <EditTranslationsButton open />
    </EditModeProvider>
  );

describe('EditTranslationsButton', () => {
  const refresh = vi.fn();

  beforeEach(() => {
    vi.mocked(setContentEditModeAction).mockResolvedValue(undefined);
    vi.mocked(useRouter).mockReturnValue({ ...useRouter(), refresh });
  });

  it('should not render when the user cannot edit content', () => {
    // Given
    renderButton({ canEditContent: false, isEditMode: false });

    // When
    const button = screen.queryByRole('button', { name: EDIT_LABEL });

    // Then
    expect(button).not.toBeInTheDocument();
  });

  it.each([
    ['on', false, EDIT_LABEL, true],
    ['off', true, EXIT_LABEL, false],
  ])(
    'should turn edit mode %s when clicked',
    async (_label, isEditMode, buttonLabel, expectedEnabled) => {
      // Given
      renderButton({ canEditContent: true, isEditMode });

      // When
      await userEvent.click(screen.getByRole('button', { name: buttonLabel }));

      // Then
      expect(setContentEditModeAction).toHaveBeenCalledWith(expectedEnabled);
    }
  );

  it('should re-render the route once the edit mode cookie changed', async () => {
    // Given
    renderButton({ canEditContent: true, isEditMode: false });

    // When
    await userEvent.click(screen.getByRole('button', { name: EDIT_LABEL }));

    // Then
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it.each([
    ['off', false, EDIT_LABEL],
    ['on', true, EXIT_LABEL],
  ])(
    'should be labelled for the next action when edit mode is %s',
    (_label, isEditMode, expectedLabel) => {
      // Given
      renderButton({ canEditContent: true, isEditMode });

      // When
      const button = screen.queryByRole('button', { name: expectedLabel });

      // Then
      expect(button).toBeInTheDocument();
    }
  );

  it('should ask what to do with drafts instead of leaving when changes are pending', async () => {
    // Given
    renderButton({
      canEditContent: true,
      isEditMode: true,
      pendingChangeCount: 2,
    });

    // When
    await userEvent.click(screen.getByRole('button', { name: EXIT_LABEL }));

    // Then
    expect(
      await screen.findByRole('alertdialog', {
        name: 'EditableText.ExitDialogTitle',
      })
    ).toBeInTheDocument();
  });

  it('should not leave edit mode right away when changes are pending', async () => {
    // Given
    renderButton({
      canEditContent: true,
      isEditMode: true,
      pendingChangeCount: 2,
    });

    // When
    await userEvent.click(screen.getByRole('button', { name: EXIT_LABEL }));

    // Then
    expect(setContentEditModeAction).not.toHaveBeenCalled();
  });
});
