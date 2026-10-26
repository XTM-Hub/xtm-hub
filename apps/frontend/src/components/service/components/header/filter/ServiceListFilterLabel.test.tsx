import { ServiceListFilterLabel } from '@/components/service/components/header/filter/ServiceListFilterLabel';
import { AppServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender, { testRenderHook } from '@/utils/test/test-render';
import {
  mockUseCase,
  mockUseCaseConnection,
  mockUseCaseEdge,
} from '@graphql/mocks';
import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const FIRST_USE_CASE_ID = 'use-case-1';
const FIRST_USE_CASE_NAME = 'Threat hunting';
const SECOND_USE_CASE_ID = 'use-case-2';
const SECOND_USE_CASE_NAME = 'Incident response';
const LOCAL_STORAGE_KEY = ServiceListLocalStorageKey.OpenCTIIntegrationFeeds;
const DOCUMENT_TYPE = ShareableResourceType.OPENCTI_INTEGRATION;

const graphqlMocks = vi.hoisted(() => ({
  useUseCasesListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUseCasesListQuery: graphqlMocks.useUseCasesListQuery,
}));

const renderFilter = () =>
  testRender(
    <AppServiceListLocalStorageKeyContext localStorageKey={LOCAL_STORAGE_KEY}>
      <ServiceListFilterLabel type={DOCUMENT_TYPE} />
    </AppServiceListLocalStorageKeyContext>
  );

const renderStoredFilters = () =>
  testRenderHook(() => useServiceListLocalStorage(LOCAL_STORAGE_KEY));

describe('ServiceListFilterLabel', () => {
  beforeEach(() => {
    localStorage.clear();
    graphqlMocks.useUseCasesListQuery.mockReturnValue({
      data: {
        useCases: mockUseCaseConnection({
          edges: [
            mockUseCaseEdge({
              node: mockUseCase({
                id: FIRST_USE_CASE_ID,
                name: FIRST_USE_CASE_NAME,
              }),
            }),
            mockUseCaseEdge({
              node: mockUseCase({
                id: SECOND_USE_CASE_ID,
                name: SECOND_USE_CASE_NAME,
              }),
            }),
          ],
        }),
      },
    });
  });

  it('should load the use cases of the document type when the filter is displayed', () => {
    // Given / When
    renderFilter();

    // Then
    expect(graphqlMocks.useUseCasesListQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ documentType: DOCUMENT_TYPE })
    );
  });

  it('should offer one option per use case when the document type has use cases', () => {
    // Given / When
    renderFilter();

    // Then
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toHaveAccessibleName(FIRST_USE_CASE_NAME);
    expect(checkboxes[1]).toHaveAccessibleName(SECOND_USE_CASE_NAME);
  });

  it('should pre-check the use cases when they are already stored in the list filters', () => {
    // Given
    const { result } = renderStoredFilters();
    act(() => result.current.setLabels({ [SECOND_USE_CASE_ID]: [] }));

    // When
    renderFilter();

    // Then
    expect(
      screen.getByRole('checkbox', { name: SECOND_USE_CASE_NAME })
    ).toBeChecked();
  });

  it('should store the use case in the list filters when the user checks it', async () => {
    // Given
    const { user } = renderFilter();

    // When
    await user.click(
      screen.getByRole('checkbox', { name: FIRST_USE_CASE_NAME })
    );

    // Then
    expect(renderStoredFilters().result.current.labels).toEqual({
      [FIRST_USE_CASE_ID]: [],
    });
  });
});
