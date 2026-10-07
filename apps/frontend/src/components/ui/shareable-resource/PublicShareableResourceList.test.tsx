import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
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

  it('should render every resource in a single list with its public link when they have different types', () => {
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

    testRender(
      <PublicShareableResourceList
        documents={documents as publicDocumentListItemFragment$data[]}
        serviceInstance={serviceInstance as seoServiceInstanceFragment$data}
        baseUrl="https://xtm.local"
        displayMode={ServiceListDisplayMode.Tab}
      />
    );

    expect(screen.getByText('My Connector').closest('ul')).toBe(
      screen.getByText('My Dashboard').closest('ul')
    );

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
