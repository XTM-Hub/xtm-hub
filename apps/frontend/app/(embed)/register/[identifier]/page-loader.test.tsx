import testRender from '@/utils/test/test-render';
import { PageLoader } from '@app/(embed)/register/[identifier]/page-loader';
import { PlatformIdentifier } from '@graphql/generated';
import { screen } from '@testing-library/react';
import {
  ReadonlyURLSearchParams,
  redirect,
  useParams,
  useSearchParams,
} from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  useQueryLoader: () => [{}, vi.fn()],
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
