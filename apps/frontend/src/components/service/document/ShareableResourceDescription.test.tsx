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

const getOverviewTitle = () =>
  screen.getByRole('heading', {
    level: 2,
    name: 'Service.ShareableResources.Details.Overview',
  });

const getShortDescription = () =>
  screen.getByRole('heading', { level: 3, name: 'A short description' });

describe('ShareableResourceDescription', () => {
  it('should display the Overview title as a level 2 heading', () => {
    // Given / When
    renderDescription();

    // Then
    expect(getOverviewTitle()).toBeInTheDocument();
  });

  it('should display the short description as a level 3 heading and the long description', () => {
    // Given / When
    renderDescription();

    // Then
    expect(getShortDescription()).toBeInTheDocument();
    expect(screen.getByText('long')).toBeInTheDocument();
  });

  it('should render the descriptions on the design system Paper surface, with the title above it', () => {
    // Given / When
    renderDescription();

    // Then
    const surface = getShortDescription().closest('section');
    // The surface carries the design system radius and padding classes. These
    // pin the design system's class names on purpose, as jsdom does no layout:
    // a rename in the design system needs this test updated.
    expect(surface).toHaveClass('rounded-sm', 'p-4');
    expect(surface).not.toContainElement(getOverviewTitle());
    expect(surface?.parentElement).toContainElement(getOverviewTitle());
  });

  it('should separate the short description from the long description with a gap', () => {
    // Given / When
    renderDescription();

    // Then
    // The gap is asserted through its classes on purpose, as jsdom does no
    // layout: changing them needs this test updated
    const descriptions = getShortDescription().parentElement;
    expect(descriptions).toHaveClass('flex', 'flex-col', 'gap-8');
    expect(descriptions).toContainElement(screen.getByText('long'));
  });

  it('should let a long description scroll horizontally inside its surface', () => {
    // Given / When
    renderDescription();

    // Then
    // The class is the only hook for overflow in jsdom, which does not lay out
    expect(getShortDescription().closest('section')).toHaveClass(
      'overflow-x-auto'
    );
  });
});
