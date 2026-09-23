import { ExitEditModeDialog } from '@/components/content-translation/ExitEditModeDialog';
import { EditModeProvider } from '@/context/edit-mode-context';
import setContentEditModeAction from '@/utils/actions/content-edit-mode.actions';
import revalidateContentTranslationsAction from '@/utils/actions/revalidate-content-translations.actions';
import testRender from '@/utils/test/test-render';
import {
  useDiscardContentTranslationDraftsMutation,
  usePublishContentTranslationDraftsMutation,
} from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  usePublishContentTranslationDraftsMutation: vi.fn(),
  useDiscardContentTranslationDraftsMutation: vi.fn(),
}));
vi.mock('@/utils/actions/content-edit-mode.actions', () => ({
  default: vi.fn(),
}));
vi.mock('@/utils/actions/revalidate-content-translations.actions', () => ({
  default: vi.fn(),
}));

const KEEP_LABEL = 'EditableText.KeepDraftsAndExit';
const DISCARD_LABEL = 'EditableText.DiscardAndExit';
const PUBLISH_LABEL = 'EditableText.PublishAndExit';

const publish = vi.fn();
const discard = vi.fn();

// Only the fields the dialog reads: the full mutation result is not needed.
const mockMutation = (mutateAsync: typeof publish) =>
  ({ mutateAsync, isPending: false }) as unknown as ReturnType<
    typeof usePublishContentTranslationDraftsMutation
  >;

const renderDialog = () =>
  testRender(
    <EditModeProvider
      canEditContent
      isEditMode
      pendingChangeCount={2}>
      <ExitEditModeDialog
        open
        onOpenChange={vi.fn()}
      />
    </EditModeProvider>
  );

describe('ExitEditModeDialog', () => {
  beforeEach(() => {
    publish.mockResolvedValue({});
    discard.mockResolvedValue({});
    vi.mocked(usePublishContentTranslationDraftsMutation).mockReturnValue(
      mockMutation(publish)
    );
    vi.mocked(useDiscardContentTranslationDraftsMutation).mockReturnValue(
      mockMutation(discard)
    );
    vi.mocked(setContentEditModeAction).mockResolvedValue(undefined);
    vi.mocked(revalidateContentTranslationsAction).mockResolvedValue(undefined);
  });

  it.each([[KEEP_LABEL], [DISCARD_LABEL], [PUBLISH_LABEL]])(
    'should leave edit mode when choosing %s',
    async (label) => {
      // Given
      renderDialog();

      // When
      await userEvent.click(screen.getByRole('button', { name: label }));

      // Then
      await waitFor(() =>
        expect(setContentEditModeAction).toHaveBeenCalledWith(false)
      );
    }
  );

  it.each([
    ['publish', PUBLISH_LABEL, publish],
    ['discard', DISCARD_LABEL, discard],
  ])(
    'should %s the drafts when choosing the matching exit',
    async (_label, buttonLabel, mutation) => {
      // Given
      renderDialog();

      // When
      await userEvent.click(screen.getByRole('button', { name: buttonLabel }));

      // Then
      expect(mutation).toHaveBeenCalled();
    }
  );

  it('should leave the drafts untouched when keeping them', async () => {
    // Given
    renderDialog();

    // When
    await userEvent.click(screen.getByRole('button', { name: KEEP_LABEL }));

    // Then
    expect([...publish.mock.calls, ...discard.mock.calls]).toEqual([]);
  });

  it('should stay in edit mode when publishing fails', async () => {
    // Given
    publish.mockRejectedValue(new Error('publish failed'));
    renderDialog();

    // When
    await userEvent.click(screen.getByRole('button', { name: PUBLISH_LABEL }));

    // Then
    expect(setContentEditModeAction).not.toHaveBeenCalled();
  });
});
