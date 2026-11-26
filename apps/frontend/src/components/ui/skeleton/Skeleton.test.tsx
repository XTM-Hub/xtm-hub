import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

const TEST_ID = 'skeleton';
const NATIVE_ID = 'placeholder';
const FILL_CLASS = 'bg-feedback-neutral-secondary';
const RADIUS_CLASS = 'rounded-sm';
const PULSE_CLASS = 'motion-safe:animate-pulse';
const CALLER_RADIUS_CLASS = 'rounded-full';
const CALLER_SIZE_CLASSES = ['h-24', 'w-full'];

describe('Skeleton', () => {
  it('should render an empty div with no role', () => {
    // Given
    testRender(<Skeleton data-testid={TEST_ID} />);

    // When
    const skeleton = screen.getByTestId(TEST_ID);

    // Then
    expect(skeleton.tagName).toBe('DIV');
    expect(skeleton).toBeEmptyDOMElement();
    expect(skeleton).not.toHaveAttribute('role');
  });

  it('should draw the neutral fill, the radius and the motion-safe pulse', () => {
    // Given
    testRender(<Skeleton data-testid={TEST_ID} />);

    // When
    const skeleton = screen.getByTestId(TEST_ID);

    // Then
    expect(skeleton).toHaveClass(FILL_CLASS, RADIUS_CLASS, PULSE_CLASS);
  });

  it('should replace the default radius when the caller gives rounded-full', () => {
    // Given
    testRender(
      <Skeleton
        data-testid={TEST_ID}
        className={CALLER_RADIUS_CLASS}
      />
    );

    // When
    const skeleton = screen.getByTestId(TEST_ID);

    // Then
    expect(skeleton).toHaveClass(CALLER_RADIUS_CLASS);
    expect(skeleton).not.toHaveClass(RADIUS_CLASS);
  });

  it('should merge the classes when a className is given', () => {
    // Given
    testRender(
      <Skeleton
        data-testid={TEST_ID}
        className={CALLER_SIZE_CLASSES.join(' ')}
      />
    );

    // When
    const skeleton = screen.getByTestId(TEST_ID);

    // Then
    expect(skeleton).toHaveClass(
      ...CALLER_SIZE_CLASSES,
      FILL_CLASS,
      RADIUS_CLASS,
      PULSE_CLASS
    );
  });

  it('should pass native attributes through to the div', () => {
    // Given
    testRender(
      <Skeleton
        data-testid={TEST_ID}
        id={NATIVE_ID}
      />
    );

    // When
    const skeleton = screen.getByTestId(TEST_ID);

    // Then
    expect(skeleton).toHaveAttribute('id', NATIVE_ID);
  });

  it('should reach the div element when a ref is given', () => {
    // Given
    const ref = createRef<HTMLDivElement>();

    // When
    testRender(
      <Skeleton
        ref={ref}
        data-testid={TEST_ID}
      />
    );

    // Then
    expect(ref.current).toBe(screen.getByTestId(TEST_ID));
  });
});
