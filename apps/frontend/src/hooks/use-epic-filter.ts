'use client';
import { EpicFilterType } from '@/components/epic/EpicFilter';
import { sortFiligranProducts } from '@/components/epic/filigran-products';
import { FiligranProduct } from '@graphql/generated';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

const PRODUCT_PARAM = 'product';

const isFiligranProduct = (value: string): value is FiligranProduct =>
  Object.values(FiligranProduct).includes(value as FiligranProduct);

export const useEpicFilter = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawParam = searchParams.get(PRODUCT_PARAM);
  const selectedProduct: EpicFilterType = useMemo(
    () =>
      sortFiligranProducts(
        (rawParam ?? '').split(',').filter(isFiligranProduct)
      ),
    [rawParam]
  );

  const setSelectedProduct = useCallback(
    (filter: EpicFilterType) => {
      const params = new URLSearchParams(searchParams.toString());
      if (filter.length === 0) {
        params.delete(PRODUCT_PARAM);
      } else {
        params.set(PRODUCT_PARAM, sortFiligranProducts(filter).join(','));
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, router, pathname]
  );

  return { selectedProduct, setSelectedProduct };
};
