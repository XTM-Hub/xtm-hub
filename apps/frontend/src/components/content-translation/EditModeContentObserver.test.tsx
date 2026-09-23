import { EditModeContentObserver } from '@/components/content-translation/EditModeContentObserver';
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

const countOutlines = () => document.querySelectorAll('.outline-dashed').length;

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

  it('should outline editable texts when the editable areas are shown', async () => {
    // Given
    renderObserver();

    // When
    const outlines = await waitFor(() => {
      const count = countOutlines();
      expect(count).toBeGreaterThan(0);
      return count;
    });

    // Then
    expect(outlines).toBe(1);
  });

  it('should not outline anything when the editable areas are hidden', async () => {
    // Given
    localStorage.setItem(AREAS_STORAGE_KEY, 'false');
    renderObserver();

    // When
    await nextFrame();

    // Then
    expect(countOutlines()).toBe(0);
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

  it('should highlight the editable text under the pointer', async () => {
    // Given
    renderObserver();
    await waitFor(() => expect(countOutlines()).toBe(1));

    // When
    fireEvent.mouseMove(document, POINT_INSIDE_TEXT);

    // Then
    await waitFor(() => expect(countOutlines()).toBe(2));
  });

  it.each([
    ['yellow when it is overridden', [CONTENT_KEY], 'outline-yellow-400'],
    ['with the primary color when it is committed', [], 'outline-primary/50'],
  ])(
    'should outline an editable text %s',
    async (_label, overriddenKeys, expectedClass) => {
      // Given
      renderObserver({ overriddenKeys });

      // When
      const outline = await waitFor(() => {
        const element = document.querySelector('.outline-dashed');
        expect(element).not.toBeNull();
        return element;
      });

      // Then
      expect(outline).toHaveClass(expectedClass);
    }
  );

  it('should not outline a text cropped out by its container', async () => {
    // Given
    // jsdom lays every element out as an empty box, so any cropping container
    // hides the text entirely, as a scrolled-out or visually hidden one would.
    testRender(
      <EditModeProvider
        canEditContent
        isEditMode
        pendingChangeCount={0}
        overriddenKeys={[]}>
        <div style={{ overflowX: 'hidden', overflowY: 'hidden' }}>
          <span data-testid="cropped-text">
            {appendContentKeyMarker(VISIBLE_TEXT, CONTENT_KEY)}
          </span>
        </div>
        <EditModeContentObserver />
      </EditModeProvider>
    );
    givenLayout(() => screen.queryByTestId('cropped-text'));

    // When
    await nextFrame();

    // Then
    expect(countOutlines()).toBe(0);
  });

  it('should not outline a text covered by another element', async () => {
    // Given
    givenLayout(() => screen.queryByTestId('plain-text'));
    renderObserver();

    // When
    await nextFrame();

    // Then
    expect(countOutlines()).toBe(0);
  });
});
