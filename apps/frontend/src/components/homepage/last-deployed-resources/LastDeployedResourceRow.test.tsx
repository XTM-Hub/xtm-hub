import type { LastDeployedOverview } from '@/components/homepage/last-deployed-resources/LastDeployedResourcesSection';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LastDeployedResourceRow from './LastDeployedResourceRow';

const buildResource = (
  overrides: Partial<LastDeployedOverview['resources'][number]> = {}
): LastDeployedOverview['resources'][number] => {
  const baseResource: LastDeployedOverview['resources'][number] = {
    document: {
      __typename: 'CustomView',
      id: 'doc-1',
      name: 'My Custom View',
      short_description: null,
      type: 'opencti_custom_view',
      status: 'published',
      slug: 'my-custom-view',
      service_instance_id: 'svc-1',
      children_documents: [],
      use_cases: [],
    },
    deployedAt: '2026-07-03T10:00:00.000Z',
    deployedBy: {
      id: 'user-1',
      first_name: 'john',
      last_name: 'doe',
      email: 'john@filigran.io',
      picture: 'https://example.com/avatar.png',
    },
  };

  return {
    ...baseResource,
    ...overrides,
    document: {
      ...baseResource.document,
      ...overrides.document,
    },
    deployedBy:
      overrides.deployedBy === undefined
        ? baseResource.deployedBy
        : overrides.deployedBy,
  };
};

describe('LastDeployedResourceRow', () => {
  it.each`
    firstName | lastName | expectedName  | description
    ${'jane'} | ${'doe'} | ${'Jane Doe'} | ${'entirely lowercase'}
    ${'JANE'} | ${'DOE'} | ${'Jane Doe'} | ${'entirely uppercase'}
    ${'jane'} | ${'DOE'} | ${'Jane Doe'} | ${'uppercase last name only'}
    ${'JANE'} | ${'doe'} | ${'Jane Doe'} | ${'uppercase first name only'}
    ${'jAnE'} | ${'doE'} | ${'Jane Doe'} | ${'mixed case on both names'}
  `(
    'renders deployed author full name correctly ($description)',
    ({ firstName, lastName, expectedName }) => {
      const resource = buildResource({
        deployedBy: {
          id: 'user-2',
          first_name: firstName,
          last_name: lastName,
          email: 'jane@filigran.io',
          picture: 'https://example.com/jane.png',
        },
      });

      testRender(<LastDeployedResourceRow resource={resource} />);

      expect(screen.getByText(expectedName)).toBeInTheDocument();
    }
  );

  it('falls back to deployed author email when full name is empty', () => {
    const resource = buildResource({
      deployedBy: {
        id: 'user-3',
        first_name: null,
        last_name: null,
        email: 'author@filigran.io',
        picture: null,
      },
    });

    testRender(<LastDeployedResourceRow resource={resource} />);

    expect(screen.getByText('author@filigran.io')).toBeInTheDocument();
  });

  it('renders "Deleted user" fallback when deployedBy is missing', () => {
    const resource = buildResource({ deployedBy: null });

    testRender(<LastDeployedResourceRow resource={resource} />);

    expect(screen.getByText('By')).toBeInTheDocument();
    expect(screen.getByText('DeletedUser')).toBeInTheDocument();
  });

  it('returns null when required document fields are missing', () => {
    const resource = buildResource({
      document: {
        ...buildResource().document,
        slug: null,
      },
    });

    const { container } = testRender(
      <LastDeployedResourceRow resource={resource} />
    );

    expect(container.firstChild).toBeNull();
  });
});
