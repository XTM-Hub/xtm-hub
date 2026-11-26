import testRender from '@/utils/test/test-render';
import { PortalCapability } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Page from './page';

vi.mock('./page-loader', () => ({
  default: ({ id }: { id: string }) => <div>page-loader-{id}</div>,
}));

const ADMIN_USER = { capabilities: [{ name: PortalCapability.Bypass }] };
const STANDARD_USER = { capabilities: [] };
const renderPage = async () =>
  await Page({ params: Promise.resolve({ slug: 'my-slug' }) });

describe('Admin service detail page', () => {
  it('should show the page to an administrator', async () => {
    // Given
    const page = await renderPage();

    // When
    testRender(page, { me: ADMIN_USER });

    // Then
    expect(screen.getByText('page-loader-my-slug')).toBeInTheDocument();
  });

  it('should tell a standard user that they are not authorized instead of showing the page', async () => {
    // Given
    const page = await renderPage();

    // When
    testRender(page, { me: STANDARD_USER });

    // Then
    expect(screen.getByText('Error.YouAreNotAuthorized')).toBeInTheDocument();
    expect(screen.queryByText('page-loader-my-slug')).not.toBeInTheDocument();
  });
});
