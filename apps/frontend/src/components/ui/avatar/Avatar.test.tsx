import testRender from '@/utils/test/test-render';
import { act, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Avatar } from './Avatar';

const TEST_ID = 'avatar';
const NATIVE_ID = 'author-avatar';
const PICTURE_URL = 'https://filigran.io/avatar.png';
const OTHER_PICTURE_URL = 'https://filigran.io/other-avatar.png';
const BROKEN_URL = 'https://filigran.io/broken.png';
const PERSON_NAME = 'Jane Doe';
const DEFAULT_SIZE_CLASS = 'size-full';
const ROOT_CLASSES = [
  'relative',
  'flex',
  DEFAULT_SIZE_CLASS,
  'shrink-0',
  'items-center',
  'justify-center',
  'overflow-hidden',
  'rounded-full',
];
const CALLER_SIZE_CLASS = 'size-8';
const CROP_CLASS = 'object-cover';

// 'manual' leaves the image loading until the test fires its load by hand.
type ImageOutcome = 'load' | 'error' | 'cached' | 'manual';

interface ImageHandlers {
  onload: (() => void) | null;
  onerror: (() => void) | null;
}

const stubImage = (outcomes: Record<string, ImageOutcome>) => {
  const settled = vi.fn();
  const images = new Map<string, ImageHandlers>();
  class StubImage implements ImageHandlers {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    complete = false;
    naturalWidth = 0;

    set src(value: string) {
      images.set(value, this);
      const outcome = outcomes[value];
      if (outcome === 'manual') {
        return;
      }
      if (outcome === 'cached') {
        this.complete = true;
        this.naturalWidth = 64;
        return;
      }
      queueMicrotask(() => {
        if (outcome === 'load') {
          this.onload?.();
        } else {
          this.onerror?.();
        }
        settled(value);
      });
    }
  }
  vi.stubGlobal('Image', StubImage);
  const fireLoad = (url: string) => act(() => images.get(url)?.onload?.());
  return { settled, fireLoad };
};

const getAvatar = () => screen.getByTestId(TEST_ID);
const queryImage = () => getAvatar().querySelector('img');
const queryGlyph = () => getAvatar().querySelector('svg');

