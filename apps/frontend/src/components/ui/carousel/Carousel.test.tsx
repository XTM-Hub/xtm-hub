import testRender from '@/utils/test/test-render';
import { act, fireEvent, screen } from '@testing-library/react';
import type { EmblaCarouselType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Carousel, CarouselItem, type CarouselProps } from './Carousel';

vi.mock('embla-carousel-react', () => ({ default: vi.fn() }));

type EmblaHandler = (api: EmblaCarouselType) => void;

const FIRST_SLIDE = 'First slide content';
const SECOND_SLIDE = 'Second slide content';
const THIRD_SLIDE = 'Third slide content';
const DEFAULT_PREVIOUS_LABEL = 'Previous slide';
const DEFAULT_NEXT_LABEL = 'Next slide';
const DEFAULT_SLIDE_LABEL_PREFIX = 'Go to slide';
const defaultSlideLabel = (slide: number) =>
  `${DEFAULT_SLIDE_LABEL_PREFIX} ${slide}`;
const CUSTOM_PREVIOUS_LABEL = 'Diapositive précédente';
const CUSTOM_NEXT_LABEL = 'Diapositive suivante';
const customSlideLabel = (slide: number) => `Aller à la diapositive ${slide}`;
const SELECTED_DOT_CLASS = 'bg-filigran-brand-primary';
const ROOT_CLASS = 'relative';
const CALLER_HEIGHT_CLASS = 'h-[35vh]';
const ITEM_CLASSES = [
  'relative',
  'min-w-0',
  'shrink-0',
  'grow-0',
  'basis-full',
  'px-2',
];
const CALLER_ITEM_CLASS = 'cursor-pointer';
const START_INDEX = 2;

const fakeState = {
  snaps: [0, 0, 0],
  selected: 0,
  canPrev: false,
  canNext: false,
};
let handlers: Record<string, EmblaHandler[]>;
let api: {
  scrollSnapList: ReturnType<typeof vi.fn>;
  selectedScrollSnap: ReturnType<typeof vi.fn>;
  canScrollPrev: ReturnType<typeof vi.fn>;
  canScrollNext: ReturnType<typeof vi.fn>;
  scrollPrev: ReturnType<typeof vi.fn>;
  scrollNext: ReturnType<typeof vi.fn>;
  scrollTo: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
};

const emit = (event: string) => {
  act(() => {
    handlers[event]?.forEach((handler) =>
      handler(api as unknown as EmblaCarouselType)
    );
  });
};

const renderCarousel = (props: Partial<CarouselProps> = {}) =>
  testRender(
    <Carousel {...props}>
      <CarouselItem>{FIRST_SLIDE}</CarouselItem>
      <CarouselItem>{SECOND_SLIDE}</CarouselItem>
      <CarouselItem>{THIRD_SLIDE}</CarouselItem>
    </Carousel>
  );

const getDots = () =>
  screen.getAllByRole('button', {
    name: (name) => name.startsWith(DEFAULT_SLIDE_LABEL_PREFIX),
  });

