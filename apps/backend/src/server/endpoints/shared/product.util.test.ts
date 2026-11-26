import { describe, expect, it } from 'vitest';
import { PlatformIdentifier } from '../../../__generated__/resolvers-types';
import { isProduct } from './product.util';

describe('isProduct', () => {
  it.each`
    value                         | expected | description
    ${PlatformIdentifier.Opencti} | ${true}  | ${'valid enum value'}
    ${'opengrc'}                  | ${false} | ${'product listed in the contract but not yet in the enum'}
    ${42}                         | ${false} | ${'number'}
    ${undefined}                  | ${false} | ${'undefined'}
    ${['opencti']}                | ${false} | ${'array'}
  `('$description → $expected', ({ value, expected }) => {
    expect(isProduct(value)).toBe(expected);
  });
});
