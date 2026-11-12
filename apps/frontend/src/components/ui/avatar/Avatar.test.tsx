import testRender from '@/utils/test/test-render';
import { fireEvent, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Avatar } from './Avatar';

const TEST_ID = 'avatar';
const NATIVE_ID = 'author-avatar';
const PICTURE_URL = 'https://filigran.io/avatar.png';
const OTHER_PICTURE_URL = 'https://filigran.io/other-avatar.png';
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
const HIDDEN_CLASS = 'opacity-0';

const getAvatar = () => screen.getByTestId(TEST_ID);
const queryImage = () => getAvatar().querySelector('img');
const getImage = () => queryImage() as HTMLImageElement;
const queryGlyph = () => getAvatar().querySelector('svg');

const renderAvatar = (props: React.ComponentProps<typeof Avatar> = {}) =>
  testRender(
    <Avatar
      data-testid={TEST_ID}
      {...props}
    />
  );

const rerenderAvatar = (
  rerender: ReturnType<typeof renderAvatar>['rerender'],
  props: React.ComponentProps<typeof Avatar>
) =>
  rerender(
    <Avatar
      data-testid={TEST_ID}
      {...props}
    />
  );

// jsdom never loads images, so a picture the browser already holds is simulated on the prototype.
const holdImagesInBrowserCache = () => {
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(
    64
  );
};