describe('Carousel', () => {
  beforeEach(() => {
    fakeState.snaps = [0, 0, 0];
    fakeState.selected = 0;
    fakeState.canPrev = false;
    fakeState.canNext = false;
    handlers = {};
    api = {
      scrollSnapList: vi.fn(() => fakeState.snaps),
      selectedScrollSnap: vi.fn(() => fakeState.selected),
      canScrollPrev: vi.fn(() => fakeState.canPrev),
      canScrollNext: vi.fn(() => fakeState.canNext),
      scrollPrev: vi.fn(),
      scrollNext: vi.fn(),
      scrollTo: vi.fn(),
      on: vi.fn((event: string, handler: EmblaHandler) => {
        handlers[event] = [...(handlers[event] ?? []), handler];
        return api;
      }),
      off: vi.fn((event: string, handler: EmblaHandler) => {
        handlers[event] = (handlers[event] ?? []).filter(
          (registered) => registered !== handler
        );
        return api;
      }),
    };
    vi.mocked(useEmblaCarousel).mockImplementation(
      () => [vi.fn(), api] as unknown as ReturnType<typeof useEmblaCarousel>
    );
  });

  it('should render a carousel region with its slides when children are given', () => {
    // Given / When
    renderCarousel();

    // Then
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    const slides = screen.getAllByRole('group');
    expect(slides).toHaveLength(3);
    slides.forEach((slide) =>
      expect(slide).toHaveAttribute('aria-roledescription', 'slide')
    );
    expect(slides[0]).toHaveTextContent(FIRST_SLIDE);
    expect(slides[1]).toHaveTextContent(SECOND_SLIDE);
    expect(slides[2]).toHaveTextContent(THIRD_SLIDE);
  });

  it('should pass the options to Embla over a looping horizontal default when opts are given', () => {
    // Given / When
    renderCarousel({ opts: { startIndex: START_INDEX, loop: false } });

    // Then
    expect(useEmblaCarousel).toHaveBeenCalledWith({
      loop: false,
      startIndex: START_INDEX,
      axis: 'x',
    });
  });

  it('should loop horizontally when no option is given', () => {
    // Given / When
    renderCarousel();

    // Then
    expect(useEmblaCarousel).toHaveBeenCalledWith({ loop: true, axis: 'x' });
  });

  it('should name the controls in English when no label is given', () => {
    // Given / When
    renderCarousel();

    // Then
    expect(
      screen.getByRole('button', { name: DEFAULT_PREVIOUS_LABEL })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: DEFAULT_NEXT_LABEL })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: defaultSlideLabel(1) })
    ).toBeInTheDocument();
  });

  it('should name the controls with the labels when they are given', () => {
    // Given / When
    renderCarousel({
      previousLabel: CUSTOM_PREVIOUS_LABEL,
      nextLabel: CUSTOM_NEXT_LABEL,
      slideLabel: customSlideLabel,
    });

    // Then
    expect(
      screen.getByRole('button', { name: CUSTOM_PREVIOUS_LABEL })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: CUSTOM_NEXT_LABEL })
    ).toBeInTheDocument();
    [1, 2, 3].forEach((slide) =>
      expect(
        screen.getByRole('button', { name: customSlideLabel(slide) })
      ).toBeInTheDocument()
    );
  });

  it('should enable the buttons when a select event says Embla can scroll', () => {
    // Given
    renderCarousel();
    const previous = screen.getByRole('button', {
      name: DEFAULT_PREVIOUS_LABEL,
    });
    const next = screen.getByRole('button', { name: DEFAULT_NEXT_LABEL });
    expect(previous).toBeDisabled();
    expect(next).toBeDisabled();

    // When
    fakeState.canPrev = true;
    fakeState.canNext = true;
    emit('select');

    // Then
    expect(previous).toBeEnabled();
    expect(next).toBeEnabled();
  });

  it.each([
    {
      label: DEFAULT_PREVIOUS_LABEL,
      scroll: 'scrollPrev',
      other: 'scrollNext',
    },
    {
      label: DEFAULT_NEXT_LABEL,
      scroll: 'scrollNext',
      other: 'scrollPrev',
    },
  ] as const)(
    'should call $scroll when the $label button is clicked',
    async ({ label, scroll, other }) => {
      // Given
      fakeState.canPrev = true;
      fakeState.canNext = true;
      const { user } = renderCarousel();

      // When
      await user.click(screen.getByRole('button', { name: label }));

      // Then
      expect(api[scroll]).toHaveBeenCalledTimes(1);
      expect(api[other]).not.toHaveBeenCalled();
    }
  );

  it('should mark and fill only the selected dot when there is one dot per snap', () => {
    // Given
    fakeState.selected = 1;

    // When
    renderCarousel();

    // Then
    const dots = getDots();
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute('aria-current', 'false');
    expect(dots[0]).not.toHaveClass(SELECTED_DOT_CLASS);
    expect(dots[1]).toHaveAttribute('aria-current', 'true');
    expect(dots[1]).toHaveClass(SELECTED_DOT_CLASS);
    expect(dots[2]).toHaveAttribute('aria-current', 'false');
  });

  it('should scroll to the slide of a dot when it is clicked', async () => {
    // Given
    const { user } = renderCarousel();

    // When
    await user.click(
      screen.getByRole('button', { name: defaultSlideLabel(3) })
    );

    // Then
    expect(api.scrollTo).toHaveBeenCalledWith(2);
  });

  it.each([
    { selected: 0, first: 1, last: 6 },
    { selected: 5, first: 3, last: 8 },
    { selected: 9, first: 5, last: 10 },
  ])(
    'should render six dots from slide $first to $last when slide $selected of ten is selected',
    ({ selected, first, last }) => {
      // Given
      fakeState.snaps = Array.from({ length: 10 }, () => 0);
      fakeState.selected = selected;

      // When
      renderCarousel();

      // Then
      const dots = getDots();
      expect(dots).toHaveLength(6);
      expect(dots[0]).toHaveAccessibleName(defaultSlideLabel(first));
      expect(dots[5]).toHaveAccessibleName(defaultSlideLabel(last));
      expect(
        screen.getByRole('button', { name: defaultSlideLabel(selected + 1) })
      ).toHaveAttribute('aria-current', 'true');
    }
  );

  it('should render six dots from slide 1 to 6 when there are exactly six snaps and the last is selected', () => {
    // Given
    fakeState.snaps = Array.from({ length: 6 }, () => 0);
    fakeState.selected = 5;

    // When
    renderCarousel();

    // Then
    const dots = getDots();
    expect(dots).toHaveLength(6);
    dots.forEach((dot, index) =>
      expect(dot).toHaveAccessibleName(defaultSlideLabel(index + 1))
    );
    expect(dots[5]).toHaveAttribute('aria-current', 'true');
  });

  it.each([
    { key: 'ArrowLeft', scroll: 'scrollPrev', other: 'scrollNext' },
    { key: 'ArrowRight', scroll: 'scrollNext', other: 'scrollPrev' },
  ] as const)(
    'should call $scroll and prevent the default when $key is pressed inside',
    ({ key, scroll, other }) => {
      // Given
      renderCarousel();

      // When
      const notPrevented = fireEvent.keyDown(screen.getByText(SECOND_SLIDE), {
        key,
      });

      // Then
      expect(api[scroll]).toHaveBeenCalledTimes(1);
      expect(api[other]).not.toHaveBeenCalled();
      expect(notPrevented).toBe(false);
    }
  );

  it('should neither scroll nor prevent the default when another key is pressed inside', () => {
    // Given
    renderCarousel();

    // When
    const notPrevented = fireEvent.keyDown(screen.getByText(SECOND_SLIDE), {
      key: 'Enter',
    });

    // Then
    expect(api.scrollPrev).not.toHaveBeenCalled();
    expect(api.scrollNext).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  it('should unsubscribe from Embla when unmounted', () => {
    // Given
    const { unmount } = renderCarousel();
    const selectHandler = handlers.select[0];
    const reInitHandler = handlers.reInit[0];

    // When
    unmount();

    // Then
    expect(api.off).toHaveBeenCalledWith('select', selectHandler);
    expect(api.off).toHaveBeenCalledWith('reInit', reInitHandler);
    expect(handlers.select).toHaveLength(0);
    expect(handlers.reInit).toHaveLength(0);
  });

  it('should merge the className and forward the ref on the root and on the items when both are given', () => {
    // Given
    const rootRef = createRef<HTMLDivElement>();
    const itemRef = createRef<HTMLDivElement>();

    // When
    testRender(
      <Carousel
        ref={rootRef}
        className={CALLER_HEIGHT_CLASS}>
        <CarouselItem
          ref={itemRef}
          className={CALLER_ITEM_CLASS}>
          {FIRST_SLIDE}
        </CarouselItem>
      </Carousel>
    );

    // Then
    const region = screen.getByRole('region');
    const slide = screen.getByRole('group');
    expect(rootRef.current).toBe(region);
    expect(region).toHaveClass(ROOT_CLASS, CALLER_HEIGHT_CLASS);
    expect(itemRef.current).toBe(slide);
    expect(slide).toHaveClass(...ITEM_CLASSES, CALLER_ITEM_CLASS);
  });
});
