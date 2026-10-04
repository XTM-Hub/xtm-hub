import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import Page from '@app/(application)/app/(user)/service/opencti_hunt_packs/[serviceInstanceId]/page';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/relay/server-portal-api-fetch', () => ({
  serverFetchGraphQL: vi.fn(),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async () => Object.assign((key: string) => key, {}),
}));

vi.mock('@/components/ui/BreadcrumbNav', () => ({
  BreadcrumbNav: ({ value }: { value: { label: string }[] }) => (
    <nav data-testid="breadcrumb">
      {value.map(({ label }) => label).join('/')}
    </nav>
  ),
}));

vi.mock(
  '@app/(application)/app/(user)/service/opencti_hunt_packs/[serviceInstanceId]/page-loader',
  () => ({
    default: ({ serviceInstance }: { serviceInstance: { id: string } }) => (
      <div data-testid="hunt-packs-loader">{serviceInstance.id}</div>
    ),
  })
);

const renderPage = async () =>
  render(
    await Page({ params: Promise.resolve({ serviceInstanceId: 'service-1' }) })
  );

describe('hunt packs library page', () => {
  beforeEach(() => {
    vi.mocked(serverFetchGraphQL).mockReset();
  });

  it('shows the not-found message when the service instance is null', async () => {
    vi.mocked(serverFetchGraphQL).mockResolvedValue({
      data: { serviceInstanceById: null },
    });

    await renderPage();

    expect(screen.getByText('Utils.ServiceNotFound')).toBeInTheDocument();
    expect(screen.queryByTestId('hunt-packs-loader')).not.toBeInTheDocument();
  });

  it('renders the library of an accessible service instance', async () => {
    vi.mocked(serverFetchGraphQL).mockResolvedValue({
      data: { serviceInstanceById: { id: 'service-1', name: 'Hunt packs' } },
    });

    await renderPage();

    expect(screen.getByTestId('breadcrumb')).toHaveTextContent(
      'MenuLinks.Home/Hunt packs'
    );
    expect(screen.getByTestId('hunt-packs-loader')).toHaveTextContent(
      'service-1'
    );
    expect(screen.queryByText('Utils.ServiceNotFound')).not.toBeInTheDocument();
  });
});
