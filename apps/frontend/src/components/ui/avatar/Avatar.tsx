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
  alt: string;
  size: number;
  loading: 'lazy' | 'eager';
}

// Mounted once per src (see its key in Avatar): the load outcome of a picture never outlives it,
// so a late event of a previous picture cannot count for the new one, and a picture that failed
// is tried again when its src comes back.
const AvatarPicture = ({ src, alt, size, loading }: AvatarPictureProps) => {
  const imageRef = React.useRef<HTMLImageElement>(null);
  const [status, setStatus] = React.useState<ImageStatus>('idle');

  React.useLayoutEffect(() => {
    const element = imageRef.current;
    if (element?.complete && element.naturalWidth > 0) {
      // A picture the browser already holds is shown before paint, so it never flashes the glyph.
      setStatus('loaded');
    }
  }, []);

  const isLoaded = status === 'loaded';

  return (
    <>
      {!isLoaded && <AvatarGlyph alt={alt} />}
      {status !== 'error' && (
        // The picture loads under the glyph and replaces it once it is there.
        // Pictures come from any identity provider host, so they are loaded as they are, by a plain img.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imageRef}
          src={src}
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
          onError={() => setStatus('error')}
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
          key={src}
          src={src}
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
