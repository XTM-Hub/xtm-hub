import { isTruncated } from '@/utils/is-truncated';

const BOX_WIDTH = 100;

const buildElement = (scrollWidth: number) => {
  const element = document.createElement('span');
  Object.defineProperty(element, 'scrollWidth', { value: scrollWidth });
  Object.defineProperty(element, 'clientWidth', { value: BOX_WIDTH });
  return element;
};

describe('isTruncated', () => {
  it.each`
    description            | scrollWidth      | truncated
    ${'fits its box'}      | ${BOX_WIDTH}     | ${false}
    ${'overflows its box'} | ${BOX_WIDTH + 1} | ${true}
  `(
    'should return $truncated when the text $description',
    ({ scrollWidth, truncated }) => {
      // Given an element whose text is a known width
      const element = buildElement(scrollWidth);

      // When it is checked
      const result = isTruncated(element);

      // Then it is truncated only when the text overflows
      expect(result).toBe(truncated);
    }
  );

  it('should return false without an element', () => {
    // Given no element, as a ref not attached yet
    // When it is checked
    const result = isTruncated(null);

    // Then it is not truncated
    expect(result).toBe(false);
  });
});
