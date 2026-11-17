import ShareableResourceDescription from '@/components/service/document/ShareableResourceDescription';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const renderDescription = () =>
  testRender(
    <ShareableResourceDescription
      shortDescription="A short description"
      longDescription="Some **long** description"
    />
  );

describe('ShareableResourceDescription', () => {
  it('should display the Overview title as a level 2 heading', () => {
    // Given / When
    renderDescription();

    // Then
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Service.ShareableResources.Details.Overview',
      })
    ).toBeInTheDocument();
  });

  it('should display the short description as a level 3 heading and the long description', () => {
    // Given / When
    renderDescription();

    // Then
    expect(
      screen.getByRole('heading', { level: 3, name: 'A short description' })
    ).toBeInTheDocument();
    expect(screen.getByText('long')).toBeInTheDocument();
  });

  it('should render the descriptions in a design system Paper that scrolls horizontally, with the title outside of it', () => {
    // Given / When
    renderDescription();

    // Then
    const surface = screen
      .getByRole('heading', { level: 3, name: 'A short description' })
      .closest('section');
    expect(surface).toHaveClass('overflow-x-auto');
    expect(surface).not.toContainElement(
      screen.getByRole('heading', {
        level: 2,
        name: 'Service.ShareableResources.Details.Overview',
      })
    );
  });
});
