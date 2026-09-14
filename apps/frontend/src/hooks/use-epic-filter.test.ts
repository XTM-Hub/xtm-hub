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

  describe('selectedProducts', () => {
    it.each([
      {
        searchQuery: '',
        expectedSelectedProducts: [],
        description: 'no param → no product',
      },
      {
        searchQuery: 'products=all',
        expectedSelectedProducts: [],
        description: 'legacy "all" → no product',
      },
      {
        searchQuery: `products=${FiligranProduct.Opencti}`,
        expectedSelectedProducts: [FiligranProduct.Opencti],
        description: 'single valid enum value → one product',
      },
      {
        searchQuery: `products=${FiligranProduct.Opencti},${FiligranProduct.Openaev}`,
        expectedSelectedProducts: [
          FiligranProduct.Opencti,
          FiligranProduct.Openaev,
        ],
        description: 'comma separated values → several products',
      },
      {
        searchQuery: `products=${FiligranProduct.Openaev},${FiligranProduct.Opencti}`,
        expectedSelectedProducts: [
          FiligranProduct.Opencti,
          FiligranProduct.Openaev,
        ],
        description: 'unordered values → canonical product order',
      },
      {
        searchQuery: `products=unknown,${FiligranProduct.Openaev}`,
        expectedSelectedProducts: [FiligranProduct.Openaev],
        description: 'unknown value → ignored',
      },
      {
        searchQuery: 'products=',
        expectedSelectedProducts: [],
        description: 'empty value → no product',
      },
    ])(
      'should expose "$expectedSelectedProducts" from "$searchQuery" ($description)',
      ({ searchQuery, expectedSelectedProducts }) => {
        vi.mocked(useSearchParams).mockReturnValue(
          new URLSearchParams(searchQuery) as never
        );

        const { result } = renderHook(() => useEpicFilter());

        expect(result.current.selectedProducts).toEqual(
          expectedSelectedProducts
        );
      }
    );
  });

  describe('setSelectedProducts', () => {
    it.each`
      initialSearch                            | filter                                                | expectedUrl                                                                  | description
      ${''}                                    | ${[]}                                                 | ${'/epics'}                                                                  | ${'removes the param when nothing is selected'}
      ${''}                                    | ${[FiligranProduct.Opencti]}                          | ${`/epics?products=${FiligranProduct.Opencti}`}                              | ${'sets a product on empty params'}
      ${''}                                    | ${[FiligranProduct.Opencti, FiligranProduct.Openaev]} | ${`/epics?products=${FiligranProduct.Opencti}%2C${FiligranProduct.Openaev}`} | ${'sets several products as a comma separated list'}
      ${`products=${FiligranProduct.Opencti}`} | ${[FiligranProduct.Xtmhub]}                           | ${`/epics?products=${FiligranProduct.Xtmhub}`}                               | ${'replaces existing products'}
      ${`products=${FiligranProduct.Opencti}`} | ${[]}                                                 | ${'/epics'}                                                                  | ${'removes existing products when nothing is selected'}
      ${''}                                    | ${[FiligranProduct.Openaev, FiligranProduct.Opencti]} | ${`/epics?products=${FiligranProduct.Opencti}%2C${FiligranProduct.Openaev}`} | ${'writes the products in the canonical order'}
    `(
      'should call router.replace with "$expectedUrl" ($description)',
      ({ initialSearch, filter, expectedUrl }) => {
        vi.mocked(useSearchParams).mockReturnValue(
          new URLSearchParams(initialSearch) as never
        );

        const { result } = renderHook(() => useEpicFilter());
        result.current.setSelectedProducts(filter);

        expect(mockReplace).toHaveBeenCalledWith(expectedUrl);
      }
    );
  });
});
