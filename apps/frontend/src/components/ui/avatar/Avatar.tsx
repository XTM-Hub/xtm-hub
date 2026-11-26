'use client';

import { cn } from '@/lib/utils';
import { Icon } from '@filigran/design-system';
import * as React from 'react';

// Intrinsic size reserved for the image (CSS pixels) when the caller gives none.
const DEFAULT_AVATAR_SIZE = 48;

export interface AvatarProps extends Omit<
  React.ComponentPropsWithoutRef<'span'>,
  'children' | 'dangerouslySetInnerHTML'
> {
  src?: string;
  /** Resized candidates of the picture (the `srcset` of the image), when the caller has any: the browser picks the one that fits. */
  srcSet?: string;
  /** Picture tried once, as it is (no `srcSet`), when `src` fails to load, before the fallback glyph is shown. */
  fallbackSrc?: string;
  alt?: string;
  /** Displayed size of the picture, in CSS pixels: it sets the width and height of the image, not the size of the avatar. */
  size?: number;
  /** 'lazy' (default) loads the picture when it comes near the viewport; 'eager' for an avatar that is always visible. */
  loading?: 'lazy' | 'eager';
}

type ImageStatus = 'idle' | 'loaded' | 'error';

const AvatarGlyph = ({ alt }: { alt: string }) => (
  <span
    {...(alt ? { role: 'img', 'aria-label': alt } : {})}
    className="flex size-full items-center justify-center bg-elevation-highlight text-icon-default">
    <Icon
      name="user"
      size={24}
    />
  </span>
);

interface AvatarPictureProps {
  src: string;
  srcSet?: string;
  fallbackSrc?: string;
  alt: string;
  size: number;
  loading: 'lazy' | 'eager';
}

// Mounted once per src, srcSet and fallbackSrc (see its key in Avatar): the load outcome of a picture
// never outlives it, so a late event of a previous picture cannot count for the new one, and a picture
// that failed is tried again when its src comes back, or when only its fallbackSrc changes (a new upload).
const AvatarPicture = ({
  src,
  srcSet,
  fallbackSrc,
  alt,
  size,
  loading,
}: AvatarPictureProps) => {
  const [status, setStatus] = React.useState<ImageStatus>('idle');
  const [isFallbackTried, setIsFallbackTried] = React.useState(false);
  const canTryFallback = !!fallbackSrc && fallbackSrc !== src;
  const isUsingFallback = isFallbackTried && canTryFallback;

  // The picture failed: one more try with the fallback one, if there is any and it was not tried yet,
  // before showing the glyph.
  const failPicture = React.useCallback(
    (wasFallbackTried: boolean) => {
      if (canTryFallback && !wasFallbackTried) {
        setIsFallbackTried(true);
        // A picture that had loaded can fail later, when the browser picks another srcset candidate:
        // the glyph is back while the fallback loads.
        setStatus('idle');
      } else {
        setStatus('error');
      }
    },
    [canTryFallback]
  );

  const handleError = () => failPicture(isFallbackTried);

  // Runs when the image is attached, before paint, with whatever the browser already knows of it.
  const handleImageRef = React.useCallback(
    (element: HTMLImageElement | null) => {
      if (!element?.complete) {
        return;
      }
      if (element.naturalWidth > 0) {
        // A picture the browser already holds is shown before paint, so it never flashes the glyph.
        setStatus('loaded');
        return;
      }
      // Assumes a browser reports `complete === false` and no currentSrc for a lazy image whose
      // fetch is deferred, so a complete image with a currentSrc has settled (to verify in a real
      // browser; jsdom cannot show it). Without a natural width it has either failed, while the
      // server-rendered markup was loading before hydration (React missed that error event and
      // would never replay it), or loaded with no intrinsic size (an SVG without width and height).
      if (!element.currentSrc) {
        return;
      }
      // decode() is absent in jsdom and in old browsers: do not remove this check as dead code.
      if (typeof element.decode === 'function') {
        // decode() rejects for a broken image only: it tells the two cases apart.
        element.decode().then(
          () => setStatus('loaded'),
          // This is the first picture: the fallback has not been tried at mount.
          () => failPicture(false)
        );
      } else {
        failPicture(false);
      }
    },
    [failPicture]
  );

  const isLoaded = status === 'loaded';

  return (
    <>
      {!isLoaded && <AvatarGlyph alt={alt} />}
      {status !== 'error' && (
        // The picture loads under the glyph and replaces it once it is there. A plain img, not
        // next/image, so that any host works as it is (identity providers, which next/image must
        // not proxy); a caller that has resized candidates of the picture hands them over as srcSet.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={handleImageRef}
          src={isUsingFallback ? fallbackSrc : src}
          srcSet={isUsingFallback ? undefined : srcSet}
          alt={alt}
          width={size}
          height={size}
          loading={loading}
          decoding="async"
          aria-hidden={isLoaded ? undefined : true}
          className={cn(
            'size-full object-cover',
            !isLoaded && 'absolute inset-0 opacity-0'
          )}
          onLoad={() => setStatus('loaded')}
          onError={handleError}
        />
      )}
    </>
  );
};

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      className,
      src,
      srcSet,
      fallbackSrc,
      alt = '',
      size = DEFAULT_AVATAR_SIZE,
      loading = 'lazy',
      ...props
    },
    ref
  ) => (
    <span
      ref={ref}
      {...props}
      className={cn(
        'relative flex size-full shrink-0 items-center justify-center overflow-hidden rounded-full',
        className
      )}>
      {src ? (
        <AvatarPicture
          key={JSON.stringify([src, srcSet, fallbackSrc])}
          src={src}
          srcSet={srcSet}
          fallbackSrc={fallbackSrc}
          alt={alt}
          size={size}
          loading={loading}
        />
      ) : (
        <AvatarGlyph alt={alt} />
      )}
    </span>
  )
);
Avatar.displayName = 'Avatar';

export { Avatar };
