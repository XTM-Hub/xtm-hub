import { ReactQueryProvider } from '@/components/ReactQueryProvider';
import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { buildLoginRedirect } from '@/utils/redirect';
import testRender from '@/utils/test/test-render';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CURRENT_PATHNAME = '/app/current-page';

const ExpiredSessionMutation = () => {
  const { mutate } = useMutation({
    mutationFn: () => Promise.reject(new UnauthenticatedError()),
  });

  useEffect(() => {
    mutate();
  }, [mutate]);

  return null;
};

describe('ReactQueryProvider', () => {
  let location: {
    href: string;
    pathname: string;
    search: string;
    hash: string;
  };

  beforeEach(() => {
    location = { href: '', pathname: CURRENT_PATHNAME, search: '', hash: '' };
    vi.stubGlobal('location', location);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should redirect to the login page when a mutation hits an expired session', async () => {
    // Given
    const ui = (
      <ReactQueryProvider>
        <ExpiredSessionMutation />
      </ReactQueryProvider>
    );

    // When
    testRender(ui);

    // Then
    await vi.waitFor(() =>
      expect(location.href).toBe(buildLoginRedirect(CURRENT_PATHNAME))
    );
  });
});
