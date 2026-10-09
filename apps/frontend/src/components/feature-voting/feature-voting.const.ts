import { FiligranProduct } from '@graphql/generated';

// Keep in sync with the backend list in feature-voting.domain.ts.
export const VOTING_PRODUCTS: readonly [FiligranProduct, ...FiligranProduct[]] =
  [
    FiligranProduct.Opencti,
    FiligranProduct.Openaev,
    FiligranProduct.Xtmone,
    FiligranProduct.Xtmhub,
  ];
