import { useUseCases } from '@/components/admin/use-case/use-use-cases';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { testRenderHook } from '@/utils/test/test-render';
import { FiligranProduct, UseCasesListQuery } from '@graphql/generated';
import {
  mockUseCase,
  mockUseCaseConnection,
  mockUseCaseEdge,
} from '@graphql/mocks';

const mocks = vi.hoisted(() => ({
  useUseCasesListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useUseCasesListQuery: mocks.useUseCasesListQuery,
  });
});

const USE_CASE_ID = 'use-case-1';
const USE_CASE_NAME = 'Threat hunting';
const USE_CASE_COLOR = '#001122';
const DOCUMENT_TYPE = ShareableResourceType.OPENCTI_INTEGRATION;

const USE_CASES_RESPONSE: UseCasesListQuery = {
  useCases: mockUseCaseConnection({
    totalCount: 1,
    edges: [
      mockUseCaseEdge({
        node: mockUseCase({
          id: USE_CASE_ID,
          name: USE_CASE_NAME,
          color: USE_CASE_COLOR,
          product: [FiligranProduct.Opencti],
        }),
      }),
    ],
  }),
};

describe('useUseCases', () => {
  it('should return the id, name and color of each use case', () => {
    // Given
    mocks.useUseCasesListQuery.mockReturnValue({ data: USE_CASES_RESPONSE });

    // When
    const { result } = testRenderHook(() => useUseCases());

    // Then
    expect(result.current).toEqual([
      { id: USE_CASE_ID, name: USE_CASE_NAME, color: USE_CASE_COLOR },
    ]);
  });

  it('should return no use case while the list is not loaded', () => {
    // Given
    mocks.useUseCasesListQuery.mockReturnValue({ data: undefined });

    // When
    const { result } = testRenderHook(() => useUseCases());

    // Then
    expect(result.current).toEqual([]);
  });

  it.each([
    {
      options: undefined,
      expected: { documentType: null, product: null },
    },
    {
      options: {
        documentType: DOCUMENT_TYPE,
        product: FiligranProduct.Opencti,
      },
      expected: {
        documentType: DOCUMENT_TYPE,
        product: FiligranProduct.Opencti,
      },
    },
  ])(
    'should query the use cases matching $options',
    ({ options, expected }) => {
      // Given
      mocks.useUseCasesListQuery.mockReturnValue({ data: undefined });

      // When
      testRenderHook(() => useUseCases(options));

      // Then
      expect(mocks.useUseCasesListQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining(expected)
      );
    }
  );
});
