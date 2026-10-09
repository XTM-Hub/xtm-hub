import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShareableResourceTypeChip } from './ShareableResourceTypeChip';

const renderChip = (document: Record<string, unknown>) =>
  testRender(
    <ShareableResourceTypeChip
      document={document as unknown as documentItem_fragment$data}
    />
  );

describe('ShareableResourceTypeChip', () => {
  it.each`
    type                                              | expectedLabel
    ${ShareableResourceType.OPENAEV_SCENARIO}         | ${'Menu.Scenarios'}
    ${ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD} | ${'Menu.CustomDashboards'}
    ${ShareableResourceType.OPENCTI_CUSTOM_VIEW}      | ${'Menu.CustomViews'}
    ${ShareableResourceType.OPENCTI_PLAYBOOK}         | ${'Menu.Playbooks'}
  `(
    'should show $expectedLabel when the resource is a $type',
    ({ type, expectedLabel }: { type: string; expectedLabel: string }) => {
      // Given / When
      renderChip({ type });

      // Then
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    }
  );

  it('should show the integration type when the resource is an integration', () => {
    // Given / When
    renderChip({
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      integration_type: IntegrationType.RssFeed,
    });

    // Then
    expect(
      screen.getByText(
        `Service.OpenctiIntegrations.Type.${IntegrationType.RssFeed}`
      )
    ).toBeInTheDocument();
  });
});
