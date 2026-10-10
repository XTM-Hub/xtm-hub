import testRender from '@/utils/test/test-render';
import { screen, within } from '@testing-library/react';
import useEmblaCarousel from 'embla-carousel-react';
import { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShareableResourceCarousel from './ShareableResourceCarouselView';

vi.mock('embla-carousel-react', () => ({ default: vi.fn() }));

type CarouselViewProps = ComponentProps<typeof ShareableResourceCarousel>;

const SERVICE_INSTANCE_ID = 'service-instance-id';
const FIRST_IMAGE_ID = 'first-image-id';
const SECOND_IMAGE_ID = 'second-image-id';
const IMAGES = [
  { id: FIRST_IMAGE_ID },
  { id: SECOND_IMAGE_ID },
] as unknown as CarouselViewProps['images'];
const SERVICE_INSTANCE = {
  id: SERVICE_INSTANCE_ID,
} as unknown as CarouselViewProps['serviceInstance'];
const PREVIOUS_KEY = 'DesignSystem.Carousel.Previous';
const NEXT_KEY = 'DesignSystem.Carousel.Next';
const GO_TO_SLIDE_KEY = 'DesignSystem.Carousel.GoToSlide';
const CLICKED_SLIDE_INDEX = 1;

const renderView = (images: CarouselViewProps['images']) =>
  testRender(
    <ShareableResourceCarousel
      images={images}
      serviceInstance={SERVICE_INSTANCE}
    />
  );

describe('ShareableResourceCarousel', () => {
  beforeEach(() => {
    const api = {
      scrollSnapList: vi.fn(() => [0, 0]),
      selectedScrollSnap: vi.fn(() => 0),
      canScrollPrev: vi.fn(() => true),
      canScrollNext: vi.fn(() => true),
      scrollPrev: vi.fn(),
      scrollNext: vi.fn(),
      scrollTo: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };
    api.on.mockReturnValue(api);
    api.off.mockReturnValue(api);
    vi.mocked(useEmblaCarousel).mockImplementation(
      () => [vi.fn(), api] as unknown as ReturnType<typeof useEmblaCarousel>
    );
  });

  it.each([
    { label: 'undefined', images: undefined },
    { label: 'empty', images: [] as unknown as CarouselViewProps['images'] },
  ])('should render nothing when images are $label', ({ images }) => {
    // Given / When
    const { container } = renderView(images);

    // Then
    expect(container).toBeEmptyDOMElement();
  });

  it('should render a carousel of the images with translated controls when images are given', () => {
    // Given / When
    renderView(IMAGES);

    // Then
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    const slides = within(region).getAllByRole('group');
    expect(slides).toHaveLength(2);
    expect(within(slides[0]).getByRole('img')).toHaveAttribute(
      'src',
      `/document/images/${SERVICE_INSTANCE_ID}/${FIRST_IMAGE_ID}`
    );
    expect(within(slides[1]).getByRole('img')).toHaveAttribute(
      'src',
      `/document/images/${SERVICE_INSTANCE_ID}/${SECOND_IMAGE_ID}`
    );
    expect(
      within(region).getByRole('button', { name: PREVIOUS_KEY })
    ).toBeInTheDocument();
    expect(
      within(region).getByRole('button', { name: NEXT_KEY })
    ).toBeInTheDocument();
    expect(
      within(region).getAllByRole('button', { name: GO_TO_SLIDE_KEY })
    ).toHaveLength(2);
  });

  it('should open a dialog with a second carousel when a slide is clicked', async () => {
    // Given
    const { user } = renderView(IMAGES);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // When
    await user.click(screen.getAllByRole('group')[CLICKED_SLIDE_INDEX]);

    // Then
    const dialog = screen.getByRole('dialog');
    const enlarged = within(dialog).getByRole('region');
    expect(enlarged).toHaveAttribute('aria-roledescription', 'carousel');
    expect(within(enlarged).getAllByRole('group')).toHaveLength(2);
    expect(
      within(enlarged).getByRole('button', { name: PREVIOUS_KEY })
    ).toBeInTheDocument();
    expect(
      within(enlarged).getByRole('button', { name: NEXT_KEY })
    ).toBeInTheDocument();
    expect(
      within(enlarged).getAllByRole('button', { name: GO_TO_SLIDE_KEY })
    ).toHaveLength(2);
    expect(useEmblaCarousel).toHaveBeenCalledWith({
      loop: true,
      startIndex: CLICKED_SLIDE_INDEX,
      axis: 'x',
    });
  });
});
