import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import {
  DocumentImageType,
  HomepageResourceDocumentFragment,
} from '@graphql/generated';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomepageResourceList from './HomepageResourceList';

const { mockCard } = vi.hoisted(() => ({ mockCard: vi.fn(() => null) }));

vi.mock('@/components/ui/shareable-resource/ShareableResourceCard', () => ({
  default: mockCard,
}));

const BASE_URL = 'https://hub.filigran.io';

const buildDocument = (
  overrides: Partial<HomepageResourceDocumentFragment> = {}
): HomepageResourceDocumentFragment =>
  ({
    __typename: 'DefaultDocument',
    id: 'doc-1',
    name: 'My Resource',
    type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
    status: 'published',
    slug: 'my-resource',
    short_description: null,
    service_instance_id: 'instance-1',
    children_documents: null,
    use_cases: null,
    uploader: null,
    ...overrides,
  }) as HomepageResourceDocumentFragment;

describe('HomepageResourceList', () => {
  beforeEach(() => {
    mockCard.mockClear();
  });

  it('renders nothing when there is no document', () => {
    const { container } = render(
      <HomepageResourceList
        title="Resources"
        baseUrl={BASE_URL}
        paramsLocale="en"
        documents={[]}
      />
    );

    expect(container).toBeEmptyDOMElement();
    expect(mockCard).not.toHaveBeenCalled();
  });

  it('renders the title and one library card per document', () => {
    const { getByRole } = render(
      <HomepageResourceList
        title="Resources"
        baseUrl={BASE_URL}
        paramsLocale="en"
        documents={[
          buildDocument({ id: 'doc-1' }),
          buildDocument({ id: 'doc-2', slug: 'other-resource' }),
        ]}
      />
    );

    expect(getByRole('heading', { name: 'Resources' })).toBeInTheDocument();
    expect(mockCard).toHaveBeenCalledTimes(2);
    expect(mockCard).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({ id: 'doc-1' }),
      }),
      undefined
    );
    expect(mockCard).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({ id: 'doc-2' }),
      }),
      undefined
    );
  });

  it.each`
    description                                    | isAuthenticated | service_instance_id | expectedUrl
    ${'unauthenticated'}                           | ${false}        | ${'instance-1'}     | ${'/en/cybersecurity-solutions/opencti-custom-dashboards/my-resource'}
    ${'authenticated with service_instance_id'}    | ${true}         | ${'instance-1'}     | ${'/app/service/opencti_custom_dashboards/instance-1/doc-1'}
    ${'authenticated without service_instance_id'} | ${true}         | ${null}             | ${'/en/cybersecurity-solutions/opencti-custom-dashboards/my-resource'}
  `(
    'passes correct detailUrl when $description',
    ({
      isAuthenticated,
      service_instance_id,
      expectedUrl,
    }: {
      isAuthenticated: boolean;
      service_instance_id: string | null;
      expectedUrl: string;
    }) => {
      render(
        <HomepageResourceList
          title="Resources"
          baseUrl={BASE_URL}
          paramsLocale="en"
          isAuthenticated={isAuthenticated}
          documents={[buildDocument({ service_instance_id })]}
        />
      );

      expect(mockCard).toHaveBeenCalledWith(
        expect.objectContaining({ detailUrl: expectedUrl }),
        undefined
      );
    }
  );

  it('passes the absolute public url as shareLinkUrl', () => {
    render(
      <HomepageResourceList
        title="Resources"
        baseUrl={BASE_URL}
        paramsLocale="en"
        isAuthenticated
        documents={[buildDocument()]}
      />
    );

    expect(mockCard).toHaveBeenCalledWith(
      expect.objectContaining({
        shareLinkUrl: `${BASE_URL}/cybersecurity-solutions/opencti-custom-dashboards/my-resource`,
      }),
      undefined
    );
  });

  it('passes the document service instance id to the card', () => {
    render(
      <HomepageResourceList
        title="Resources"
        baseUrl={BASE_URL}
        paramsLocale="en"
        documents={[buildDocument({ service_instance_id: 'instance-42' })]}
      />
    );

    expect(mockCard).toHaveBeenCalledWith(
      expect.objectContaining({ serviceInstance: { id: 'instance-42' } }),
      undefined
    );
  });

  describe('logo', () => {
    const children_documents = [
      { id: 'logo-1', image_type: DocumentImageType.Logo },
    ];

    it('keeps the logo when the document has a service instance id', () => {
      render(
        <HomepageResourceList
          title="Resources"
          baseUrl={BASE_URL}
          paramsLocale="en"
          documents={[
            buildDocument({
              service_instance_id: 'instance-1',
              children_documents,
            }),
          ]}
        />
      );

      expect(mockCard).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ children_documents }),
        }),
        undefined
      );
    });

    it('drops the logo when the document has no service instance id, so the card never builds a broken image url', () => {
      render(
        <HomepageResourceList
          title="Resources"
          baseUrl={BASE_URL}
          paramsLocale="en"
          documents={[
            buildDocument({ service_instance_id: null, children_documents }),
          ]}
        />
      );

      expect(mockCard).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            id: 'doc-1',
            children_documents: null,
          }),
        }),
        undefined
      );
    });
  });

  it.each`
    isAuthenticated | expectedPublicPath
    ${false}        | ${true}
    ${true}         | ${false}
  `(
    'passes publicPath=$expectedPublicPath when isAuthenticated=$isAuthenticated',
    ({
      isAuthenticated,
      expectedPublicPath,
    }: {
      isAuthenticated: boolean;
      expectedPublicPath: boolean;
    }) => {
      render(
        <HomepageResourceList
          title="Resources"
          baseUrl={BASE_URL}
          paramsLocale="en"
          isAuthenticated={isAuthenticated}
          documents={[buildDocument()]}
        />
      );

      expect(mockCard).toHaveBeenCalledWith(
        expect.objectContaining({ publicPath: expectedPublicPath }),
        undefined
      );
    }
  );

  it('skips documents of an unknown type or without a slug', () => {
    render(
      <HomepageResourceList
        title="Resources"
        baseUrl={BASE_URL}
        paramsLocale="en"
        documents={[
          buildDocument({ id: 'unknown', type: 'service_picture' }),
          buildDocument({ id: 'no-slug', slug: null }),
          buildDocument({ id: 'ok' }),
        ]}
      />
    );

    expect(mockCard).toHaveBeenCalledTimes(1);
    expect(mockCard).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({ id: 'ok' }),
      }),
      undefined
    );
  });
});
