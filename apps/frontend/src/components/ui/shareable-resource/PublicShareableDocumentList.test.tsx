import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import testRender from '@/utils/test/test-render';
import { publicDocumentListItemFragment$data } from '@generated/publicDocumentListItemFragment.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { screen, within } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicShareableDocumentList } from './PublicShareableDocumentList';

const ServiceId = 'service-1';
const ServiceSlug = 'my-service';
const BaseUrl = 'https://xtm.local';
const FirstDocumentId = 'doc-1';
const FirstDocumentSlug = 'connector-doc';
const FirstDocumentName = 'Connector document';
const FirstDocumentDescription = 'Connector description';
const SecondDocumentId = 'doc-2';
const SecondDocumentSlug = 'dashboard-doc';
const SecondDocumentName = 'Dashboard document';
const SecondDocumentDescription = 'Dashboard description';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

describe('PublicShareableDocumentList', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: mocks.push,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });
  });

  const serviceInstance = {
    id: ServiceId,
    slug: ServiceSlug,
  } as seoServiceInstanceFragment$data;

  const documents = [
    {
      id: FirstDocumentId,
      slug: FirstDocumentSlug,
      name: FirstDocumentName,
      type: 'opencti_custom_dashboard',
      short_description: FirstDocumentDescription,
      use_cases: [],
    },
    {
      id: SecondDocumentId,
      slug: SecondDocumentSlug,
      name: SecondDocumentName,
      type: 'opencti_custom_dashboard',
      short_description: SecondDocumentDescription,
      use_cases: [],
    },
  ] as publicDocumentListItemFragment$data[];

  it('renders one public card per document with expected public URLs in tab mode', () => {
    // Given / When
    testRender(
      <PublicShareableDocumentList
        documents={documents}
        serviceInstance={serviceInstance}
        baseUrl={BaseUrl}
        displayMode={ServiceListDisplayMode.Tab}
      />
    );

    // Then
    expect(screen.getByText(FirstDocumentName)).toBeInTheDocument();
    expect(screen.getByText(SecondDocumentName)).toBeInTheDocument();

    const detailLinks = screen
      .getAllByRole('link')
      .filter((link) =>
        link.getAttribute('href')?.startsWith('/en/cybersecurity-solutions/')
      );

    expect(detailLinks).toHaveLength(2);
    expect(detailLinks[0]).toHaveAttribute(
      'href',
      `/en/cybersecurity-solutions/${ServiceSlug}/${FirstDocumentSlug}`
    );
    expect(detailLinks[1]).toHaveAttribute(
      'href',
      `/en/cybersecurity-solutions/${ServiceSlug}/${SecondDocumentSlug}`
    );
  });

  it('renders list mode without public detail card links', () => {
    // Given / When
    testRender(
      <PublicShareableDocumentList
        documents={documents}
        serviceInstance={serviceInstance}
        baseUrl={BaseUrl}
        displayMode={ServiceListDisplayMode.List}
      />
    );

    // Then
    expect(screen.getByText(FirstDocumentName)).toBeInTheDocument();
    expect(screen.getByText(SecondDocumentName)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: FirstDocumentName })).toBeNull();
    expect(screen.queryByRole('link', { name: SecondDocumentName })).toBeNull();
  });

  it('should navigate to public detail page when clicking a row in list mode', async () => {
    // Given
    const { user } = testRender(
      <PublicShareableDocumentList
        documents={documents}
        serviceInstance={serviceInstance}
        baseUrl={BaseUrl}
        displayMode={ServiceListDisplayMode.List}
      />
    );

    // When
    await user.click(screen.getByText(FirstDocumentName).closest('tr')!);

    // Then
    expect(mocks.push).toHaveBeenCalledWith(
      `/en/cybersecurity-solutions/${ServiceSlug}/${FirstDocumentSlug}`
    );
  });

  it('should not navigate when clicking share action in list mode', async () => {
    // Given
    const { user } = testRender(
      <PublicShareableDocumentList
        documents={documents}
        serviceInstance={serviceInstance}
        baseUrl={BaseUrl}
        displayMode={ServiceListDisplayMode.List}
      />
    );
    const firstRow = screen.getByText(FirstDocumentName).closest('tr');
    const shareActionButton = within(firstRow!).getByRole('button', {
      name: 'Service.ShareableResources.Share',
    });

    // When
    await user.click(shareActionButton);

    // Then
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
