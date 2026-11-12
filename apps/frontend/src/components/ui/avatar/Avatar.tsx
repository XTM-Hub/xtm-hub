'use client';

import { cn } from '@/lib/utils';
import { Icon } from '@filigran/design-system';
import Image from 'next/image';
import * as React from 'react';
import { DEFAULT_AVATAR_SIZE, resolveAvatarImage } from './avatar-image.util';

export interface AvatarProps extends Omit<
  React.ComponentPropsWithoutRef<'span'>,
  'children' | 'dangerouslySetInnerHTML'
> {
  src?: string;
  alt?: string;
  /** Displayed size of the picture, in CSS pixels: the resolution the picture is requested at. */
  size?: number;
}

interface ImageLoad {
  src: string;
  status: 'loaded' | 'error';
}

const subscribeToNothing = () => () => undefined;
const getPageOrigin = () => window.location.origin;
// The server, and the hydration of its markup, know no page origin: no picture is rendered then.
const getServerPageOrigin = () => undefined;

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, src, alt = '', size = DEFAULT_AVATAR_SIZE, ...props }, ref) => {
    const imageRef = React.useRef<HTMLImageElement>(null);
    const [imageLoad, setImageLoad] = React.useState<ImageLoad | null>(null);
    const origin = React.useSyncExternalStore(
      subscribeToNothing,
      getPageOrigin,
      getServerPageOrigin
    );

    const image = React.useMemo(
      () => (src && origin ? resolveAvatarImage(src, size, origin) : null),
      [src, size, origin]
    );
    const imageSrc = image?.src;

    React.useLayoutEffect(() => {
      const element = imageRef.current;
      if (imageSrc && element?.complete && element.naturalWidth > 0) {
        // A picture the browser already holds is shown before paint, so it never flashes the glyph.
        setImageLoad({ src: imageSrc, status: 'loaded' });
      }
    }, [imageSrc]);

    const status = imageLoad?.src === imageSrc ? imageLoad?.status : undefined;
    const isLoaded = status === 'loaded';

    return (
      <span
        ref={ref}
        {...props}
        className={cn(
          'relative flex size-full shrink-0 items-center justify-center overflow-hidden rounded-full',
          className
        )}>
        {!isLoaded && (
          <span
            {...(alt ? { role: 'img', 'aria-label': alt } : {})}
            className="flex size-full items-center justify-center bg-elevation-highlight text-icon-default">
            <Icon
              name="user"
              size={24}
            />
          </span>
        )}
        {image && status !== 'error' && (
          // The picture loads, lazily, under the glyph and replaces it once it is there. Only the
          // backend pictures go through the Next image optimiser: the others are hosted by identity
          // providers (or are local previews), which next/image must not be made to proxy.
          <Image
            key={image.src}
            ref={imageRef}
            src={image.src}
            alt={alt}
            width={size}
            height={size}
            loading="lazy"
            decoding="async"
            unoptimized={!image.optimized}
            aria-hidden={isLoaded ? undefined : true}
            className={cn(
              'size-full object-cover',
              !isLoaded && 'absolute inset-0 opacity-0'
            )}
            onLoad={() => setImageLoad({ src: image.src, status: 'loaded' })}
            onError={() => setImageLoad({ src: image.src, status: 'error' })}
          />
        )}
      </span>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar };
