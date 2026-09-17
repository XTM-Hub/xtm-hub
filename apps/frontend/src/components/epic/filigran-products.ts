import { FiligranProduct } from '@graphql/generated';

export const FILIGRAN_PRODUCTS_ORDER: FiligranProduct[] = [
  FiligranProduct.Xtmhub,
  FiligranProduct.Opencti,
  FiligranProduct.Openaev,
  FiligranProduct.Xtmone,
];

const productRank = (product: string): number => {
  const rank = FILIGRAN_PRODUCTS_ORDER.indexOf(product as FiligranProduct);
  return rank === -1 ? FILIGRAN_PRODUCTS_ORDER.length : rank;
};

export const sortFiligranProducts = <T extends string>(
  products: readonly T[]
): T[] => [...products].sort((a, b) => productRank(a) - productRank(b));
