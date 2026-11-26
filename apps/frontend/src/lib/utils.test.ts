import { isEmpty } from './utils';

describe('isEmpty', () => {
  // returns true for null values
  it('should return true when value is null', () => {
    expect(isEmpty(null)).toBe(true);
  });
  // handles nested objects correctly
  it('should return false when nested object is not empty', () => {
    const nestedObject = { a: { b: 1 } };
    expect(isEmpty(nestedObject)).toBe(false);
  });
  it('should return true when value is an empty string', () => {
    expect(isEmpty('')).toBe(true);
  });
  it('should return true when value is an empty array', () => {
    expect(isEmpty([])).toBe(true);
  });
  it.each([
    ['zero', 0],
    ['a number', 42],
    ['false', false],
    ['true', true],
  ])('should return false when value is %s', (_label, value) => {
    // Given a value that has no length nor keys

    // When
    const result = isEmpty(value);

    // Then
    expect(result).toBe(false);
  });
  it.each([
    ['an empty object', {}],
    ['an empty byte array', new Uint8Array()],
    ['undefined', undefined],
  ])('should return true when value is %s', (_label, value) => {
    // Given an empty value

    // When
    const result = isEmpty(value);

    // Then
    expect(result).toBe(true);
  });
});
