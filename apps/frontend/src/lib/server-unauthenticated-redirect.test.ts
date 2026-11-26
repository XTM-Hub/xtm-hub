import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { redirectToSignupOnUnauthenticated } from '@/lib/server-unauthenticated-redirect';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

vi.mock('next/headers', () => ({ headers: vi.fn() }));

const REDIRECT_SENTINEL = new Error('NEXT_REDIRECT');

const mockPathname = (pathname: string | null) => {
  vi.mocked(headers).mockResolvedValue(
    new Headers(pathname ? { 'x-pathname': pathname } : {})
  );
};

describe('redirectToSignupOnUnauthenticated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Next.js' redirect never returns: it throws to interrupt the render.
    vi.mocked(redirect).mockImplementation(() => {
      throw REDIRECT_SENTINEL;
    });
    mockPathname('/app/catalog');
  });

  it('should return the data when the fetch succeeds', async () => {
    // Given
    const fetchData = async () => ({ me: 'ok' });

    // When
    const result = await redirectToSignupOnUnauthenticated(fetchData);

    // Then
    expect(result).toEqual({ me: 'ok' });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('should redirect to the signup page with the current path when the fetch is unauthenticated', async () => {
    // Given
    const fetchData = vi.fn().mockRejectedValue(new UnauthenticatedError());

    // When
    const result = redirectToSignupOnUnauthenticated(fetchData);

    // Then
    await expect(result).rejects.toBe(REDIRECT_SENTINEL);
    expect(redirect).toHaveBeenCalledWith(
      `/sign-up?redirect=${encodeURIComponent(btoa('/app/catalog'))}`
    );
  });

  it('should redirect to the bare signup page when there is no current path', async () => {
    // Given
    mockPathname(null);
    const fetchData = () => Promise.reject(new UnauthenticatedError());

    // When
    const result = redirectToSignupOnUnauthenticated(fetchData);

    // Then
    await expect(result).rejects.toBe(REDIRECT_SENTINEL);
    expect(redirect).toHaveBeenCalledWith('/sign-up');
  });

  it('should rethrow the error without redirecting when the fetch fails with another error', async () => {
    // Given
    const failure = new Error('boom');
    const fetchData = () => Promise.reject(failure);

    // When
    const result = redirectToSignupOnUnauthenticated(fetchData);

    // Then
    await expect(result).rejects.toBe(failure);
    expect(redirect).not.toHaveBeenCalled();
  });
});
