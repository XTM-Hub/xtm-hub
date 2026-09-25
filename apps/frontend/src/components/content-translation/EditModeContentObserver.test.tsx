import {
  EDITABLE_ATTRIBUTE,
  EditModeContentObserver,
} from '@/components/content-translation/EditModeContentObserver';
import { EditModeProvider } from '@/context/edit-mode-context';
import { appendContentKeyMarker } from '@/utils/content-translation/invisible-marker';
import testRender from '@/utils/test/test-render';
import {
  useContentTranslationForKeyQuery,
  useSaveContentTranslationDraftMutation,
} from '@graphql/generated';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useSaveContentTranslationDraftMutation: vi.fn(),
  useContentTranslationForKeyQuery: Object.assign(vi.fn(), {
    fetcher: vi.fn(),
  }),
}));

const CONTENT_KEY = 'PublicHomePage.XtmPlatform.Title';
const VISIBLE_TEXT = 'Extend and scale your XTM Platform';
const AREAS_STORAGE_KEY = 'is-content-edit-areas-shown';
const TEXT_RECT = {
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: 200,
  bottom: 20,
  width: 200,
  height: 20,
};
const POINT_INSIDE_TEXT = { clientX: 10, clientY: 10 };
// Inside the editable element but beside its text, e.g. a button padding.
const POINT_BESIDE_TEXT = { clientX: 300, clientY: 10 };

const findBadge = () => document.querySelector('[data-content-edit-badge]');

const editableFlagOf = (testId: string) =>
  screen.getByTestId(testId).getAttribute(EDITABLE_ATTRIBUTE);

// Outlines are refreshed on the next animation frame.
const nextFrame = () =>
  act(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  );

const renderObserver = ({
  isEditMode = true,
  onLinkClick = vi.fn(),
  overriddenKeys = [],
}: {
  isEditMode?: boolean;
  onLinkClick?: () => void;
  overriddenKeys?: string[];
} = {}) =>
  testRender(
    <EditModeProvider
      canEditContent
      isEditMode={isEditMode}
      pendingChangeCount={0}
      overriddenKeys={overriddenKeys}>
      <a
        href="#title"
        data-testid="editable-link"
        onClick={onLinkClick}>
        {appendContentKeyMarker(VISIBLE_TEXT, CONTENT_KEY)}
      </a>
      <p data-testid="plain-text">Not editable</p>
      <EditModeContentObserver />
    </EditModeProvider>
  );

// jsdom has no layout: stub the geometry APIs the observer hit-tests with,
// so the editable link sits under POINT_INSIDE_TEXT. The cast is needed as
// jsdom cannot build a real DOMRectList.
const givenLayout = (elementAtPoint: () => Element | null) => {
  Range.prototype.getClientRects = vi.fn(
    () => [TEXT_RECT] as unknown as DOMRectList
  );
  document.elementFromPoint = vi.fn(elementAtPoint);
};

