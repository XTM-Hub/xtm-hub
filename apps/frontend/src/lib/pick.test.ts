import { describe, expect, it } from 'vitest';
import { pick } from './pick';

const NAME = 'Filigran';
const SECRET = 'secret-value';
const WEBSITE = 'https://filigran.io';

const makeOrganization = () => ({
  name: NAME,
  secret: SECRET,
  website: WEBSITE,
});

describe('pick', () => {
  it('should keep only the listed keys when given an object', () => {
    // Given
    const input = makeOrganization();

    // When
    const result = pick(input, ['name', 'website']);

    // Then
    expect(result).toEqual({ name: NAME, website: WEBSITE });
  });

  it('should return a function that keeps only the listed keys when given the keys alone', () => {
    // Given
    const pickPublicFields = pick(['name', 'website']);

    // When
    const result = pickPublicFields(makeOrganization());

    // Then
    expect(result).toEqual({ name: NAME, website: WEBSITE });
  });

  it('should leave the input untouched when keys are picked', () => {
    // Given
    const input = makeOrganization();

    // When
    pick(input, ['name']);

    // Then
    expect(input).toEqual({ name: NAME, secret: SECRET, website: WEBSITE });
  });

  it('should return an empty object when no key is listed', () => {
    // Given
    const input = makeOrganization();

    // When
    const result = pick(input, []);

    // Then
    expect(result).toEqual({});
  });
});
