import { EditionModeBanner } from '@/components/content-translation/EditionModeBanner';
import { EditModeProvider } from '@/context/edit-mode-context';
import revalidateContentTranslationsAction from '@/utils/actions/revalidate-content-translations.actions';
import testRender from '@/utils/test/test-render';
import {
  useDiscardContentTranslationDraftsMutation,
  usePublishContentTranslationDraftsMutation,
} from '@graphql/generated';
import { screen, waitFor, within } from '@testing-library/react';
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

const PUBLISH_LABEL = 'EditableText.Publish';
const DISCARD_LABEL = 'EditableText.Discard';
const PENDING_LABEL = 'EditableText.PendingChanges';
const TOGGLE_LABEL = 'EditableText.ShowEditableAreas';

const publish = vi.fn();
const discard = vi.fn();

// Only the fields the banner reads: the full mutation result is not needed.
const mockMutation = (mutateAsync: typeof publish) =>
  ({ mutateAsync, isPending: false }) as unknown as ReturnType<
    typeof usePublishContentTranslationDraftsMutation
  >;

const renderBanner = (pendingChangeCount: number) =>
  testRender(
    <EditModeProvider
      canEditContent
      isEditMode
      pendingChangeCount={pendingChangeCount}>
      <EditionModeBanner />
    </EditModeProvider>
  );

describe('EditionModeBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    publish.mockResolvedValue({});
    discard.mockResolvedValue({});
    vi.mocked(usePublishContentTranslationDraftsMutation).mockReturnValue(
      mockMutation(publish)
    );
    vi.mocked(useDiscardContentTranslationDraftsMutation).mockReturnValue(
      mockMutation(discard)
    );
    vi.mocked(revalidateContentTranslationsAction).mockResolvedValue(undefined);
  });

  it('should not offer to publish when no change is pending', () => {
    // Given
    renderBanner(0);

    // When
    const publishButton = screen.queryByRole('button', { name: PUBLISH_LABEL });

    // Then
    expect(publishButton).not.toBeInTheDocument();
  });

  it('should show the pending changes when drafts exist', () => {
    // Given
    renderBanner(2);

    // When
    const pending = screen.queryByText(PENDING_LABEL);

    // Then
    expect(pending).toBeInTheDocument();
  });

  it.each([
    ['publish', PUBLISH_LABEL, publish],
    ['discard', DISCARD_LABEL, discard],
  ])(
    'should %s the drafts once confirmed',
    async (_label, buttonLabel, mutation) => {
      // Given
      renderBanner(2);
      await userEvent.click(screen.getByRole('button', { name: buttonLabel }));

      // When
      await userEvent.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', {
          name: buttonLabel,
        })
      );

      // Then
      await waitFor(() => expect(mutation).toHaveBeenCalled());
    }
  );

  it('should not publish when the confirmation is cancelled', async () => {
    // Given
    renderBanner(2);
    await userEvent.click(screen.getByRole('button', { name: PUBLISH_LABEL }));

    // When
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Utils.Cancel',
      })
    );

    // Then
    expect(publish).not.toHaveBeenCalled();
  });

  it('should make published texts visible to visitors by expiring the cache', async () => {
    // Given
    renderBanner(2);
    await userEvent.click(screen.getByRole('button', { name: PUBLISH_LABEL }));

    // When
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: PUBLISH_LABEL,
      })
    );

    // Then
    await waitFor(() =>
      expect(revalidateContentTranslationsAction).toHaveBeenCalled()
    );
  });

  it('should show the editable areas by default', () => {
    // Given
    renderBanner(0);

    // When
    const toggle = screen.getByRole('button', { name: TOGGLE_LABEL });

    // Then
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('should hide the editable areas when toggled off', async () => {
    // Given
    renderBanner(0);

    // When
    await userEvent.click(screen.getByRole('button', { name: TOGGLE_LABEL }));

    // Then
    expect(screen.getByRole('button', { name: TOGGLE_LABEL })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('should invite to click an outlined text when the areas are shown', () => {
    // Given
    renderBanner(0);

    // When
    const label = screen.queryByText('EditableText.EditionBannerLabel');

    // Then
    expect(label).toBeInTheDocument();
  });

  it('should invite to show the areas when they are hidden', async () => {
    // Given
    renderBanner(0);

    // When
    await userEvent.click(screen.getByRole('button', { name: TOGGLE_LABEL }));

    // Then
    expect(
      screen.getByText('EditableText.EditionBannerHiddenAreasLabel')
    ).toBeInTheDocument();
  });
});
