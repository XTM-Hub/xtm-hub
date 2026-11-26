import testRender from '@/utils/test/test-render';
import { PageLoader } from '@app/(embed)/register/[identifier]/page-loader';
import {
  PlatformIdentifier,
  PlatformRegistrationStatus,
  useIsPlatformRegisteredQuery,
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
    useIsPlatformRegisteredQuery: vi.fn(),
  });
});

vi.mock('@/components/Loader', () => ({
  default: () => <div data-testid="loader" />,
}));

vi.mock('@/components/registration/register', () => ({
  Register: ({ platformOrigin }: { platformOrigin: string }) => (
    <div data-testid="register">{platformOrigin}</div>
  ),
}));

const PLATFORM_ORIGIN = 'https://opencti.example.com';
const VALID_QUERY = {
  platform_id: 'platform-id',
  platform_title: 'My OpenCTI',
  platform_url: `${PLATFORM_ORIGIN}/dashboard`,
  platform_contract: 'EE',
};

const renderPageLoader = (query: Record<string, string>) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(query) as ReadonlyURLSearchParams
  );
  return testRender(<PageLoader />);
};

describe('Register PageLoader', () => {
  beforeEach(() => {
    vi.mocked(useIsPlatformRegisteredQuery).mockReturnValue({
      data: {
        isPlatformRegistered: {
          status: PlatformRegistrationStatus.NeverRegistered,
          platformTitle: null,
          organization: null,
        },
      },
    } as ReturnType<typeof useIsPlatformRegisteredQuery>);
    vi.mocked(redirect).mockReset();
    vi.mocked(useParams).mockReturnValue({
      identifier: PlatformIdentifier.Opencti,
    });
  });

  it('should render the registration with the origin of the platform url', () => {
    // When
    renderPageLoader(VALID_QUERY);

    // Then
    expect(screen.getByTestId('register')).toHaveTextContent(PLATFORM_ORIGIN);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('should ask whether the platform of the given tenant is registered', () => {
    // When
    renderPageLoader({ ...VALID_QUERY, tenant_id: 'tenant-id' });

    // Then
    const variables = {
      input: { platformId: VALID_QUERY.platform_id, tenantId: 'tenant-id' },
    };
    expect(useIsPlatformRegisteredQuery).toHaveBeenCalledWith(
      expect.anything(),
      variables,
      expect.objectContaining({
        queryKey: registrationKeys.isPlatformRegistered(variables),
        staleTime: Infinity,
      })
    );
  });

  it('should display a loader until the registration status is known', () => {
    // Given
    vi.mocked(useIsPlatformRegisteredQuery).mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useIsPlatformRegisteredQuery>);

    // When
    renderPageLoader(VALID_QUERY);

    // Then
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.queryByTestId('register')).not.toBeInTheDocument();
  });

  it.each([
    { name: 'missing', platformUrl: undefined },
    { name: 'invalid', platformUrl: 'not a url' },
    { name: 'relative', platformUrl: '/dashboard' },
    { name: 'javascript scheme', platformUrl: 'javascript:alert(1)' },
    { name: 'file scheme', platformUrl: 'file:///etc/passwd' },
  ])(
    'should redirect without rendering the registration when the platform url is $name',
    ({ platformUrl }) => {
      // Given
      const { platform_url: _platformUrl, ...query } = VALID_QUERY;

      // When
      renderPageLoader(
        platformUrl === undefined
          ? query
          : { ...query, platform_url: platformUrl }
      );

      // Then
      expect(redirect).toHaveBeenCalledWith('/');
      expect(screen.queryByTestId('register')).not.toBeInTheDocument();
    }
  );
});
