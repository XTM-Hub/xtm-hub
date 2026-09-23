import { ContentEditDialog } from '@/components/content-translation/ContentEditDialog';
import testRender from '@/utils/test/test-render';
import {
  ContentTranslationForKeyQuery,
  Locale,
  useContentTranslationForKeyQuery,
  useSaveContentTranslationDraftMutation,
} from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useSaveContentTranslationDraftMutation: vi.fn(),
  useContentTranslationForKeyQuery: Object.assign(vi.fn(), {
    fetcher: vi.fn(),
  }),
}));

// A committed message with a placeholder, read from the real messages/en.json.
const CONTENT_KEY = 'Service.Trials.PageHeader.Title';
const EN_TEMPLATE =
  "Let's get you started with your {platformName} free trial!";
const PUBLISHED_EN = 'Start your {platformName} free trial!';
const DRAFT_EN = 'Try {platformName} for free!';
const EDITED_EN = 'Try {platformName} today!';
const SAVE_LABEL = 'EditableText.SaveDraft';
const ORIGINAL_LABEL = 'EditableText.OriginalValue';

const saveDraft = vi.fn();

const givenSavedValues = (saved: Partial<ContentTranslationForKeyQuery> = {}) =>
  vi
    .mocked(useContentTranslationForKeyQuery.fetcher)
    .mockReturnValue(async () => ({
      contentTranslations: [],
      contentTranslationDrafts: [],
      ...saved,
    }));

const renderDialog = ({
  onOpenChange = vi.fn(),
  onSaved = vi.fn(),
}: { onOpenChange?: () => void; onSaved?: () => void } = {}) =>
  testRender(
    <ContentEditDialog
      contentKey={CONTENT_KEY}
      open
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  );

const findEnglishValue = () => screen.findByRole('textbox');

describe('ContentEditDialog', () => {
  beforeEach(() => {
    saveDraft.mockResolvedValue({});
    vi.mocked(useSaveContentTranslationDraftMutation).mockReturnValue({
      mutateAsync: saveDraft,
      isPending: false,
    } as unknown as ReturnType<typeof useSaveContentTranslationDraftMutation>);
    givenSavedValues();
  });

  it('should show the raw message template when the text was never edited', async () => {
    // Given
    renderDialog();

    // When
    const textbox = await findEnglishValue();

    // Then
    await waitFor(() => expect(textbox).toHaveValue(EN_TEMPLATE));
  });

  it('should show the pending draft over the published value', async () => {
    // Given
    givenSavedValues({
      contentTranslations: [
        { key: CONTENT_KEY, locale: Locale.En, value: PUBLISHED_EN },
      ],
      contentTranslationDrafts: [
        { key: CONTENT_KEY, locale: Locale.En, value: DRAFT_EN },
      ],
    });
    renderDialog();

    // When
    const textbox = await findEnglishValue();

    // Then
    await waitFor(() => expect(textbox).toHaveValue(DRAFT_EN));
  });

  it('should save only the edited locale as a draft', async () => {
    // Given
    renderDialog();
    const textbox = await findEnglishValue();
    await waitFor(() => expect(textbox).toHaveValue(EN_TEMPLATE));
    await userEvent.clear(textbox);
    await userEvent.type(textbox, EDITED_EN.replace(/\{/g, '{{'));

    // When
    await userEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));

    // Then
    await waitFor(() =>
      expect(saveDraft).toHaveBeenCalledWith({
        input: {
          key: CONTENT_KEY,
          values: [{ locale: Locale.En, value: EDITED_EN }],
        },
      })
    );
  });

  it('should re-render the page once the draft is saved', async () => {
    // Given
    const onSaved = vi.fn();
    renderDialog({ onSaved });
    const textbox = await findEnglishValue();
    await waitFor(() => expect(textbox).toHaveValue(EN_TEMPLATE));
    await userEvent.type(textbox, '!');

    // When
    await userEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));

    // Then
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('should close without saving when nothing was edited', async () => {
    // Given
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });
    const textbox = await findEnglishValue();
    await waitFor(() => expect(textbox).toHaveValue(EN_TEMPLATE));

    // When
    await userEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));

    // Then
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('should stay open when the draft cannot be saved', async () => {
    // Given
    saveDraft.mockRejectedValue(new Error('save failed'));
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });
    const textbox = await findEnglishValue();
    await waitFor(() => expect(textbox).toHaveValue(EN_TEMPLATE));
    await userEvent.type(textbox, '!');

    // When
    await userEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));

    // Then
    await waitFor(() => expect(saveDraft).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it.each([
    [
      'a draft',
      {
        contentTranslationDrafts: [
          { key: CONTENT_KEY, locale: Locale.En, value: DRAFT_EN },
        ],
      },
    ],
    [
      'a published override',
      {
        contentTranslations: [
          { key: CONTENT_KEY, locale: Locale.En, value: PUBLISHED_EN },
        ],
      },
    ],
  ])(
    'should show the original template when the locale has %s',
    async (_label, saved) => {
      // Given
      givenSavedValues(saved);
      renderDialog();

      // When
      const original = await screen.findByText(ORIGINAL_LABEL);

      // Then
      expect(original).toBeInTheDocument();
    }
  );

  it('should not show an original when the text was never edited', async () => {
    // Given
    renderDialog();
    const textbox = await findEnglishValue();

    // When
    await waitFor(() => expect(textbox).toHaveValue(EN_TEMPLATE));

    // Then
    expect(screen.queryByText(ORIGINAL_LABEL)).not.toBeInTheDocument();
  });
});
