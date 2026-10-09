import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareableResourceCardFooterVersion } from './ShareableResourceCardFooterVersions';

const PRODUCT_VERSION = '6.5.0';
const EXTRA_CONTENT = 'extra';

vi.mock('@/hooks/use-connector-compatibility', () => ({
  useConnectorCompatibility: () => ({
    status: 'unknown',
    compatiblePlatforms: '',
    incompatiblePlatforms: '',
    incompatibleCount: 0,
  }),
}));

describe('ShareableResourceCardFooterVersion', () => {
  it('should render the version, the share button and the extra content when rendering a connector', () => {
    // Given / When
    testRender(
      <ShareableResourceCardFooterVersion
        document={
          {
            id: 'doc-1',
            active: true,
            product_version: PRODUCT_VERSION,
            integration_type: IntegrationType.Connector,
          } as documentItem_fragment$data
        }
        shareLinkUrl="https://share"
        extraContent={<span>{EXTRA_CONTENT}</span>}
      />
    );

    // Then
    expect(screen.getByText(`V.${PRODUCT_VERSION}`)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Service.ShareableResources.Share' })
    ).toBeInTheDocument();
    expect(screen.getByText(EXTRA_CONTENT)).toBeInTheDocument();
  });
});
