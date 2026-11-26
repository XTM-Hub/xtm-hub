import { fetchServiceInstanceById } from '@/components/service/service-instance.server';
import testRender from '@/utils/test/test-render';
import {
  ServiceDefinitionIdentifier,
  type ServiceInstanceItemFragment,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The ten service pages share one shape: they read their service instance on
// the server and hand it to their client page loader, or show a not found
// heading. One dataset covers them all.

vi.mock('@/components/service/service-instance.server', () => ({
  fetchServiceInstanceById: vi.fn(),
}));

vi.mock('@/hooks/get-translate', () => ({
  getTranslate: async () => (key: string) => key,
}));

interface PageLoaderStubProps {
  serviceInstance: ServiceInstanceItemFragment;
  documentId?: string;
}

// The client page loaders fetch their documents: they are not under test.
const PageLoaderStub = ({
  serviceInstance,
  documentId,
}: PageLoaderStubProps) => (
  <div>
    page-loader:{serviceInstance.name}:{documentId ?? 'list'}
  </div>
);

vi.mock('./openaev_scenarios/[serviceInstanceId]/page-loader', () => ({
  default: PageLoaderStub,
}));
vi.mock('./opencti_custom_dashboards/[serviceInstanceId]/page-loader', () => ({
  default: PageLoaderStub,
}));
vi.mock('./opencti_custom_views/[serviceInstanceId]/page-loader', () => ({
  default: PageLoaderStub,
}));
vi.mock('./opencti_integrations/[serviceInstanceId]/page-loader', () => ({
  default: PageLoaderStub,
}));
vi.mock('./opencti_playbooks/[serviceInstanceId]/page-loader', () => ({
  default: PageLoaderStub,
}));
vi.mock(
  './openaev_scenarios/[serviceInstanceId]/[documentId]/page-loader',
  () => ({
    default: PageLoaderStub,
  })
);
vi.mock(
  './opencti_custom_dashboards/[serviceInstanceId]/[documentId]/page-loader',
  () => ({ default: PageLoaderStub })
);
vi.mock(
  './opencti_custom_views/[serviceInstanceId]/[documentId]/page-loader',
  () => ({ default: PageLoaderStub })
);
vi.mock(
  './opencti_integrations/[serviceInstanceId]/[documentId]/page-loader',
  () => ({ default: PageLoaderStub })
);
vi.mock(
  './opencti_playbooks/[serviceInstanceId]/[documentId]/page-loader',
  () => ({ default: PageLoaderStub })
);

const SERVICE_INSTANCE_ID = 'service-instance-1';
const ENCODED_SERVICE_INSTANCE_ID = 'service%20instance%201';
const DECODED_SERVICE_INSTANCE_ID = 'service instance 1';
const DOCUMENT_ID = 'document-1';
const SERVICE_NAME = 'Shared resources';
const SERVICE_NOT_FOUND_KEY = 'Utils.ServiceNotFound';
const DOCUMENT_NOT_FOUND_KEY = 'Utils.DocumentNotFound';

const SERVICE_INSTANCE: ServiceInstanceItemFragment = {
  id: SERVICE_INSTANCE_ID,
  name: SERVICE_NAME,
  description: null,
  slug: null,
  capabilities: [],
  service_definition: {
    identifier: ServiceDefinitionIdentifier.OpenctiPlaybooks,
  },
};

type ServicePage = (props: {
  params: Promise<{ serviceInstanceId: string; documentId: string }>;
}) => Promise<ReactNode>;

const loadPage = async (load: () => Promise<{ default: unknown }>) =>
  (await load()).default as ServicePage;

const LIST_PAGES = [
  {
    page: 'OpenAEV scenarios',
    load: () => import('./openaev_scenarios/[serviceInstanceId]/page'),
    notFound: SERVICE_NOT_FOUND_KEY,
  },
  {
    page: 'OpenCTI custom dashboards',
    load: () => import('./opencti_custom_dashboards/[serviceInstanceId]/page'),
    notFound: SERVICE_NOT_FOUND_KEY,
  },
  {
    page: 'OpenCTI custom views',
    load: () => import('./opencti_custom_views/[serviceInstanceId]/page'),
    notFound: SERVICE_NOT_FOUND_KEY,
  },
  {
    page: 'OpenCTI integrations',
    load: () => import('./opencti_integrations/[serviceInstanceId]/page'),
    notFound: SERVICE_NOT_FOUND_KEY,
  },
  {
    page: 'OpenCTI playbooks',
    load: () => import('./opencti_playbooks/[serviceInstanceId]/page'),
    notFound: SERVICE_NOT_FOUND_KEY,
  },
];

const DOCUMENT_PAGES = [
  {
    page: 'OpenAEV scenario',
    load: () =>
      import('./openaev_scenarios/[serviceInstanceId]/[documentId]/page'),
    notFound: DOCUMENT_NOT_FOUND_KEY,
  },
  {
    page: 'OpenCTI custom dashboard',
    load: () =>
      import('./opencti_custom_dashboards/[serviceInstanceId]/[documentId]/page'),
    notFound: DOCUMENT_NOT_FOUND_KEY,
  },
  {
    page: 'OpenCTI custom view',
    load: () =>
      import('./opencti_custom_views/[serviceInstanceId]/[documentId]/page'),
    notFound: DOCUMENT_NOT_FOUND_KEY,
  },
  {
    page: 'OpenCTI integration',
    load: () =>
      import('./opencti_integrations/[serviceInstanceId]/[documentId]/page'),
    notFound: DOCUMENT_NOT_FOUND_KEY,
  },
  {
    page: 'OpenCTI playbook',
    load: () =>
      import('./opencti_playbooks/[serviceInstanceId]/[documentId]/page'),
    notFound: DOCUMENT_NOT_FOUND_KEY,
  },
];

const renderPage = async (
  load: () => Promise<{ default: unknown }>,
  params: { serviceInstanceId: string; documentId: string }
) => {
  const Page = await loadPage(load);
  testRender(<>{await Page({ params: Promise.resolve(params) })}</>);
};

describe('service pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchServiceInstanceById).mockResolvedValue(SERVICE_INSTANCE);
  });

  it.each([...LIST_PAGES, ...DOCUMENT_PAGES])(
    'should read the service instance of the decoded id on the $page page',
    async ({ load }) => {
      // When
      await renderPage(load, {
        serviceInstanceId: ENCODED_SERVICE_INSTANCE_ID,
        documentId: DOCUMENT_ID,
      });

      // Then
      expect(fetchServiceInstanceById).toHaveBeenCalledWith(
        DECODED_SERVICE_INSTANCE_ID
      );
    }
  );

  describe.each(LIST_PAGES)('$page list page', ({ load, notFound }) => {
    it('should give the service instance to the page loader and name it in the breadcrumb', async () => {
      // When
      await renderPage(load, {
        serviceInstanceId: SERVICE_INSTANCE_ID,
        documentId: '',
      });

      // Then
      expect(
        screen.getByText(`page-loader:${SERVICE_NAME}:list`)
      ).toBeInTheDocument();
      expect(screen.getByText(SERVICE_NAME)).toBeInTheDocument();
    });

    it('should show the not found heading when the service instance cannot be read', async () => {
      // Given
      vi.mocked(fetchServiceInstanceById).mockResolvedValue(null);

      // When
      await renderPage(load, {
        serviceInstanceId: SERVICE_INSTANCE_ID,
        documentId: '',
      });

      // Then
      expect(
        screen.getByRole('heading', { name: notFound })
      ).toBeInTheDocument();
    });
  });

  describe.each(DOCUMENT_PAGES)('$page page', ({ load, notFound }) => {
    it('should give the service instance and the decoded document id to the page loader', async () => {
      // When
      await renderPage(load, {
        serviceInstanceId: SERVICE_INSTANCE_ID,
        documentId: 'document%201',
      });

      // Then
      expect(
        screen.getByText(`page-loader:${SERVICE_NAME}:document 1`)
      ).toBeInTheDocument();
    });

    it.each([
      {
        case: 'the service instance cannot be read',
        serviceInstance: null,
        documentId: DOCUMENT_ID,
      },
      {
        case: 'the document id is empty',
        serviceInstance: SERVICE_INSTANCE,
        documentId: '',
      },
    ])(
      'should show the not found heading when $case',
      async ({ serviceInstance, documentId }) => {
        // Given
        vi.mocked(fetchServiceInstanceById).mockResolvedValue(serviceInstance);

        // When
        await renderPage(load, {
          serviceInstanceId: SERVICE_INSTANCE_ID,
          documentId,
        });

        // Then
        expect(
          screen.getByRole('heading', { name: notFound })
        ).toBeInTheDocument();
      }
    );
  });
});
