import { ShareableResourceBasicInformation } from '@/components/service/document/ui/ShareableResourceBasicInformation';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('ShareableResourceBasicInformation', () => {
  it('should display the Basic information title as a level 2 heading', () => {
    // Given / When
    testRender(
      <ShareableResourceBasicInformation>
        <span>Item</span>
      </ShareableResourceBasicInformation>
    );

    // Then
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Service.ShareableResources.Details.BasicInformation',
      })
    ).toBeInTheDocument();
  });

  it('should render its children in a surface that does not contain the title', () => {
    // Given / When
    testRender(
      <ShareableResourceBasicInformation>
        <span>Item</span>
      </ShareableResourceBasicInformation>
    );

    // Then
    const surface = screen.getByText('Item').closest('section');
    expect(surface).toBeInTheDocument();
    expect(surface).not.toContainElement(
      screen.getByRole('heading', {
        level: 2,
        name: 'Service.ShareableResources.Details.BasicInformation',
      })
    );
  });
});
