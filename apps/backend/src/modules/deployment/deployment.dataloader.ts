import DataLoader from 'dataloader';
import { DeploymentRequestId } from '../../model/kanel/public/DeploymentRequest';
import {
  DeploymentRequestDomain,
  FullyQualifiedDeploymentRequest,
} from './deployment.domain';

export interface DeploymentRequestDataLoaders {
  childrenByParentLoader: DataLoader<
    DeploymentRequestId,
    FullyQualifiedDeploymentRequest[]
  >;
}

export const DeploymentRequestDataLoader = {
  batchLoadChildren: async (
    parentIds: readonly DeploymentRequestId[]
  ): Promise<FullyQualifiedDeploymentRequest[][]> => {
    const rows =
      await DeploymentRequestDomain.loadChildrenByParentIds(parentIds);

    const map = new Map<string, FullyQualifiedDeploymentRequest[]>();
    for (const row of rows) {
      if (row.parent_id === null) {
        continue;
      }
      const existing = map.get(row.parent_id) ?? [];
      existing.push(row);
      map.set(row.parent_id, existing);
    }
    return parentIds.map((parentId) => map.get(parentId) ?? []);
  },

  create: (): DeploymentRequestDataLoaders => ({
    childrenByParentLoader: new DataLoader(
      DeploymentRequestDataLoader.batchLoadChildren
    ),
  }),
};
