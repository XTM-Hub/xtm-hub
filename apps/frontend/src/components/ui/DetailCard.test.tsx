import AnalyticsClickCapture from '@/components/analytics/AnalyticsClickCapture';
import { DetailCard } from '@/components/ui/DetailCard';
import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ELEMENT_ID = 'roadmap_epic_open';
const PAGE_TYPE = 'Home';
const TITLE = 'Epic title';
const DESCRIPTION = 'Epic description';
const NO_OPEN_AREA = 'Area that keeps the detail closed';

const renderCard = (onOpenDetail: () => void) =>
  testRender(
    <>
      <AnalyticsClickCapture pageType={PAGE_TYPE} />
      <DetailCard
        onOpenDetail={onOpenDetail}
        analyticsId={ELEMENT_ID}
        title={TITLE}
        description={DESCRIPTION}
        extra={<div data-no-open-detail>{NO_OPEN_AREA}</div>}
      />
    </>
  );

beforeEach(() => {
  startAnalytics();
});

describe('DetailCard', () => {
  it('should send one ui_click with the card ID and open the detail once when the description is clicked', async () => {
    // Given
    const onOpenDetail = vi.fn();
    const { user } = renderCard(onOpenDetail);

    // When
    await user.click(screen.getByText(DESCRIPTION));

    // Then
    expect(readTrackedEvents('ui_click')).toEqual([
      expect.objectContaining({ element_id: ELEMENT_ID }),
    ]);
    expect(onOpenDetail).toHaveBeenCalledOnce();
  });

  it('should send no ui_click and keep the detail closed when an area that does not open the detail is clicked', async () => {
    // Given
    const onOpenDetail = vi.fn();
    const { user } = renderCard(onOpenDetail);

    // When
    await user.click(screen.getByText(NO_OPEN_AREA));

    // Then
    expect(readTrackedEvents('ui_click')).toEqual([]);
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it('should focus the title button on Tab', async () => {
    // Given
    const { user } = renderCard(vi.fn());

    // When
    await user.tab();

    // Then
    expect(screen.getByRole('button', { name: TITLE })).toHaveFocus();
  });

  it('should open the detail once when Enter is pressed on the focused title button', async () => {
    // Given
    const onOpenDetail = vi.fn();
    const { user } = renderCard(onOpenDetail);

    // When
    await user.tab();
    await user.keyboard('{Enter}');

    // Then
    expect(onOpenDetail).toHaveBeenCalledOnce();
  });

  // jsdom cannot evaluate `:has(:focus-visible)`: this only guards the ring
  // target (the card root, keyed on the title button) against regressing to
  // a ring on the title alone.
  it('should key the focus ring of the card root on the title button and not ring the title itself', () => {
    // Given
    const { container } = renderCard(vi.fn());

    // When
    const title = screen.getByRole('button', { name: TITLE });
    const card = container.firstElementChild;

    // Then
    expect(title).toHaveAttribute('data-detail-title');
    expect(card).toHaveClass(
      'has-[[data-detail-title]:focus-visible]:ring-2',
      'has-[[data-detail-title]:focus-visible]:ring-focus'
    );
    expect(title.className).not.toMatch(/\bring/);
  });
});
