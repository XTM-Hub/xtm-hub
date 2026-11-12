import AnalyticsClickCapture from '@/components/analytics/AnalyticsClickCapture';
import { ServiceManageSheet } from '@/components/service/components/ServiceManageSheet';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/service/components/ServiceContext', () => ({
  useServiceContext: () => ({
    serviceInstance: {},
    translationKey: 'Service.OpenctiPlaybooks',
    ServiceForm: () => null,
    handleAddSheet: vi.fn(),
    handleUpdateSheet: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-service-capability', () => ({
  default: () => true,
}));

const PAGE_TYPE = 'Library';
const RESOURCE_UUID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const RESOURCE_NAME = 'Ransomware playbook';
const DOCUMENT = {
  id: btoa(`Document:${RESOURCE_UUID}`),
  name: RESOURCE_NAME,
  type: ShareableResourceType.OPENCTI_PLAYBOOK,
} as documentItem_fragment$data;

describe('ServiceManageSheet', () => {
  it('should send the resource of the edited document when the sheet opened without a trigger is closed', async () => {
    // Given
    startAnalytics();
    const { user } = testRender(
      <>
        <AnalyticsClickCapture pageType={PAGE_TYPE} />
        <ServiceManageSheet
          document={DOCUMENT}
          open
          setOpen={vi.fn()}
        />
      </>
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Close' }));

    // Then
    expect(readTrackedEvents('ui_click')).toEqual([
      expect.objectContaining({
        element_id: 'common_panel_close',
        resource_id: RESOURCE_UUID,
        resource_name: RESOURCE_NAME,
        library: 'Playbooks',
        product: 'OpenCTI',
      }),
    ]);
  });
});
