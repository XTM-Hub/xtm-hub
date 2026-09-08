import { AppServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import { ServiceListLocalStorageKey } from '@/hooks/use-service-list-local-storage';
import testRender from '@/utils/test/test-render';
import { publicDocumentListItemFragment$data } from '@generated/publicDocumentListItemFragment.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PublicShareableResourceList } from './PublicShareableResourceList';

vi.mock('@/hooks/use-scroll-position', () => ({
  __esModule: true,
  default: () => ({ save: vi.fn() }),
}));

describe('PublicShareableResourceList', () => {
  const serviceInstance = {
    id: 'service-1',
    slug: 'my-service',
  };

  it('renders an empty state when no document is provided', () => {
    // With no documents, the component returns early and never renders
    // ShareableResourceCard, so no ServiceListLocalStorageKeyContext is needed.
    testRender(
      <PublicShareableResourceList
        documents={[]}
        serviceInstance={serviceInstance as seoServiceInstanceFragment$data}
        baseUrl="https://xtm.local"
        displayMode={ServiceListDisplayMode.Tab}
      />
    );

    expect(screen.getByText('Utils.DocumentNotFound')).toBeInTheDocument();
  });

  it('groups integrations by integration_type and renders document names with correct links', () => {
    const documents = [
      {
        id: 'doc-1',
        slug: 'connector-doc',
        name: 'My Connector',
        type: 'opencti_integration',
        integration_type: IntegrationType.Connector,
        use_cases: [],
      },
      {
        id: 'doc-2',
        slug: 'dashboard-doc',
        name: 'My Dashboard',
        type: 'opencti_custom_dashboard',
      },
    ];

    // Renders ShareableResourceCard for each document, which reads the
    // selected product-version filter from ServiceListLocalStorageKeyContext.
    testRender(
      <AppServiceListLocalStorageKeyContext
        localStorageKey={ServiceListLocalStorageKey.OpenCTIIntegrationFeeds}>
        <PublicShareableResourceList
          documents={documents as publicDocumentListItemFragment$data[]}
          serviceInstance={serviceInstance as seoServiceInstanceFragment$data}
          baseUrl="https://xtm.local"
          displayMode={ServiceListDisplayMode.Tab}
        />
      </AppServiceListLocalStorageKeyContext>
    );

    expect(
      screen.getByText(
        `Service.OpenctiIntegrations.Type.${IntegrationType.Connector}`
      )
    ).toBeInTheDocument();
    expect(screen.getByText('My Dashboard')).toBeInTheDocument();

    expect(screen.getByText('My Connector')).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    const connectorLink = links.find((l) =>
      l.getAttribute('href')?.includes('connector-doc')
    );
    expect(connectorLink).toHaveAttribute(
      'href',
      '/en/cybersecurity-solutions/my-service/connector-doc'
    );
  });
});