describe('Avatar', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    ['without src', undefined],
    ['with an empty src', ''],
  ])(
    'should show the decorative fallback glyph and no image %s',
    (_case, src) => {
      // Given / When
      renderAvatar({ src });

      // Then
      expect(queryGlyph()).toBeInTheDocument();
      expect(queryGlyph()).toHaveAttribute('aria-hidden', 'true');
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(queryImage()).not.toBeInTheDocument();
    }
  );

  it('should keep the fallback glyph over a hidden image while the image loads', () => {
    // Given / When
    renderAvatar({ src: PICTURE_URL });

    // Then
    expect(queryGlyph()).toBeInTheDocument();
    expect(queryGlyph()).toHaveAttribute('aria-hidden', 'true');
    expect(getImage()).toHaveAttribute('src', PICTURE_URL);
    expect(getImage()).toHaveAttribute('aria-hidden', 'true');
    expect(getImage()).toHaveClass('absolute', HIDDEN_CLASS);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should load the image lazily and off the main thread', () => {
    // Given / When
    renderAvatar({ src: PICTURE_URL });

    // Then
    expect(getImage()).toHaveAttribute('loading', 'lazy');
    expect(getImage()).toHaveAttribute('decoding', 'async');
  });

  it('should load the image eagerly when the caller asks for it', () => {
    // Given / When
    renderAvatar({ src: PICTURE_URL, loading: 'eager' });

    // Then
    expect(getImage()).toHaveAttribute('loading', 'eager');
    expect(getImage()).toHaveAttribute('decoding', 'async');
  });

  it('should not preload the picture with an Image object', () => {
    // Given
    const imageConstructor = vi.fn();
    vi.stubGlobal('Image', imageConstructor);

    // When
    renderAvatar({ src: PICTURE_URL });

    // Then
    expect(imageConstructor).not.toHaveBeenCalled();
  });

  it('should reserve the default size for the image', () => {
    // Given / When
    renderAvatar({ src: PICTURE_URL });

    // Then
    expect(getImage()).toHaveAttribute('width', '48');
    expect(getImage()).toHaveAttribute('height', '48');
  });

  it('should reserve the size the caller gives for the image', () => {
    // Given / When
    renderAvatar({ src: PICTURE_URL, size: 24 });

    // Then
    expect(getImage()).toHaveAttribute('width', '24');
    expect(getImage()).toHaveAttribute('height', '24');
  });

  it('should show the cropped image and drop the fallback once the image loaded', () => {
    // Given
    renderAvatar({ src: PICTURE_URL });

    // When
    fireEvent.load(getImage());

    // Then
    expect(getImage()).toHaveAttribute('src', PICTURE_URL);
    expect(getImage()).toHaveAttribute('alt', '');
    expect(getImage()).toHaveClass(CROP_CLASS);
    expect(getImage()).not.toHaveClass(HIDDEN_CLASS);
    expect(getImage()).not.toHaveAttribute('aria-hidden');
    expect(queryGlyph()).not.toBeInTheDocument();
  });

  it('should keep the fallback glyph and drop the image when the image fails to load', () => {
    // Given
    renderAvatar({ src: PICTURE_URL });

    // When
    fireEvent.error(getImage());

    // Then
    expect(queryImage()).not.toBeInTheDocument();
    expect(queryGlyph()).toBeInTheDocument();
  });

  it('should show the image on the first render when the browser already holds it', () => {
    // Given
    holdImagesInBrowserCache();

    // When
    renderAvatar({ src: PICTURE_URL });

    // Then
    expect(getImage()).toHaveAttribute('src', PICTURE_URL);
    expect(getImage()).not.toHaveClass(HIDDEN_CLASS);
    expect(queryGlyph()).not.toBeInTheDocument();
  });

  it('should keep the fallback glyph when the browser holds a broken image', () => {
    // Given
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(
      true
    );

    // When
    renderAvatar({ src: PICTURE_URL });

    // Then
    expect(queryGlyph()).toBeInTheDocument();
    expect(getImage()).toHaveClass(HIDDEN_CLASS);
  });

  it('should give the image the alt when one is given', () => {
    // Given
    renderAvatar({ src: PICTURE_URL, alt: PERSON_NAME });

    // When
    fireEvent.load(getImage());

    // Then
    expect(getImage()).toHaveAttribute('alt', PERSON_NAME);
    expect(screen.getByRole('img', { name: PERSON_NAME })).toBe(getImage());
  });

  it('should name only the fallback with the alt while the image loads', () => {
    // Given / When
    renderAvatar({ src: PICTURE_URL, alt: PERSON_NAME });

    // Then
    expect(screen.getByRole('img', { name: PERSON_NAME })).toContainElement(
      queryGlyph()
    );
    expect(queryGlyph()).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('should show the fallback at once when a loaded src is replaced by one still loading', () => {
    // Given
    const { rerender } = renderAvatar({ src: PICTURE_URL });
    fireEvent.load(getImage());
    expect(queryGlyph()).not.toBeInTheDocument();

    // When
    rerenderAvatar(rerender, { src: OTHER_PICTURE_URL });

    // Then
    expect(queryGlyph()).toBeInTheDocument();
    expect(getImage()).toHaveAttribute('src', OTHER_PICTURE_URL);
    expect(getImage()).toHaveClass(HIDDEN_CLASS);
  });

  it('should show the new image once it loaded after a src change', () => {
    // Given
    const { rerender } = renderAvatar({ src: PICTURE_URL });
    fireEvent.load(getImage());
    rerenderAvatar(rerender, { src: OTHER_PICTURE_URL });

    // When
    fireEvent.load(getImage());

    // Then
    expect(getImage()).toHaveAttribute('src', OTHER_PICTURE_URL);
    expect(getImage()).not.toHaveClass(HIDDEN_CLASS);
    expect(queryGlyph()).not.toBeInTheDocument();
  });

  it('should try the new image when the previous src failed to load', () => {
    // Given
    const { rerender } = renderAvatar({ src: PICTURE_URL });
    fireEvent.error(getImage());
    expect(queryImage()).not.toBeInTheDocument();

    // When
    rerenderAvatar(rerender, { src: OTHER_PICTURE_URL });

    // Then
    expect(getImage()).toHaveAttribute('src', OTHER_PICTURE_URL);
    expect(queryGlyph()).toBeInTheDocument();
  });

  it('should keep the new image hidden when the previous src loads late', () => {
    // Given
    const { rerender } = renderAvatar({ src: PICTURE_URL });
    const previousImage = getImage();
    rerenderAvatar(rerender, { src: OTHER_PICTURE_URL });

    // When
    fireEvent.load(previousImage);

    // Then
    expect(getImage()).toHaveAttribute('src', OTHER_PICTURE_URL);
    expect(getImage()).toHaveClass(HIDDEN_CLASS);
    expect(queryGlyph()).toBeInTheDocument();
  });

  it('should not drop the new image when the previous src fails late', () => {
    // Given
    const { rerender } = renderAvatar({ src: PICTURE_URL });
    const previousImage = getImage();
    rerenderAvatar(rerender, { src: OTHER_PICTURE_URL });

    // When
    fireEvent.error(previousImage);

    // Then
    expect(getImage()).toHaveAttribute('src', OTHER_PICTURE_URL);
  });

  it('should try a picture again when its src comes back after it failed', () => {
    // Given
    const { rerender } = renderAvatar({ src: PICTURE_URL });
    fireEvent.error(getImage());
    rerenderAvatar(rerender, { src: OTHER_PICTURE_URL });

    // When
    rerenderAvatar(rerender, { src: PICTURE_URL });

    // Then
    expect(getImage()).toHaveAttribute('src', PICTURE_URL);
    expect(getImage()).toHaveClass(HIDDEN_CLASS);
    expect(queryGlyph()).toBeInTheDocument();
  });

  it('should try a picture again when its src comes back after the src was removed', () => {
    // Given
    const { rerender } = renderAvatar({ src: PICTURE_URL });
    fireEvent.error(getImage());
    rerenderAvatar(rerender, { src: undefined });

    // When
    rerenderAvatar(rerender, { src: PICTURE_URL });

    // Then
    expect(getImage()).toHaveAttribute('src', PICTURE_URL);
  });

  it('should go back to the fallback and drop the image when the src is removed', () => {
    // Given
    const { rerender } = renderAvatar({ src: PICTURE_URL });
    fireEvent.load(getImage());

    // When
    rerenderAvatar(rerender, { src: undefined });

    // Then
    expect(queryImage()).not.toBeInTheDocument();
    expect(queryGlyph()).toBeInTheDocument();
  });

  it('should draw the round root', () => {
    // Given / When
    renderAvatar();

    // Then
    expect(getAvatar().tagName).toBe('SPAN');
    expect(getAvatar()).toHaveClass(...ROOT_CLASSES);
  });

  it('should replace the default size when the caller gives size-8', () => {
    // Given / When
    renderAvatar({ className: CALLER_SIZE_CLASS });

    // Then
    expect(getAvatar()).toHaveClass(CALLER_SIZE_CLASS);
    expect(getAvatar()).not.toHaveClass(DEFAULT_SIZE_CLASS);
  });

  it('should pass native attributes through to the span', () => {
    // Given / When
    renderAvatar({ id: NATIVE_ID });

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
