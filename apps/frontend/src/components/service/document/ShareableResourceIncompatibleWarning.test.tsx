import { ShareableResourceIncompatibleWarning } from '@/components/service/document/ShareableResourceIncompatibleWarning';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const MESSAGE = 'This resource is not compatible with your platform version';

describe('ShareableResourceIncompatibleWarning', () => {
  it('should show the message', () => {
    // Given / When
    testRender(<ShareableResourceIncompatibleWarning message={MESSAGE} />);

    // Then
    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
  });

  it('should hide the decorative icon from assistive technology', () => {
    // Given / When
    const { container } = testRender(
      <ShareableResourceIncompatibleWarning message={MESSAGE} />
    );

    // Then
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });
});
