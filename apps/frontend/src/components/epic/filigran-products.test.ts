import {
  FILIGRAN_PRODUCTS_ORDER,
  sortFiligranProducts,
} from '@/components/epic/filigran-products';
import { FiligranProduct } from '@graphql/generated';
import { describe, expect, it } from 'vitest';

describe('filigranProducts', () => {
  it('contains every Filigran product from enum', () => {
    expect([...FILIGRAN_PRODUCTS_ORDER].sort()).toEqual(
      Object.values(FiligranProduct).sort()
    );
  });

  it('orders every Filigran product from XTM Hub to XTM One', () => {
    expect(FILIGRAN_PRODUCTS_ORDER).toEqual([
      FiligranProduct.Xtmhub,
      FiligranProduct.Opencti,
      FiligranProduct.Openaev,
      FiligranProduct.Xtmone,
    ]);
  });

  it('sorts products in the expected order whatever the input order', () => {
    // Given
    const products = [
      FiligranProduct.Xtmone,
      FiligranProduct.Openaev,
      FiligranProduct.Xtmhub,
    ];

    // When
    const sorted = sortFiligranProducts(products);

    // Then
    expect(sorted).toEqual([
      FiligranProduct.Xtmhub,
      FiligranProduct.Openaev,
      FiligranProduct.Xtmone,
    ]);
  });

  it('keeps unknown products at the end', () => {
    // Given
    const products = ['%future added value', FiligranProduct.Opencti];

    // When
    const sorted = sortFiligranProducts(products);

    // Then
    expect(sorted).toEqual([FiligranProduct.Opencti, '%future added value']);
  });
});
