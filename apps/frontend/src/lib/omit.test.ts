import { describe, expect, it } from 'vitest';
import { omit } from './omit';

const NAME = 'Filigran';
const SECRET = 'secret-value';

describe('omit', () => {
  it('should remove the listed keys when given a flat object', () => {
    // Given
    const input = { name: NAME, secret: SECRET };

    // When
    const result = omit(input, ['secret']);

    // Then
    expect(result).toEqual({ name: NAME });
  });

  it('should leave the input untouched when keys are omitted', () => {
    // Given
    const input = { name: NAME, secret: SECRET };

    // When
    omit(input, ['secret']);

    // Then
    expect(input).toEqual({ name: NAME, secret: SECRET });
  });

  it('should keep nested keys when recursion is off', () => {
    // Given
    const input = { owner: { name: NAME, secret: SECRET } };

    // When
    const result = omit(input, ['secret'], false);

    // Then
    expect(result).toEqual({ owner: { name: NAME, secret: SECRET } });
  });

  it('should remove nested keys in objects and arrays when recursion is on', () => {
    // Given
    const input = {
      secret: SECRET,
      owner: { name: NAME, secret: SECRET },
      members: [{ name: NAME, secret: SECRET }],
    };

    // When
    const result = omit(input, ['secret'], true);

    // Then
    expect(result).toEqual({
      owner: { name: NAME },
      members: [{ name: NAME }],
    });
  });

  it.each([
    ['a string', NAME],
    ['a number', 42],
    ['null', null],
  ])(
    'should return the value as is when recursion reaches %s',
    (_label, value) => {
      // Given / When
      const result = omit({ value }, ['secret'], true);

      // Then
      expect(result).toEqual({ value });
    }
  );

  it('should keep a File instance as is when recursion is on', () => {
    // Given
    const file = new File(['content'], 'report.pdf');

    // When
    const result = omit({ file }, ['name'], true);

    // Then
    expect(result.file).toBe(file);
  });
});
