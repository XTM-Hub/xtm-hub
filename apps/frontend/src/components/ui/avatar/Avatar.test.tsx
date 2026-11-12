import testRender from '@/utils/test/test-render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Avatar } from './Avatar';

// The shared setup replaces next/image with a bare <img>: these tests need the real component,
// which sets the loading attributes, the sizes and the optimiser URLs of the picture.
vi.unmock('next/image');

const TEST_ID = 'avatar';
const NATIVE_ID = 'author-avatar';
const PICTURE_URL = 'https://cdn.auth0.com/avatar.png';
const OTHER_PICTURE_URL = 'https://cdn.auth0.com/other-avatar.png';
const USER_ID = '89efc660-a732-4d71-abe2-455188be1505';
const GRAVATAR_URL = 'https://s.gravatar.com/avatar/538dc0e?s=480&r=pg';
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

const backendPictureUrl = () =>
  `${window.location.origin}/user/picture/${USER_ID}?t=1760000000000`;

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

// jsdom never loads images, so a picture the browser already holds is simulated on the prototype.
const holdImagesInBrowserCache = () => {
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(
    64
  );
};

const finishLoading = async (image: HTMLImageElement) => {
  fireEvent.load(image);
  await waitFor(() => expect(queryGlyph()).not.toBeInTheDocument());
};

describe('Avatar', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(getImage()).toHaveAttribute('aria-hidden', 'true');
    expect(getImage()).toHaveClass('absolute', 'opacity-0');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should load the image lazily and off the main thread', () => {
    // Given / When
    renderAvatar({ src: PICTURE_URL });

    // Then
    expect(getImage()).toHaveAttribute('loading', 'lazy');
    expect(getImage()).toHaveAttribute('decoding', 'async');
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
    renderAvatar({ src: PICTURE_URL, size: 96 });

    // Then
    expect(getImage()).toHaveAttribute('width', '96');
    expect(getImage()).toHaveAttribute('height', '96');
  });

  it('should show the cropped image and drop the fallback once the image loaded', async () => {
    // Given
    renderAvatar({ src: PICTURE_URL });

    // When
    await finishLoading(getImage());

    // Then
    expect(getImage()).toHaveAttribute('src', PICTURE_URL);
    expect(getImage()).toHaveAttribute('alt', '');
    expect(getImage()).toHaveClass(CROP_CLASS);
    expect(getImage()).not.toHaveClass('opacity-0');
    expect(getImage()).not.toHaveAttribute('aria-hidden');
  });

  it('should keep the fallback glyph and drop the image when the image fails to load', async () => {
    // Given
    renderAvatar({ src: PICTURE_URL });

    // When
    fireEvent.error(getImage());

    // Then
    await waitFor(() => expect(queryImage()).not.toBeInTheDocument());
    expect(queryGlyph()).toBeInTheDocument();
  });

  it('should show the image on the first render when the browser already holds it', () => {
    // Given
    holdImagesInBrowserCache();

    // When
    renderAvatar({ src: PICTURE_URL });

    // Then
    expect(getImage()).toHaveAttribute('src', PICTURE_URL);
    expect(getImage()).not.toHaveClass('opacity-0');
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
    expect(getImage()).toHaveClass('opacity-0');
  });

  it('should give the image the alt when one is given', async () => {
    // Given
    renderAvatar({ src: PICTURE_URL, alt: PERSON_NAME });

    // When
    await finishLoading(getImage());

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

  it('should show the fallback at once when a loaded src is replaced by one still loading', async () => {
    // Given
    const { rerender } = renderAvatar({ src: PICTURE_URL });
    await finishLoading(getImage());

    // When
    rerender(
      <Avatar
        data-testid={TEST_ID}
        src={OTHER_PICTURE_URL}
      />
    );

    // Then
    expect(queryGlyph()).toBeInTheDocument();
    expect(getImage()).toHaveAttribute('src', OTHER_PICTURE_URL);
    expect(getImage()).toHaveClass('opacity-0');
  });

  it('should keep the new image waiting when the previous src loads late', () => {
    // Given
    const { rerender } = renderAvatar({ src: PICTURE_URL });
    const previousImage = getImage();
    rerender(
      <Avatar
        data-testid={TEST_ID}
        src={OTHER_PICTURE_URL}
      />
    );

    // When
    fireEvent.load(previousImage);

    // Then
    expect(getImage()).toHaveAttribute('src', OTHER_PICTURE_URL);
    expect(getImage()).toHaveClass('opacity-0');
    expect(queryGlyph()).toBeInTheDocument();
  });

  it('should ask the optimiser for a backend picture at the displayed size, as a local path', () => {
    // Given / When
    renderAvatar({ src: backendPictureUrl(), size: 24 });

    // Then
    const optimiserUrl = new URL(getImage().src);
    expect(optimiserUrl.pathname).toBe('/_next/image');
    expect(optimiserUrl.searchParams.get('url')).toBe(
      `/user/picture/${USER_ID}?t=1760000000000`
    );
    expect(optimiserUrl.searchParams.get('w')).toBe('48');
  });

  it('should offer the optimiser the displayed size and its retina twin only', () => {
    // Given / When
    renderAvatar({ src: backendPictureUrl(), size: 48 });

    // Then
    const widths = getImage()
      .srcset.split(',')
      .map((candidate) =>
        new URL(
          candidate.trim().split(' ')[0],
          window.location.origin
        ).searchParams.get('w')
      );
    expect(widths).toEqual(['48', '96']);
  });

  it('should load a picture of another host as it is, never through the optimiser', () => {
    // Given / When
    renderAvatar({ src: PICTURE_URL });

    // Then
    expect(getImage()).toHaveAttribute('src', PICTURE_URL);
    expect(getImage().srcset).toBe('');
  });

  it('should load a picture of the backend of another origin as it is', () => {
    // Given
    const src = `https://evil.io/user/picture/${USER_ID}?t=1`;

    // When
    renderAvatar({ src });

    // Then
    expect(getImage()).toHaveAttribute('src', src);
    expect(getImage().srcset).toBe('');
  });

  it('should load a local preview as it is', () => {
    // Given
    const preview = 'blob:http://localhost:3000/1234';

    // When
    renderAvatar({ src: preview });

    // Then
    expect(getImage()).toHaveAttribute('src', preview);
    expect(getImage().srcset).toBe('');
  });

  it('should ask Gravatar for twice the default size', () => {
    // Given / When
    renderAvatar({ src: GRAVATAR_URL });

    // Then
    expect(getImage()).toHaveAttribute(
      'src',
      'https://s.gravatar.com/avatar/538dc0e?s=96&r=pg'
    );
    expect(getImage().srcset).toBe('');
  });

  it('should ask Gravatar for twice the size the caller gives', () => {
    // Given / When
    renderAvatar({ src: GRAVATAR_URL, size: 24 });

    // Then
    expect(getImage()).toHaveAttribute(
      'src',
      'https://s.gravatar.com/avatar/538dc0e?s=48&r=pg'
    );
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
