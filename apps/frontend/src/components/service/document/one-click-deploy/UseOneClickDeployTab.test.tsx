import { useOneClickDeployTab } from '@/components/service/document/one-click-deploy/UseOneClickDeployTab';
import useExternalTab from '@/hooks/use-external-tab';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { testRenderHook } from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-external-tab', () => ({
  default: vi.fn(() => ({ openTab: vi.fn(), postMessage: vi.fn() })),
}));

const deployUrlOf = (documentData: Partial<documentItem_fragment$data>) => {
  testRenderHook(() =>
    useOneClickDeployTab({
      platformBasePath: 'https://opencti.local',
      documentData: documentData as documentItem_fragment$data,
    })
  );
  return vi.mocked(useExternalTab).mock.lastCall?.[0].url;
};

describe('useOneClickDeployTab', () => {
  it('opens the hunt pack deploy route of OpenCTI for a hunt pack', () => {
    expect(
      deployUrlOf({
        id: 'document-1',
        type: ShareableResourceType.OPENCTI_HUNT_PACK,
        service_instance: { id: 'service-1' },
      } as Partial<documentItem_fragment$data>)
    ).toBe(
      'https://opencti.local/dashboard/xtm-hub/deploy-hunt-pack/service-1/document-1'
    );
  });

  it('opens the playbook deploy route of OpenCTI for a playbook', () => {
    expect(
      deployUrlOf({
        id: 'document-2',
        type: ShareableResourceType.OPENCTI_PLAYBOOK,
        service_instance: { id: 'service-2' },
      } as Partial<documentItem_fragment$data>)
    ).toBe(
      'https://opencti.local/dashboard/xtm-hub/deploy-playbook/service-2/document-2'
    );
  });
});
