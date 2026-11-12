'use client';

import { cn } from '@/lib/utils';
import { Icon } from '@filigran/design-system';
import * as React from 'react';

// In-app avatars are 24 to 32 px: the default covers a small avatar on a retina screen.
const DEFAULT_AVATAR_SIZE = 48;

export interface AvatarProps extends Omit<
  React.ComponentPropsWithoutRef<'span'>,
  'children' | 'dangerouslySetInnerHTML'
> {
  src?: string;
  alt?: string;
  /** Displayed size of the picture, in CSS pixels: it sets the width and height of the image, not the size of the avatar. */
  size?: number;
}

interface ImageLoad {
  src: string;
  status: 'loaded' | 'error';
}

type ImageStatus = 'idle' | 'loaded' | 'error';

// The outcome of a load only counts for the src it was reported for.
const getImageStatus = (
  imageLoad: ImageLoad | null,
  src: string | undefined
): ImageStatus => (src && imageLoad?.src === src ? imageLoad.status : 'idle');

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, src, alt = '', size = DEFAULT_AVATAR_SIZE, ...props }, ref) => {
    const imageRef = React.useRef<HTMLImageElement>(null);
    const [imageLoad, setImageLoad] = React.useState<ImageLoad | null>(null);

    React.useLayoutEffect(() => {
      const element = imageRef.current;
      if (src && element?.complete && element.naturalWidth > 0) {
        // A picture the browser already holds is shown before paint, so it never flashes the glyph.
        setImageLoad({ src, status: 'loaded' });
      }
    }, [src]);

    const status = getImageStatus(imageLoad, src);

    return (
      <span
        ref={ref}
        {...props}
        className={cn(
          'relative flex size-full shrink-0 items-center justify-center overflow-hidden rounded-full',
          className
        )}>
        {status !== 'loaded' && (
          <span
            {...(alt ? { role: 'img', 'aria-label': alt } : {})}
            className="flex size-full items-center justify-center bg-elevation-highlight text-icon-default">
            <Icon
              name="user"
              size={24}
            />
          </span>
        )}
        {src && status !== 'error' && (
          // The picture loads, lazily, under the glyph and replaces it once it is there.
          // Pictures come from any identity provider host, which next/image cannot be made to proxy.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imageRef}
            src={src}
            alt={alt}
            width={size}
            height={size}
            loading="lazy"
            decoding="async"
            aria-hidden={status === 'loaded' ? undefined : true}
            className={cn(
              'size-full object-cover',
              status !== 'loaded' && 'absolute inset-0 opacity-0'
            )}
            onLoad={() => setImageLoad({ src, status: 'loaded' })}
            onError={() => setImageLoad({ src, status: 'error' })}
          />
        )}
      </span>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar };
