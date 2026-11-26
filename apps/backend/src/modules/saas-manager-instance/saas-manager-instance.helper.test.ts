import { describe, expect, it } from 'vitest';
import { SaasProduct } from '../../__generated__/resolvers-types';
import { toSaasProduct } from './saas-manager-instance.helper';

describe('toSaasProduct', () => {
  it.each`
    case                | product   | expected
    ${'a product code'} | ${'OCTI'} | ${SaasProduct.Octi}
    ${'a lower case'}   | ${'oaev'} | ${SaasProduct.Oaev}
    ${'a mixed case'}   | ${'One'}  | ${SaasProduct.One}
  `('should return the product for $case', ({ product, expected }) => {
    expect(toSaasProduct(product)).toBe(expected);
  });

  it.each`
    case                    | product
    ${'an unknown product'} | ${'OTHER'}
    ${'no product'}         | ${null}
  `('should return null for $case', ({ product }) => {
    expect(toSaasProduct(product)).toBeNull();
  });
});
