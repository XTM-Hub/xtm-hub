import { ResourceViewTracker } from '@/components/service/document/ResourceViewTracker';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import {
  readGtagCommands,
  readTrackedEvents,
  startAnalytics,
} from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { beforeEach, describe, expect, it } from 'vitest';

const RESOURCE_ID = '9c81d7e6-1a2b-4c3d-9e8f-7a6b5c4d3e2f';
const OTHER_RESOURCE_ID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';

const makeResource = (id: string) => ({
  id,
  name: 'Ransomware playbook',
  type: ShareableResourceType.OPENCTI_PLAYBOOK,
  use_cases: [{ name: 'Detection' }, { name: 'Threat hunting' }],
});

beforeEach(() => {
  startAnalytics();
});

describe('ResourceViewTracker', () => {
  it('should send the resource view then one view per use case when the resource is displayed', () => {
    // Given / When
    testRender(<ResourceViewTracker resource={makeResource(RESOURCE_ID)} />);

    // Then
    expect(
      readGtagCommands()
        .filter(([command]) => command === 'event')
        .map(([, name]) => name)
    ).toEqual(['view_item', 'view_item_use_case', 'view_item_use_case']);
  });

  it.each([
    ['once', 'the same resource renders again', RESOURCE_ID, 1],
    ['again', 'another resource is displayed', OTHER_RESOURCE_ID, 2],
  ])(
    'should send the view %s when %s',
    (_outcome, _context, nextResourceId, viewCount) => {
      // Given
      const { rerender } = testRender(
        <ResourceViewTracker
          resource={makeResource(RESOURCE_ID)}
          deployEligibility="Can deploy"
        />
      );

      // When
      rerender(
        <ResourceViewTracker
          resource={makeResource(nextResourceId)}
          deployEligibility="No platform connected"
        />
      );

      // Then
      expect(readTrackedEvents('view_item')).toHaveLength(viewCount);
    }
  );
});
