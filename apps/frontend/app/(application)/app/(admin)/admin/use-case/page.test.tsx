import testRender from '@/utils/test/test-render';
import { PortalCapability, UseCasesListQuery } from '@graphql/generated';
import {
  mockUseCase,
  mockUseCaseConnection,
  mockUseCaseEdge,
} from '@graphql/mocks';
import { screen } from '@testing-library/react';
import Page from './page';

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

const ADMIN_USER = { capabilities: [{ name: PortalCapability.Bypass }] };
const STANDARD_USER = { capabilities: [] };
const USE_CASE_NAME = 'Threat hunting';

const USE_CASES_RESPONSE: UseCasesListQuery = {
  useCases: mockUseCaseConnection({
    totalCount: 1,
    edges: [
      mockUseCaseEdge({
        node: mockUseCase({ id: 'use-case-1', name: USE_CASE_NAME }),
      }),
    ],
  }),
};

describe('Admin use cases page', () => {
  beforeEach(() => {
    mocks.useUseCasesListQuery.mockReturnValue({
      data: USE_CASES_RESPONSE,
      isError: false,
    });
  });

  it('should show the use cases to an administrator', () => {
    // Given / When
    testRender(<Page />, { me: ADMIN_USER });

    // Then
    expect(
      screen.getByRole('heading', { name: 'MenuLinks.UseCase' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: new RegExp(USE_CASE_NAME) })
    ).toBeInTheDocument();
  });

  it('should tell a standard user that they are not authorized instead of showing the use cases', () => {
    // Given / When
    testRender(<Page />, { me: STANDARD_USER });

    // Then
    expect(screen.getByText('Error.YouAreNotAuthorized')).toBeInTheDocument();
    expect(screen.queryByText(USE_CASE_NAME)).not.toBeInTheDocument();
  });
});
