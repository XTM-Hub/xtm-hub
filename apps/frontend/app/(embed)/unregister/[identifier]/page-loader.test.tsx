import testRender from '@/utils/test/test-render';
import { PageLoader } from '@app/(embed)/unregister/[identifier]/page-loader';
import {
  CanUnregisterPlatformQuery,
  PlatformIdentifier,
  useCanUnregisterPlatformQuery,
} from '@graphql/generated';
import { registrationKeys } from '@graphql/registration/registration.keys';
import { screen } from '@testing-library/react';
import {
  ReadonlyURLSearchParams,
  redirect,
  useParams,
  useSearchParams,
} from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useCanUnregisterPlatformQuery: vi.fn(),
  });
});

vi.mock('@/components/Loader', () => ({
  default: () => <div data-testid="loader" />,
}));

vi.mock('@/components/PublicPathError', () => ({
  default: () => <div data-testid="public-path-error" />,
}));

vi.mock('@/components/registration/unregister/Index', () => ({
  Unregister: ({
    canUnregisterPlatform,
  }: {
    canUnregisterPlatform: CanUnregisterPlatformQuery['canUnregisterPlatform'];
  }) => (
    <div data-testid="unregister">{canUnregisterPlatform.organizationName}</div>
  ),
}));

const ORGANIZATION_NAME = 'Org One';
const CAN_UNREGISTER_PLATFORM: CanUnregisterPlatformQuery['canUnregisterPlatform'] =
  {
    isAllowed: true,
    isPlatformRegistered: true,
    isInOrganization: true,
    organizationId: 'org-1',
    organizationName: ORGANIZATION_NAME,
  };

const renderPageLoader = (query: Record<string, string>) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(query) as ReadonlyURLSearchParams
  );
  return testRender(<PageLoader />);
};

describe('Unregister PageLoader', () => {
  beforeEach(() => {
    vi.mocked(redirect).mockReset();
    vi.mocked(useParams).mockReturnValue({
      identifier: PlatformIdentifier.Opencti,
    });
    vi.mocked(useCanUnregisterPlatformQuery).mockReturnValue({
      data: { canUnregisterPlatform: CAN_UNREGISTER_PLATFORM },
    } as ReturnType<typeof useCanUnregisterPlatformQuery>);
  });

  it('should render the unregistration once it is known whether the platform can be unregistered', () => {
    // When
    renderPageLoader({ platform_id: 'platform-id', tenant_id: 'tenant-id' });

    // Then
    const variables = {
      input: { platformId: 'platform-id', tenantId: 'tenant-id' },
    };
    expect(useCanUnregisterPlatformQuery).toHaveBeenCalledWith(
      expect.anything(),
      variables,
      expect.objectContaining({
        queryKey: registrationKeys.canUnregisterPlatform(variables),
        staleTime: Infinity,
      })
    );
    expect(screen.getByTestId('unregister')).toHaveTextContent(
      ORGANIZATION_NAME
    );
  });

  it('should display a loader while it is not known whether the platform can be unregistered', () => {
    // Given
    vi.mocked(useCanUnregisterPlatformQuery).mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useCanUnregisterPlatformQuery>);

    // When
    renderPageLoader({ platform_id: 'platform-id' });

    // Then
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.queryByTestId('unregister')).not.toBeInTheDocument();
  });

  it('should redirect without asking the server when the platform id is missing', () => {
    // When
    renderPageLoader({});

    // Then
    expect(useCanUnregisterPlatformQuery).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('should show the error page when the product identifier is unknown', () => {
    // Given
    vi.mocked(useParams).mockReturnValue({ identifier: 'unknown' });

    // When
    renderPageLoader({ platform_id: 'platform-id' });

    // Then
    expect(screen.getByTestId('public-path-error')).toBeInTheDocument();
    expect(useCanUnregisterPlatformQuery).not.toHaveBeenCalled();
  });
});