describe('EditModeContentObserver', () => {
  const originalGetClientRects = Range.prototype.getClientRects;
  const originalElementFromPoint = document.elementFromPoint;

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useSaveContentTranslationDraftMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSaveContentTranslationDraftMutation>);
    vi.mocked(useContentTranslationForKeyQuery.fetcher).mockReturnValue(
      async () => ({ contentTranslations: [], contentTranslationDrafts: [] })
    );
    givenLayout(() => screen.queryByTestId('editable-link'));
  });

  afterEach(() => {
    Range.prototype.getClientRects = originalGetClientRects;
    document.elementFromPoint = originalElementFromPoint;
  });

  it('should strip the invisible marker from rendered text when edit mode is on', () => {
    // Given
    renderObserver();

    // When
    const link = screen.getByTestId('editable-link');

    // Then
    expect(link.textContent).toBe(VISIBLE_TEXT);
  });

  it('should leave the rendered text untouched when edit mode is off', () => {
    // Given
    renderObserver({ isEditMode: false });

    // When
    const link = screen.getByTestId('editable-link');

    // Then
    expect(link.textContent).toBe(
      appendContentKeyMarker(VISIBLE_TEXT, CONTENT_KEY)
    );
  });

  it('should strip the marker from text rendered after mount', async () => {
    // Given
    renderObserver();

    // When
    const late = document.createElement('span');
    late.textContent = appendContentKeyMarker('Late text', CONTENT_KEY);
    document.body.appendChild(late);

    // Then
    await waitFor(() => expect(late.textContent).toBe('Late text'));
    late.remove();
  });

  it('should flag the element of an editable text when the editable areas are shown', () => {
    // Given
    renderObserver();

    // When
    const flag = editableFlagOf('editable-link');

    // Then
    expect(flag).toBe('committed');
  });

  it('should flag the element of an editable text rendered after mount', async () => {
    // Given
    renderObserver();

    // When
    const late = document.createElement('span');
    late.textContent = appendContentKeyMarker('Late text', CONTENT_KEY);
    document.body.appendChild(late);

    // Then
    await waitFor(() =>
      expect(late.getAttribute(EDITABLE_ATTRIBUTE)).toBe('committed')
    );
    late.remove();
  });

  it('should flag nothing when the editable areas are hidden', async () => {
    // Given
    localStorage.setItem(AREAS_STORAGE_KEY, 'false');
    renderObserver();

    // When
    await nextFrame();

    // Then
    expect(editableFlagOf('editable-link')).toBeNull();
  });

  it('should clear the flags when edit mode is turned off', () => {
    // Given
    const { rerender } = renderObserver();

    // When
    rerender(
      <EditModeProvider
        canEditContent
        isEditMode={false}
        pendingChangeCount={0}
        overriddenKeys={[]}>
        <a
          href="#title"
          data-testid="editable-link">
          {VISIBLE_TEXT}
        </a>
        <EditModeContentObserver />
      </EditModeProvider>
    );

    // Then
    expect(editableFlagOf('editable-link')).toBeNull();
  });

  it('should open the edit dialog when clicking an editable text', async () => {
    // Given
    renderObserver();

    // When
    fireEvent.click(screen.getByTestId('editable-link'), POINT_INSIDE_TEXT);

    // Then
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('should keep the click away from the interactive element around an editable text', () => {
    // Given
    const onLinkClick = vi.fn();
    renderObserver({ onLinkClick });

    // When
    fireEvent.click(screen.getByTestId('editable-link'), POINT_INSIDE_TEXT);

    // Then
    expect(onLinkClick).not.toHaveBeenCalled();
  });

  it('should let clicks through when the editable areas are hidden', async () => {
    // Given
    localStorage.setItem(AREAS_STORAGE_KEY, 'false');
    const onLinkClick = vi.fn();
    renderObserver({ onLinkClick });
    await nextFrame();

    // When
    fireEvent.click(screen.getByTestId('editable-link'), POINT_INSIDE_TEXT);

    // Then
    expect(onLinkClick).toHaveBeenCalled();
  });

  it('should not intercept a click outside any editable text', () => {
    // Given
    givenLayout(() => screen.queryByTestId('plain-text'));
    renderObserver();

    // When
    fireEvent.click(screen.getByTestId('plain-text'), POINT_INSIDE_TEXT);

    // Then
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    [
      'overridden when it has a draft or a published value',
      [CONTENT_KEY],
      'overridden',
    ],
    ['committed when it has neither', [], 'committed'],
  ])(
    'should flag an editable text as %s',
    (_label, overriddenKeys, expectedFlag) => {
      // Given
      renderObserver({ overriddenKeys });

      // When
      const flag = editableFlagOf('editable-link');

      // Then
      expect(flag).toBe(expectedFlag);
    }
  );

  it('should open the edit dialog when clicking beside the text inside its editable element', async () => {
    // Given
    renderObserver();

    // When
    fireEvent.click(screen.getByTestId('editable-link'), POINT_BESIDE_TEXT);

    // Then
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('should keep the action of an icon button inside an editable block', () => {
    // Given
    const onIconClick = vi.fn();
    testRender(
      <EditModeProvider
        canEditContent
        isEditMode
        pendingChangeCount={0}
        overriddenKeys={[]}>
        <div>
          {appendContentKeyMarker(VISIBLE_TEXT, CONTENT_KEY)}
          <button
            type="button"
            data-testid="icon-button"
            onClick={onIconClick}>
            ×
          </button>
        </div>
        <EditModeContentObserver />
      </EditModeProvider>
    );
    givenLayout(() => screen.queryByTestId('icon-button'));

    // When
    fireEvent.click(screen.getByTestId('icon-button'), POINT_BESIDE_TEXT);

    // Then
    expect(onIconClick).toHaveBeenCalled();
  });

  it.each([
    ['committed', [], 'committed'],
    ['overridden', [CONTENT_KEY], 'overridden'],
  ])(
    'should show the %s edit badge over the editable element under the pointer',
    async (_label, overriddenKeys, expectedBadge) => {
      // Given
      renderObserver({ overriddenKeys });

      // When
      fireEvent.mouseMove(document, POINT_BESIDE_TEXT);

      // Then
      await waitFor(() =>
        expect(findBadge()?.getAttribute('data-content-edit-badge')).toBe(
          expectedBadge
        )
      );
    }
  );

  it('should hide the edit badge while the page scrolls', async () => {
    // Given
    renderObserver();
    fireEvent.mouseMove(document, POINT_INSIDE_TEXT);
    await waitFor(() => expect(findBadge()).not.toBeNull());

    // When
    fireEvent.scroll(document);

    // Then
    await waitFor(() => expect(findBadge()).toBeNull());
  });
});
