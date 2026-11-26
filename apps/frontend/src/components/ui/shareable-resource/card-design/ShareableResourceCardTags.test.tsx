import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import { DocumentItemFragment, IntegrationType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShareableResourceCardTags } from './ShareableResourceCardTags';

const renderTags = (document: Record<string, unknown>) =>
  testRender(
    <ShareableResourceCardTags
      document={document as unknown as DocumentItemFragment}
    />
  );

describe('ShareableResourceCardTags', () => {
  it('should show the integration type when the resource is an integration', () => {
    // Given / When
    renderTags({
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      integration_type: IntegrationType.Connector,
    });

    // Then
    expect(
      screen.getByText(
        `Service.OpenctiIntegrations.Type.${IntegrationType.Connector}`
      )
    ).toBeInTheDocument();
  });

  it.each`
    type                                              | typeLabel
    ${ShareableResourceType.OPENAEV_SCENARIO}         | ${'Menu.Scenarios'}
    ${ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD} | ${'Menu.CustomDashboards'}
    ${ShareableResourceType.OPENCTI_CUSTOM_VIEW}      | ${'Menu.CustomViews'}
    ${ShareableResourceType.OPENCTI_PLAYBOOK}         | ${'Menu.Playbooks'}
  `(
    'should not show the resource type when the resource is a $type',
    ({ type, typeLabel }: { type: string; typeLabel: string }) => {
      // Given / When
      renderTags({ type });

      // Then
      expect(screen.queryByText(typeLabel)).not.toBeInTheDocument();
    }
  );
});
