import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import Page from '@app/(application)/app/(user)/service/opencti_hunt_packs/[serviceInstanceId]/[documentId]/page';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/relay/server-portal-api-fetch', () => ({
  serverFetchGraphQL: vi.fn(),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async () => Object.assign((key: string) => key, {}),
}));

vi.mock(
  '@app/(application)/app/(user)/service/opencti_hunt_packs/[serviceInstanceId]/[documentId]/page-loader',
  () => ({
    default: ({
      documentId,
      serviceInstance,
    }: {
      documentId: string;
      serviceInstance: { id: string };
    }) => (
      <div data-testid="hunt-pack-loader">
        {serviceInstance.id}:{documentId}
      </div>
    ),
  })
);

const renderPage = async () =>
  render(
    await Page({
      params: Promise.resolve({
        serviceInstanceId: 'service-1',
        documentId: 'document-1',
      }),
    })
  );

describe('hunt pack page', () => {
  beforeEach(() => {
    vi.mocked(serverFetchGraphQL).mockReset();
  });

  it('shows the not-found message when the service instance is null', async () => {
    vi.mocked(serverFetchGraphQL).mockResolvedValue({
      data: { serviceInstanceById: null },
    });

    await renderPage();

    expect(screen.getByText('Utils.DocumentNotFound')).toBeInTheDocument();
    expect(screen.queryByTestId('hunt-pack-loader')).not.toBeInTheDocument();
  });

  it('loads the hunt pack of an accessible service instance', async () => {
    vi.mocked(serverFetchGraphQL).mockResolvedValue({
      data: { serviceInstanceById: { id: 'service-1' } },
    });

    await renderPage();

    expect(screen.getByTestId('hunt-pack-loader')).toHaveTextContent(
      'service-1:document-1'
    );
    expect(
      screen.queryByText('Utils.DocumentNotFound')
    ).not.toBeInTheDocument();
  });
});
