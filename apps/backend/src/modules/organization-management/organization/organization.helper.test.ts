import { describe, expect, it } from 'vitest';
import { OrganizationHelper } from './organization.helper';

const MAX_PAGE_SIZE = 100;

const PAGE_SIZE_CASES = [
  { first: 20, expected: 20 },
  { first: 0, expected: 0 },
  { first: -1, expected: 0 },
  { first: MAX_PAGE_SIZE, expected: MAX_PAGE_SIZE },
  { first: MAX_PAGE_SIZE + 1, expected: MAX_PAGE_SIZE },
  { first: Number.MAX_SAFE_INTEGER, expected: MAX_PAGE_SIZE },
];

describe('boundMembersPageSize', () => {
  it.each(PAGE_SIZE_CASES)(
    'should return $expected when the page size is $first',
    ({ first, expected }) => {
      // When
      const result = OrganizationHelper.boundMembersPageSize(first);

      // Then
      expect(result).toBe(expected);
    }
  );
});
