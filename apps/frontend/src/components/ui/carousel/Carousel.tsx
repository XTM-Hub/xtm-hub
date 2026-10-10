'use client';

import { cn } from '@/lib/utils';
import { Icon, IconButton } from '@filigran/design-system';
import type { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import * as React from 'react';

const MAX_DOTS = 6;

export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  opts?: Omit<EmblaOptionsType, 'axis'>;
  previousLabel?: string;
  nextLabel?: string;
  slideLabel?: (slide: number) => string;
}

export type CarouselItemProps = React.HTMLAttributes<HTMLDivElement>;

const defaultSlideLabel = (slide: number) => `Go to slide ${slide}`;

const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  (
    {
      opts,
      previousLabel = 'Previous slide',
      nextLabel = 'Next slide',
      slideLabel = defaultSlideLabel,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [viewportRef, api] = useEmblaCarousel({
      loop: true,
      ...opts,
      axis: 'x',
    });
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);

    React.useEffect(() => {
      if (!api) {
        return;
      }

      const sync = (emblaApi: EmblaCarouselType) => {
        setSelectedIndex(emblaApi.selectedScrollSnap());
        setScrollSnaps(emblaApi.scrollSnapList());
        setCanScrollPrev(emblaApi.canScrollPrev());
        setCanScrollNext(emblaApi.canScrollNext());
      };

      sync(api);
      api.on('select', sync).on('reInit', sync);

      return () => {
        api.off('select', sync);
        api.off('reInit', sync);
      };
    }, [api]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        api?.scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        api?.scrollNext();
      }
    };

    const total = scrollSnaps.length;
    const start = Math.max(
      0,
      Math.min(selectedIndex - Math.floor(MAX_DOTS / 2), total - MAX_DOTS)
    );
    const end = Math.min(start + MAX_DOTS, total);

    return (
      <div
        ref={ref}
        role="region"
        aria-roledescription="carousel"
        onKeyDownCapture={handleKeyDown}
        className={cn('relative', className)}
        {...props}>
        <div
          ref={viewportRef}
          className="h-full overflow-hidden">
          <div className="flex h-full">{children}</div>
        </div>
        <IconButton
          priority="primary"
          aria-label={previousLabel}
          icon={
            <Icon
              name="chevron-left"
              size={16}
            />
          }
          disabled={!canScrollPrev}
          onClick={() => api?.scrollPrev()}
          className="absolute top-1/2 left-4 -translate-y-1/2"
        />
        <IconButton
          priority="primary"
          aria-label={nextLabel}
          icon={
            <Icon
              name="chevron-right"
              size={16}
            />
          }
          disabled={!canScrollNext}
          onClick={() => api?.scrollNext()}
          className="absolute top-1/2 right-4 -translate-y-1/2"
        />
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {scrollSnaps.slice(start, end).map((_, offset) => {
            const index = start + offset;
            const selected = index === selectedIndex;
            return (
              <button
                key={index}
                type="button"
                aria-label={slideLabel(index + 1)}
                aria-current={selected}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  'size-4 cursor-pointer rounded-full border border-filigran-brand-primary bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-filigran-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-focus',
                  selected && 'bg-filigran-brand-primary'
                )}
              />
            );
          })}
        </div>
      </div>
    );
  }
);
Carousel.displayName = 'Carousel';

const CarouselItem = React.forwardRef<HTMLDivElement, CarouselItemProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        'relative min-w-0 shrink-0 grow-0 basis-full px-2',
        className
      )}
      {...props}
    />
  )
);
CarouselItem.displayName = 'CarouselItem';

export { Carousel, CarouselItem };
