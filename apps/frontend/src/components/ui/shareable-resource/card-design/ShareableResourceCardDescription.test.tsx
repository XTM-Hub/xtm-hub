import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShareableResourceCardDescription } from './ShareableResourceCardDescription';

const DESCRIPTION = 'A description';

describe('ShareableResourceCardDescription', () => {
  it('should clamp the description at three lines when the screen is wide', () => {
    // Given / When
    testRender(<ShareableResourceCardDescription description={DESCRIPTION} />);

    // Then
    const description = screen.getByText(DESCRIPTION);
    expect(description).toHaveClass('[-webkit-line-clamp:3]');
    expect(description.className).not.toMatch(/sm:\[-webkit-line-clamp/);
  });
});
