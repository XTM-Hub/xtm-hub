import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { Separator } from './Separator';

const TEST_ID = 'separator';
const COLOUR_CLASS = 'border-elevation-subtle';
const HORIZONTAL_CLASSES = ['w-full', 'border-t'];
const VERTICAL_FULL_HEIGHT_CLASS = 'h-full';
const VERTICAL_CLASSES = [VERTICAL_FULL_HEIGHT_CLASS, 'border-l'];
const CALLER_HEIGHT_CLASS = 'h-5';
const SPACING_CLASS = 'my-s';

describe('Separator', () => {
  it('should stay out of the accessibility tree when decorative is not set', () => {
    // Given
    testRender(<Separator data-testid={TEST_ID} />);

    // When
    const separator = screen.getByTestId(TEST_ID);

    // Then
    expect(separator).toHaveAttribute('role', 'none');
  });

  it('should leave out aria-orientation when decorative is not set and vertical', () => {
    // Given
    testRender(
      <Separator
        data-testid={TEST_ID}
        orientation="vertical"
      />
    );

    // When
    const separator = screen.getByTestId(TEST_ID);

    // Then
    expect(separator).not.toHaveAttribute('aria-orientation');
  });

  it('should expose the separator role without aria-orientation when decorative is false and horizontal', () => {
    // Given
    testRender(<Separator decorative={false} />);

    // When
    const separator = screen.getByRole('separator');

    // Then
    expect(separator).not.toHaveAttribute('aria-orientation');
  });

  it('should expose the vertical aria-orientation when decorative is false and vertical', () => {
    // Given
    testRender(
      <Separator
        decorative={false}
        orientation="vertical"
      />
    );

    // When
    const separator = screen.getByRole('separator');

    // Then
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
  });

  it.each([
    [undefined, 'horizontal', HORIZONTAL_CLASSES],
    ['horizontal' as const, 'horizontal', HORIZONTAL_CLASSES],
    ['vertical' as const, 'vertical', VERTICAL_CLASSES],
  ])(
    'should draw the matching rule when orientation is %s',
    (orientation, expectedDataOrientation, expectedClasses) => {
      // Given
      testRender(
        <Separator
          data-testid={TEST_ID}
          orientation={orientation}
        />
      );

      // When
      const separator = screen.getByTestId(TEST_ID);

      // Then
      expect(separator).toHaveAttribute(
        'data-orientation',
        expectedDataOrientation
      );
      expect(separator).toHaveClass(COLOUR_CLASS, ...expectedClasses);
    }
  );

  it('should replace the vertical full height when the caller gives a height', () => {
    // Given
    testRender(
      <Separator
        data-testid={TEST_ID}
        orientation="vertical"
        className={CALLER_HEIGHT_CLASS}
      />
    );

    // When
    const separator = screen.getByTestId(TEST_ID);

    // Then
    expect(separator).toHaveClass(CALLER_HEIGHT_CLASS);
    expect(separator).not.toHaveClass(VERTICAL_FULL_HEIGHT_CLASS);
  });

  it('should merge the classes when a className is given', () => {
    // Given
    testRender(
      <Separator
        data-testid={TEST_ID}
        className={SPACING_CLASS}
      />
    );

    // When
    const separator = screen.getByTestId(TEST_ID);

    // Then
    expect(separator).toHaveClass(
      SPACING_CLASS,
      COLOUR_CLASS,
      ...HORIZONTAL_CLASSES
    );
  });

  it('should reach the div element when a ref is given', () => {
    // Given
    const ref = createRef<HTMLDivElement>();

    // When
    testRender(
      <Separator
        ref={ref}
        data-testid={TEST_ID}
      />
    );

    // Then
    expect(ref.current).toBe(screen.getByTestId(TEST_ID));
    expect(ref.current?.tagName).toBe('DIV');
  });
});
