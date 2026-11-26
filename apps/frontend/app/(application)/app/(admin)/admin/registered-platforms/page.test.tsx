import testRender from '@/utils/test/test-render';
import { PortalCapability } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './page';

const ADMIN_USER = { capabilities: [{ name: PortalCapability.Bypass }] };
const STANDARD_USER = { capabilities: [] };
const PAGE_TITLE = 'MenuLinks.RegisteredPlatforms';

const mocks = vi.hoisted(() => ({
  useAdminRegisteredPlatformsQuery: vi.fn(),
  useOrganizationsListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useAdminRegisteredPlatformsQuery: mocks.useAdminRegisteredPlatformsQuery,
    useOrganizationsListQuery: mocks.useOrganizationsListQuery,
  });
});

describe('Admin registered platforms page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAdminRegisteredPlatformsQuery.mockReturnValue({
      data: {
        adminRegisteredPlatforms: { totalCount: 0, edges: [] },
      },
      isLoading: false,
    });
    mocks.useOrganizationsListQuery.mockReturnValue({
      data: { organizations: { totalCount: 0, edges: [] } },
      isLoading: false,
      isError: false,
    });
  });

  it('should show the registered platforms to a platform administrator', () => {
    // Given / When
    testRender(<Page />, { me: ADMIN_USER });

    // Then
    expect(
      screen.getByRole('heading', { name: PAGE_TITLE })
    ).toBeInTheDocument();
    expect(mocks.useAdminRegisteredPlatformsQuery).toHaveBeenCalled();
  });

  it('should tell a standard user that they are not authorized instead of listing the platforms', () => {
    // Given / When
    testRender(<Page />, { me: STANDARD_USER });

    // Then
    expect(screen.getByText('Error.YouAreNotAuthorized')).toBeInTheDocument();
    expect(mocks.useAdminRegisteredPlatformsQuery).not.toHaveBeenCalled();
  });
});
