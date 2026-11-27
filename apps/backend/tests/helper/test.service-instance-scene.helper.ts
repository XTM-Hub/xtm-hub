import { v4 as uuidv4 } from 'uuid';
import { OrganizationId } from '../../src/model/kanel/public/Organization';
import { TestServiceHelper } from './test.service.helper';

const pendingCleanups = new Set<() => Promise<void>>();

export const TestServiceInstanceSceneHelper = {
  serviceInstanceScene: {
    // A service instance of the given visibility, which each of the organizations subscribes to
    create: async ({
      isPublic,
      subscribedBy = [],
    }: {
      isPublic: boolean;
      subscribedBy?: OrganizationId[];
    }) => {
      const serviceInstance = await TestServiceHelper.serviceInstance.create({
        name: `service-instance-scene-${uuidv4()}`,
        public: isPublic,
      });
      const cleanup = async () => {
        pendingCleanups.delete(cleanup);
        await TestServiceHelper.subscription.delete({
          service_instance_id: serviceInstance.id,
        });
        await TestServiceHelper.serviceInstance.delete({
          id: serviceInstance.id,
        });
      };
      try {
        for (const organizationId of subscribedBy) {
          await TestServiceHelper.subscription.create({
            organization_id: organizationId,
            service_instance_id: serviceInstance.id,
          });
        }
      } catch (error) {
        await cleanup();
        throw error;
      }
      pendingCleanups.add(cleanup);
      return { serviceInstance, cleanup };
    },
    // Cleans up the scenes created and not cleaned up yet
    cleanupAll: async () => {
      for (const cleanup of [...pendingCleanups]) {
        await cleanup();
      }
    },
  },
};
