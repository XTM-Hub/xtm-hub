import type { ComponentMeta } from '@filigran/design-system/meta';

export const CarouselMeta: ComponentMeta = {
  name: 'Carousel',
  description:
    'A looping horizontal strip of full-width slides, on Embla: primary previous and next icon buttons (36px, 16px chevrons) centred vertically on the left and right sides, up to six 16px dots centred at the bottom around the current slide, and ArrowLeft / ArrowRight to scroll. Has no surface or slide styling of its own: the caller sizes the root (a height class) and fills each CarouselItem, which only adds 8px of horizontal padding.',
  status: 'beta',
  category: 'data-display',
  version: '0.1.0',
  radixPrimitive: 'none',
  variants: ['default'],
  sizes: [],
  examples: [
    '<Carousel className="h-[35vh]">{images.map((image) => <CarouselItem key={image.id}><Image fill src={image.src} alt={image.alt} /></CarouselItem>)}</Carousel>',
    '<Carousel opts={{ startIndex: 2 }} previousLabel={t("DesignSystem.Carousel.Previous")} nextLabel={t("DesignSystem.Carousel.Next")} slideLabel={(slide) => t("DesignSystem.Carousel.GoToSlide", { slide })}><CarouselItem>…</CarouselItem><CarouselItem>…</CarouselItem><CarouselItem>…</CarouselItem></Carousel>',
  ],
  props: {
    opts: "Omit<EmblaOptionsType, 'axis'> (optional, on Carousel) - Embla options, merged over the default { loop: true }; the axis is always horizontal (startIndex sets the first slide shown).",
    previousLabel:
      "string (optional, default 'Previous slide', on Carousel) - the accessible name of the previous button; pass a translation.",
    nextLabel:
      "string (optional, default 'Next slide', on Carousel) - the accessible name of the next button; pass a translation.",
    slideLabel:
      '(slide: number) => string (optional, default (slide) => `Go to slide ${slide}`, on Carousel) - the accessible name of each dot, from its 1-based slide number; pass a translation.',
    children:
      'ReactNode (on Carousel) - the CarouselItem slides, each one full width.',
    className:
      'string (optional, on Carousel and CarouselItem) - extra classes, merged last with tailwind-merge (a height on the root sizes the strip; a px-0 on an item replaces its px-2).',
    ref: 'React.Ref (optional) - forwarded to the root <div> and to the CarouselItem <div>.',
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    contrastPairs: [
      {
        id: 'button glyph on brand primary',
        fg: '--text-negative-primary',
        bg: '--color-filigran-brand-primary',
        minRatio: 3,
      },
      {
        id: 'dot on default elevation',
        fg: '--color-filigran-brand-primary',
        bg: '--bg-elevation-default',
        minRatio: 3,
      },
      {
        id: 'focus ring',
        fg: '--color-filigran-brand-primary',
        bg: '--bg-elevation-default',
        minRatio: 3,
      },
    ],
    notes:
      'The root is a region with aria-roledescription="carousel"; each slide is a group with aria-roledescription="slide". The previous, next and dot buttons are named by previousLabel, nextLabel and slideLabel; the buttons are disabled when Embla cannot scroll that way, and the dot of the current slide carries aria-current. ArrowLeft and ArrowRight pressed anywhere inside scroll to the previous and next slide.',
  },
};
