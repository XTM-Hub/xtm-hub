import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { loadMeUser } from '@/utils/load-me-user';
import testRender from '@/utils/test/test-render';
import { FrontendErrorLogDocument } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import RootLayout from './layout';

vi.mock('@/lib/server-graphql-fetch', () => ({
  serverGraphqlFetch: vi.fn(),
}));

vi.mock('@/utils/load-me-user', () => ({
  loadMeUser: vi.fn(),
}));

vi.mock('@/utils/metadata', () => ({
  getMetadataBase: vi.fn(),
}));

// The SVG-to-component transform is a build step that Vitest does not run.
vi.mock('@public/logo_xtm_hub_dark.svg', async () => {
  const React = await import('react');
  return { default: () => React.createElement('svg', { role: 'img' }) };
});

vi.mock('@public/logo_xtm_hub_light.svg', async () => {
  const React = await import('react');
  return { default: () => React.createElement('svg', { role: 'img' }) };
});

const LOAD_ERROR_MESSAGE = 'Gateway timeout';

const givenUserLoadFails = () =>
  vi.mocked(loadMeUser).mockRejectedValue(new Error(LOAD_ERROR_MESSAGE));

const renderLayout = async () =>
  testRender(await RootLayout({ children: <p>embedded page</p> }));

describe('Embed RootLayout', () => {
  it('should report the error when the user cannot be loaded', async () => {
    // Given
    givenUserLoadFails();

    // When
    await renderLayout();

    // Then
    expect(serverGraphqlFetch).toHaveBeenCalledExactlyOnceWith(
      FrontendErrorLogDocument,
      {
        message: `EmbedLayout: unexpected Error error ${LOAD_ERROR_MESSAGE}`,
        codeStack: null,
        componentStack: 'app/(embed)/Layout.tsx',
      },
      { cache: 'no-store' }
    );
  });

  it('should show the error page instead of the embedded page when the user cannot be loaded', async () => {
    // Given
    givenUserLoadFails();

    // When
    await renderLayout();

    // Then
    expect(screen.getByText(/something went wrong/)).toBeInTheDocument();
    expect(screen.queryByText('embedded page')).not.toBeInTheDocument();
  });

  it('should send the visitor to the home page when no user is logged in', async () => {
    // Given
    vi.mocked(loadMeUser).mockResolvedValue(null);

    // When
    await RootLayout({ children: <p>embedded page</p> });

    // Then
    expect(redirect).toHaveBeenCalledExactlyOnceWith('/');
  });
});
