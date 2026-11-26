import { describe, expect, it, vi } from 'vitest';
import { DeploymentRequestId } from '../../model/kanel/public/DeploymentRequest';
import { DeploymentRequestDataLoader } from './deployment.dataloader';
import {
  DeploymentRequestDomain,
  FullyQualifiedDeploymentRequest,
} from './deployment.domain';

const FIRST_BUNDLE_ID = 'bundle-1' as DeploymentRequestId;
const SECOND_BUNDLE_ID = 'bundle-2' as DeploymentRequestId;
const CHILDLESS_BUNDLE_ID = 'bundle-3' as DeploymentRequestId;

const makeChild = (id: string, parentId: DeploymentRequestId) =>
  ({
    id: id as DeploymentRequestId,
    parent_id: parentId,
  }) as FullyQualifiedDeploymentRequest;

describe('deploymentRequestDataLoader', () => {
  describe('batchLoadChildren', () => {
    it('should group the children under their own bundle, following the requested order', async () => {
      // Given
      const firstChild = makeChild('child-1', FIRST_BUNDLE_ID);
      const secondChild = makeChild('child-2', SECOND_BUNDLE_ID);
      const thirdChild = makeChild('child-3', FIRST_BUNDLE_ID);
      vi.spyOn(
        DeploymentRequestDomain,
        'loadChildrenByParentIds'
      ).mockResolvedValue([secondChild, firstChild, thirdChild]);

      // When
      const result = await DeploymentRequestDataLoader.batchLoadChildren([
        CHILDLESS_BUNDLE_ID,
        FIRST_BUNDLE_ID,
        SECOND_BUNDLE_ID,
      ]);

      // Then
      expect(result).toEqual([[], [firstChild, thirdChild], [secondChild]]);
    });
  });
});
