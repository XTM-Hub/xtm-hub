import { ShareableResourceBasicInformation } from '@/components/service/document/ui/ShareableResourceBasicInformation';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const renderBasicInformation = () =>
  testRender(
    <ShareableResourceBasicInformation>
      <span>Item</span>
    </ShareableResourceBasicInformation>
  );

const getTitle = () =>
  screen.getByRole('heading', {
    level: 2,
    name: 'Service.ShareableResources.Details.BasicInformation',
  });

describe('ShareableResourceBasicInformation', () => {
  it('should display the Basic information title as a level 2 heading', () => {
    // Given / When
    renderBasicInformation();

    // Then
    expect(getTitle()).toBeInTheDocument();
  });

  it('should render its children on the design system Paper surface, with the title above it', () => {
    // Given / When
    renderBasicInformation();

    // Then
    const surface = screen.getByText('Item').closest('section');
    // The design system radius, not the hand-made `rounded`
    expect(surface).toHaveClass('rounded-sm', 'p-4');
    expect(surface).not.toContainElement(getTitle());
    expect(surface?.parentElement).toContainElement(getTitle());
  });
});