describe('Avatar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['without src', undefined],
    ['with an empty src', ''],
    ['while the image loads', PICTURE_URL],
  ])('should show the decorative fallback glyph %s', (_case, src) => {
    // Given
    testRender(
      <Avatar
        data-testid={TEST_ID}
        src={src}
      />
    );

    // Then
    expect(queryGlyph()).toBeInTheDocument();
    expect(queryGlyph()).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(queryImage()).not.toBeInTheDocument();
  });

  it('should show the cropped image and drop the fallback once the image loaded', async () => {
    // Given
    stubImage({ [PICTURE_URL]: 'load' });

    // When
    testRender(
      <Avatar
        data-testid={TEST_ID}
        src={PICTURE_URL}
      />
    );

    // Then
    await waitFor(() => expect(queryImage()).toBeInTheDocument());
    expect(queryImage()).toHaveAttribute('src', PICTURE_URL);
    expect(queryImage()).toHaveAttribute('alt', '');
    expect(queryImage()).toHaveClass(CROP_CLASS);
    expect(queryGlyph()).not.toBeInTheDocument();
  });

  it('should keep the fallback glyph when the image fails to load', async () => {
    // Given
    const { settled } = stubImage({ [BROKEN_URL]: 'error' });

    // When
    testRender(
      <Avatar
        data-testid={TEST_ID}
        src={BROKEN_URL}
      />
    );

    // Then
    await waitFor(() => expect(settled).toHaveBeenCalledWith(BROKEN_URL));
    expect(queryGlyph()).toBeInTheDocument();
    expect(queryImage()).not.toBeInTheDocument();
  });

  it('should show the image on the first render when the browser already holds it', () => {
    // Given
    stubImage({ [PICTURE_URL]: 'cached' });

    // When
    testRender(
      <Avatar
        data-testid={TEST_ID}
        src={PICTURE_URL}
      />
    );

    // Then
    expect(queryImage()).toHaveAttribute('src', PICTURE_URL);
    expect(queryGlyph()).not.toBeInTheDocument();
  });

  it('should give the image the alt when one is given', async () => {
    // Given
    stubImage({ [PICTURE_URL]: 'load' });

    // When
    testRender(
      <Avatar
        data-testid={TEST_ID}
        src={PICTURE_URL}
        alt={PERSON_NAME}
      />
    );

    // Then
    await waitFor(() => expect(queryImage()).toBeInTheDocument());
    expect(queryImage()).toHaveAttribute('alt', PERSON_NAME);
  });

  it('should name the fallback with the alt while the image loads', () => {
    // Given
    stubImage({ [PICTURE_URL]: 'manual' });

    // When
    testRender(
      <Avatar
        data-testid={TEST_ID}
        src={PICTURE_URL}
        alt={PERSON_NAME}
      />
    );

    // Then
    expect(screen.getByRole('img', { name: PERSON_NAME })).toContainElement(
      queryGlyph()
    );
    expect(queryGlyph()).toHaveAttribute('aria-hidden', 'true');
    expect(queryImage()).not.toBeInTheDocument();
  });

  it('should show the fallback at once when a loaded src is replaced by one still loading', () => {
    // Given
    const { fireLoad } = stubImage({
      [PICTURE_URL]: 'manual',
      [OTHER_PICTURE_URL]: 'manual',
    });
    const { rerender } = testRender(
      <Avatar
        data-testid={TEST_ID}
        src={PICTURE_URL}
      />
    );
    fireLoad(PICTURE_URL);
    expect(queryImage()).toHaveAttribute('src', PICTURE_URL);

    // When
    rerender(
      <Avatar
        data-testid={TEST_ID}
        src={OTHER_PICTURE_URL}
      />
    );

    // Then
    expect(queryGlyph()).toBeInTheDocument();
    expect(queryImage()).not.toBeInTheDocument();
  });

  it('should keep the new image when the previous src loads late', () => {
    // Given
    const { fireLoad } = stubImage({
      [PICTURE_URL]: 'manual',
      [OTHER_PICTURE_URL]: 'manual',
    });
    const { rerender } = testRender(
      <Avatar
        data-testid={TEST_ID}
        src={PICTURE_URL}
      />
    );
    rerender(
      <Avatar
        data-testid={TEST_ID}
        src={OTHER_PICTURE_URL}
      />
    );
    fireLoad(OTHER_PICTURE_URL);

    // When
    fireLoad(PICTURE_URL);

    // Then
    expect(queryImage()).toHaveAttribute('src', OTHER_PICTURE_URL);
    expect(queryGlyph()).not.toBeInTheDocument();
  });

  it('should draw the round root', () => {
    // Given
    testRender(<Avatar data-testid={TEST_ID} />);

    // Then
    expect(getAvatar().tagName).toBe('SPAN');
    expect(getAvatar()).toHaveClass(...ROOT_CLASSES);
  });

  it('should replace the default size when the caller gives size-8', () => {
    // Given
    testRender(
      <Avatar
        data-testid={TEST_ID}
        className={CALLER_SIZE_CLASS}
      />
    );

    // Then
    expect(getAvatar()).toHaveClass(CALLER_SIZE_CLASS);
    expect(getAvatar()).not.toHaveClass(DEFAULT_SIZE_CLASS);
  });

  it('should pass native attributes through to the span', () => {
    // Given
    testRender(
      <Avatar
        data-testid={TEST_ID}
        id={NATIVE_ID}
      />
    );

    // Then
    expect(getAvatar()).toHaveAttribute('id', NATIVE_ID);
  });

  it('should reach the span element when a ref is given', () => {
    // Given
    const ref = createRef<HTMLSpanElement>();

    // When
    testRender(
      <Avatar
        ref={ref}
        data-testid={TEST_ID}
      />
    );

    // Then
    expect(ref.current).toBe(getAvatar());
  });
});
