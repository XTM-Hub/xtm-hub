import { FiligranProduct } from '@graphql/generated';
import { renderHook } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEpicFilter } from './use-epic-filter';

describe('useEpicFilter', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePathname).mockReturnValue('/epics');
    vi.mocked(useRouter).mockReturnValue({
      replace: mockReplace,
    } as never);
  });

  describe('selectedProduct', () => {
    it.each([
      {
        searchQuery: '',
        expectedSelectedProduct: [],
        description: 'no param → no product',
      },
      {
        searchQuery: 'product=all',
        expectedSelectedProduct: [],
        description: 'legacy "all" → no product',
      },
      {
        searchQuery: `product=${FiligranProduct.Opencti}`,
        expectedSelectedProduct: [FiligranProduct.Opencti],
        description: 'single valid enum value → one product',
      },
      {
        searchQuery: `product=${FiligranProduct.Opencti},${FiligranProduct.Openaev}`,
        expectedSelectedProduct: [
          FiligranProduct.Opencti,
          FiligranProduct.Openaev,
        ],
        description: 'comma separated values → several products',
      },
      {
        searchQuery: `product=${FiligranProduct.Openaev},${FiligranProduct.Opencti}`,
        expectedSelectedProduct: [
          FiligranProduct.Opencti,
          FiligranProduct.Openaev,
        ],
        description: 'unordered values → canonical product order',
      },
      {
        searchQuery: `product=unknown,${FiligranProduct.Openaev}`,
        expectedSelectedProduct: [FiligranProduct.Openaev],
        description: 'unknown value → ignored',
      },
      {
        searchQuery: 'product=',
        expectedSelectedProduct: [],
        description: 'empty value → no product',
      },
    ])(
      'should expose "$expectedSelectedProduct" from "$searchQuery" ($description)',
      ({ searchQuery, expectedSelectedProduct }) => {
        vi.mocked(useSearchParams).mockReturnValue(
          new URLSearchParams(searchQuery) as never
        );

        const { result } = renderHook(() => useEpicFilter());

        expect(result.current.selectedProduct).toEqual(expectedSelectedProduct);
      }
    );
  });

  describe('setSelectedProduct', () => {
    it.each`
      initialSearch                           | filter                                                | expectedUrl                                                                 | description
      ${''}                                   | ${[]}                                                 | ${'/epics'}                                                                 | ${'removes the param when nothing is selected'}
      ${''}                                   | ${[FiligranProduct.Opencti]}                          | ${`/epics?product=${FiligranProduct.Opencti}`}                              | ${'sets a product on empty params'}
      ${''}                                   | ${[FiligranProduct.Opencti, FiligranProduct.Openaev]} | ${`/epics?product=${FiligranProduct.Opencti}%2C${FiligranProduct.Openaev}`} | ${'sets several products as a comma separated list'}
      ${`product=${FiligranProduct.Opencti}`} | ${[FiligranProduct.Xtmhub]}                           | ${`/epics?product=${FiligranProduct.Xtmhub}`}                               | ${'replaces existing products'}
      ${`product=${FiligranProduct.Opencti}`} | ${[]}                                                 | ${'/epics'}                                                                 | ${'removes existing products when nothing is selected'}
      ${''}                                   | ${[FiligranProduct.Openaev, FiligranProduct.Opencti]} | ${`/epics?product=${FiligranProduct.Opencti}%2C${FiligranProduct.Openaev}`} | ${'writes the products in the canonical order'}
    `(
      'should call router.replace with "$expectedUrl" ($description)',
      ({ initialSearch, filter, expectedUrl }) => {
        vi.mocked(useSearchParams).mockReturnValue(
          new URLSearchParams(initialSearch) as never
        );

        const { result } = renderHook(() => useEpicFilter());
        result.current.setSelectedProduct(filter);

        expect(mockReplace).toHaveBeenCalledWith(expectedUrl);
      }
    );
  });
});
