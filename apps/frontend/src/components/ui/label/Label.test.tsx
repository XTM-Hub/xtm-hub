import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { Label } from './Label';

const LABEL_TEXT = 'Organization name';
const CONTROL_ID = 'organization-name';
const LABEL_COLOUR_CLASS = 'text-input-label';
const ERROR_COLOUR_CLASS = 'text-input-error';
const COMPACT_MEDIUM_SIZE_CLASS = 'text-content-compact-medium';
const LAYOUT_CLASS = 'block';
const SPACING_CLASS = 'pb-s';

describe('Label', () => {
  it('should render a label element when given its text', () => {
    // Given
    testRender(<Label>{LABEL_TEXT}</Label>);

    // When
    const label = screen.getByText(LABEL_TEXT);

    // Then
    expect(label.tagName).toBe('LABEL');
  });

  it('should name the control when htmlFor points to its id', () => {
    // Given
    testRender(
      <>
        <Label htmlFor={CONTROL_ID}>{LABEL_TEXT}</Label>
        <input id={CONTROL_ID} />
      </>
    );

    // When
    const control = screen.getByLabelText(LABEL_TEXT);

    // Then
    expect(control).toHaveAttribute('id', CONTROL_ID);
  });

  it.each([
    [undefined, LABEL_COLOUR_CLASS],
    [false, LABEL_COLOUR_CLASS],
    [true, ERROR_COLOUR_CLASS],
  ])('should use the matching colour when error is %s', (error, expected) => {
    // Given
    testRender(<Label error={error}>{LABEL_TEXT}</Label>);

    // When
    const label = screen.getByText(LABEL_TEXT);

    // Then
    expect(label).toHaveClass(expected);
  });

  it('should keep the compact medium size class when error is set', () => {
    // Given
    testRender(<Label error>{LABEL_TEXT}</Label>);

    // When
    const label = screen.getByText(LABEL_TEXT);

    // Then
    expect(label).toHaveClass(COMPACT_MEDIUM_SIZE_CLASS);
  });

  it('should merge the classes when a className is given', () => {
    // Given
    testRender(
      <Label className={`${LAYOUT_CLASS} ${SPACING_CLASS}`}>{LABEL_TEXT}</Label>
    );

    // When
    const label = screen.getByText(LABEL_TEXT);

    // Then
    expect(label).toHaveClass(LAYOUT_CLASS, SPACING_CLASS, LABEL_COLOUR_CLASS);
  });

  it('should reach the label element when a ref is given', () => {
    // Given
    const ref = createRef<HTMLLabelElement>();

    // When
    testRender(<Label ref={ref}>{LABEL_TEXT}</Label>);

    // Then
    expect(ref.current).toBe(screen.getByText(LABEL_TEXT));
  });
});
