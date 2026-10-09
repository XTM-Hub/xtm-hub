'use client';

import { cn } from '@/lib/utils';
import { Icon } from '@filigran/design-system';
import * as React from 'react';

export interface AvatarProps extends Omit<
  React.ComponentPropsWithoutRef<'span'>,
  'children' | 'dangerouslySetInnerHTML'
> {
  src?: string;
  alt?: string;
}

interface ImageLoad {
  src: string;
  status: 'loaded' | 'error';
}

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, src, alt = '', ...props }, ref) => {
    const [imageLoad, setImageLoad] = React.useState<ImageLoad | null>(null);

    React.useLayoutEffect(() => {
      if (!src) {
        return;
      }
      const image = new window.Image();
      image.onload = () => setImageLoad({ src, status: 'loaded' });
      image.onerror = () => setImageLoad({ src, status: 'error' });
      image.src = src;
      if (image.complete && image.naturalWidth > 0) {
        // A picture the browser already holds is shown before paint, so it never flashes the glyph.
        setImageLoad({ src, status: 'loaded' });
        image.onload = null;
        image.onerror = null;
      }
      return () => {
        image.onload = null;
        image.onerror = null;
      };
    }, [src]);

    const isLoaded =
      !!src && imageLoad?.src === src && imageLoad.status === 'loaded';

    return (
      <span
        ref={ref}
        {...props}
        className={cn(
          'relative flex size-full shrink-0 items-center justify-center overflow-hidden rounded-full',
          className
        )}>
        {isLoaded ? (
          // Pictures come from any identity provider host and are preloaded here already.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="size-full object-cover"
          />
        ) : (
          <span
            {...(alt ? { role: 'img', 'aria-label': alt } : {})}
            className="flex size-full items-center justify-center bg-elevation-highlight text-icon-default">
            <Icon
              name="user"
              size={24}
            />
          </span>
        )}
      </span>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar };
