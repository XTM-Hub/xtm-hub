import { buildResourceViewEvents } from '@/components/service/document/resource-view-tracker.utils';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { describe, expect, it } from 'vitest';

const RESOURCE_UUID = '9c81d7e6-1a2b-4c3d-9e8f-7a6b5c4d3e2f';
const RELAY_RESOURCE_ID = btoa(`Document:${RESOURCE_UUID}`);
const RESOURCE_NAME = 'Ransomware playbook';
const THREAT_HUNTING = 'Threat hunting';
const DETECTION = 'Detection';
const LIBRARY = 'Playbooks';
const PRODUCT = 'OpenCTI';

const resourceParams = {
  resource_id: RESOURCE_UUID,
  resource_name: RESOURCE_NAME,
  library: LIBRARY,
  product: PRODUCT,
};

const makeResource = (useCaseNames: string[]) => ({
  id: RELAY_RESOURCE_ID,
  name: RESOURCE_NAME,
  type: ShareableResourceType.OPENCTI_PLAYBOOK,
  use_cases: useCaseNames.map((name) => ({ name })),
});

describe('buildResourceViewEvents', () => {
  it('should describe the resource as a single item when it is viewed', () => {
    // Given
    const resource = makeResource([THREAT_HUNTING, DETECTION]);

    // When
    const { viewItem } = buildResourceViewEvents(
      resource,
      ShareableResourceType.OPENCTI_PLAYBOOK,
      'Can deploy'
    );

    // Then
    expect(viewItem).toEqual({
      ...resourceParams,
      items: [
        {
          item_id: RESOURCE_UUID,
          item_name: RESOURCE_NAME,
          item_category: LIBRARY,
          item_brand: PRODUCT,
          index: 0,
        },
      ],
      use_cases: `${DETECTION}|${THREAT_HUNTING}`,
      deploy_eligibility: 'Can deploy',
    });
  });

  it('should send no use cases when the resource has none', () => {
    // Given
    const resource = makeResource([]);

    // When
    const { viewItem } = buildResourceViewEvents(
      resource,
      ShareableResourceType.OPENCTI_PLAYBOOK,
      undefined
    );

    // Then
    expect(viewItem.use_cases).toBeUndefined();
  });

  it('should describe one view per use case when the resource has several', () => {
    // Given
    const resource = makeResource([THREAT_HUNTING, DETECTION]);

    // When
    const { useCaseViews } = buildResourceViewEvents(
      resource,
      ShareableResourceType.OPENCTI_PLAYBOOK,
      undefined
    );

    // Then
    expect(useCaseViews).toEqual([
      { ...resourceParams, use_case: DETECTION },
      { ...resourceParams, use_case: THREAT_HUNTING },
    ]);
  });
});
