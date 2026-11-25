import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import { DocumentItemFragment } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShareableResourceCardOverview } from './ShareableResourceCardOverview';

const renderOverview = (type: string) =>
  testRender(
    <ShareableResourceCardOverview
      document={{ type } as unknown as DocumentItemFragment}
    />
  );

describe('ShareableResourceCardOverview', () => {
  it.each([
    [ShareableResourceType.OPENCTI_INTEGRATION, 'OpenCTI - Menu.Integrations'],
    [
      ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
      'OpenCTI - Menu.CustomDashboards',
    ],
    [ShareableResourceType.OPENCTI_CUSTOM_VIEW, 'OpenCTI - Menu.CustomViews'],
    [ShareableResourceType.OPENCTI_PLAYBOOK, 'OpenCTI - Menu.Playbooks'],
    [ShareableResourceType.OPENAEV_SCENARIO, 'OpenAEV - Menu.Scenarios'],
  ])('should show the platform and library of a %s', (type, expected) => {
    // Given / When
    renderOverview(type);

    // Then
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('should render nothing when the resource type is unknown', () => {
    // Given / When
    const { container } = renderOverview('unknown_type');

    // Then
    expect(container).toBeEmptyDOMElement();
  });
});
