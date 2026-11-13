import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { HomepageDocumentFragment } from '@graphql/generated';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomepageResourceList from './HomepageResourceList';

const { mockCard } = vi.hoisted(() => ({ mockCard: vi.fn(() => null) }));

vi.mock('@/components/homepage/resources/HomepageResourceCard', () => ({
  default: mockCard,
}));

const buildDocument = (
  overrides: Partial<HomepageDocumentFragment> = {}
): HomepageDocumentFragment =>
  ({
    __typename: 'DefaultDocument',
    id: 'doc-1',
    name: 'My Resource',
    type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
    status: 'published',
    slug: 'my-resource',
    short_description: null,
    service_instance_id: null,
    children_documents: null,
    use_cases: null,
    ...overrides,
  }) as HomepageDocumentFragment;

describe('HomepageResourceList — url', () => {
  beforeEach(() => {
    mockCard.mockClear();
  });

  it.each`
    description                                 | isAuthenticated | service_instance_id | expectedUrl
    ${'unauthenticated'}                        | ${false}        | ${'instance-1'}     | ${'/en/cybersecurity-solutions/opencti-custom-dashboards/my-resource'}
    ${'authenticated with service_instance_id'} | ${true}         | ${'instance-1'}     | ${'/app/service/opencti_custom_dashboards/instance-1/doc-1'}
  `(
    'passes correct url when $description',
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
          locale="en"
          isAuthenticated={isAuthenticated}
          documents={[buildDocument({ service_instance_id })]}
        />
      );

      expect(mockCard).toHaveBeenCalledWith(
        expect.objectContaining({ url: expectedUrl }),
        undefined
      );
    }
  );
});

describe('HomepageResourceList — published prop', () => {
  beforeEach(() => {
    mockCard.mockClear();
  });

  it('passes published={false} to the card when document type is OPENCTI_INTEGRATION, even if the resource is published', () => {
    render(
      <HomepageResourceList
        title="Resources"
        locale="en"
        documents={[
          buildDocument({
            type: ShareableResourceType.OPENCTI_INTEGRATION,
            status: 'published',
          }),
        ]}
      />
    );

    expect(mockCard).toHaveBeenCalledWith(
      expect.objectContaining({ published: false }),
      undefined
    );
  });

  it('passes published={true} to the card for non-integration types when the resource is published', () => {
    render(
      <HomepageResourceList
        title="Resources"
        locale="en"
        documents={[
          buildDocument({
            type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
            status: 'published',
          }),
        ]}
      />
    );

    expect(mockCard).toHaveBeenCalledWith(
      expect.objectContaining({ published: true }),
      undefined
    );
  });

  it.each(['draft', 'in_validation'] as const)(
    'passes published={false} to the card for non-integration types when the resource is %s',
    (status) => {
      // Given
      render(
        <HomepageResourceList
          title="Resources"
          locale="en"
          documents={[
            buildDocument({
              type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
              status,
            }),
          ]}
        />
      );

      // Then
      expect(mockCard).toHaveBeenCalledWith(
        expect.objectContaining({ published: false }),
        undefined
      );
    }
  );
});
