import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CountBadge } from './CountBadge';

describe('CountBadge', () => {
  it('renders count and applies timeline classes', () => {
    // Given
    const { container } = testRender(
      <CountBadge
        count={7}
        bgFadedClass="bg-feedback-info-faded"
        textClass="text-feedback-info-primary"
      />
    );

    // When
    const countElement = screen.getByText('7');
    const backgroundElement = container.querySelector('div.absolute');

    // Then
    expect(countElement).toBeInTheDocument();
    expect(countElement).toHaveClass('text-feedback-info-primary');
    expect(backgroundElement).toBeInTheDocument();
    expect(backgroundElement).toHaveClass('bg-feedback-info-faded');
  });
});
