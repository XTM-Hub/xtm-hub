import { v4 as uuidv4 } from 'uuid';
import { db } from '../../knexfile';
import {
  DeploymentRequestActivitySector,
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  DeploymentRequestJobTitle,
  DeploymentRequestPlatformRegion,
  DeploymentRequestPlatformState,
  DeploymentRequestSource,
  DeploymentRequestUseCase,
  PlatformIdentifier,
  ServiceInstanceCreationStatus,
} from '../../src/__generated__/resolvers-types';
import DeploymentRequest, {
  DeploymentRequestId,
  DeploymentRequestInitializer,
  DeploymentRequestMutator,
} from '../../src/model/kanel/public/DeploymentRequest';
import DeploymentRequestQuota, {
  DeploymentRequestQuotaMutator,
} from '../../src/model/kanel/public/DeploymentRequestQuota';
import ServiceInstance, {
  ServiceInstanceId,
} from '../../src/model/kanel/public/ServiceInstance';
import Subscription, {
  SubscriptionId,
} from '../../src/model/kanel/public/Subscription';
import { UserId } from '../../src/model/kanel/public/User';
import { DeploymentRequestDomain } from '../../src/modules/deployment/deployment.domain';
import { serviceInstanceTagMappedByPlatformIdentifier } from '../../src/modules/registration/registration.mapping';
import { ServiceInstanceDomain } from '../../src/modules/service/instance/service-instance.domain';
import { SERVICES, TEST_ORGANIZATIONS } from '../tests.const';
import { TestServiceHelper } from './test.service.helper';

export const TestDeploymentHelper = {
  deploymentRequest: {
    delete: async (field: DeploymentRequestMutator) => {
      await db<DeploymentRequest>('DeploymentRequest').where(field).del();
    },
    deleteAllWithServiceInstanceAndSubscription: async () => {
      const deploymentRequests = await db<DeploymentRequest>(
        'DeploymentRequest'
      ).select('service_instance_id');
      const serviceInstanceIds = deploymentRequests.map(
        ({ service_instance_id }: DeploymentRequest) => service_instance_id
      );

      await DeploymentRequestDomain.deleteDeploymentRequestBy({});
      await db<Subscription>('Subscription')
        .whereIn('service_instance_id', serviceInstanceIds)
        .del();
      await db<ServiceInstance>('ServiceInstance')
        .whereIn('id', serviceInstanceIds)
        .del();
    },
    update: async (field: DeploymentRequestMutator) => {
      await db<DeploymentRequest>('DeploymentRequest').update(field);
    },
    updateById: async (
      id: DeploymentRequestId,
      data: DeploymentRequestMutator
    ): Promise<void> => {
      await db<DeploymentRequest>('DeploymentRequest')
        .where({ id })
        .update(data);
    },
    loadMany: async (
      field: DeploymentRequestMutator
    ): Promise<DeploymentRequest[]> => {
      return db<DeploymentRequest[]>('DeploymentRequest')
        .where(field)
        .select('*');
    },
    create: async (
      data?: DeploymentRequestMutator
    ): Promise<DeploymentRequest | undefined> => {
      const [deploymentRequest] = await db<DeploymentRequest>(
        'DeploymentRequest'
      )
        .insert({
          id: uuidv4() as DeploymentRequestId,
          platform_id: uuidv4(),
          type: DeploymentRequestDeploymentType.Trial,
          platform_identifier: PlatformIdentifier.Opencti,
          region: DeploymentRequestPlatformRegion.EuWest,
          platform_token: uuidv4(),
          ...data,
        })
        .returning('*');
      return deploymentRequest;
    },
    createWithServiceInstanceAndSubscription: async (
      deploymentRequest: Partial<DeploymentRequestInitializer>
    ): Promise<DeploymentRequest> => {
      const serviceInstanceId = uuidv4() as ServiceInstanceId;
      await ServiceInstanceDomain.insertServiceInstance({
        id: serviceInstanceId,
        name: 'oneRandomTrialInstance',
        description: '',
        creation_status: ServiceInstanceCreationStatus.Pending,
        public: false,
        tags: [
          serviceInstanceTagMappedByPlatformIdentifier[
            PlatformIdentifier.Opencti
          ],
        ],
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });

      await db<Subscription>('Subscription').insert({
        id: uuidv4() as SubscriptionId,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
      });

      const defaultDeploymentRequestValues: DeploymentRequestInitializer = {
        activity_sector:
          DeploymentRequestActivitySector.ComputerNetworkSecurity,
        id: uuidv4() as DeploymentRequestId,
        job_title: DeploymentRequestJobTitle.CybersecurityEngineer,
        organization_requester_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        platform_identifier: PlatformIdentifier.Opencti,
        platform_token: uuidv4(),
        region: DeploymentRequestPlatformRegion.UsEast,
        request_date: new Date(Date.UTC(2025, 1, 3, 13, 12, 15)),
        hub_status: DeploymentRequestHubStatus.Pending,
        target_state: DeploymentRequestPlatformState.Active,
        actual_state: undefined,
        ordering: 1,
        type: DeploymentRequestDeploymentType.Trial,
        use_case: DeploymentRequestUseCase.ThreatHunting,
        service_instance_id: serviceInstanceId as ServiceInstanceId,
        user_requester_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        source: DeploymentRequestSource.Xtmhub,
      };

      return await DeploymentRequestDomain.insertDeploymentRequest({
        ...defaultDeploymentRequestValues,
        ...deploymentRequest,
      });
    },
    createBundle: async (data?: {
      bundle?: Partial<DeploymentRequestInitializer>;
      children?: Partial<DeploymentRequestInitializer>[];
    }): Promise<{
      bundle: DeploymentRequest;
      children: DeploymentRequest[];
    }> => {
      const bundle =
        await TestDeploymentHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
            ...data?.bundle,
          }
        );

      const children = await Promise.all(
        (data?.children ?? []).map((child) =>
          TestDeploymentHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              parent_id: bundle.id,
              ...child,
            }
          )
        )
      );

      return { bundle, children };
    },
    deleteBundle: async (bundleId: DeploymentRequestId): Promise<void> => {
      const idFilter: DeploymentRequestMutator = { id: bundleId };
      const parentIdFilter: DeploymentRequestMutator = {
        parent_id: bundleId,
      };
      const deploymentRequests = await db<DeploymentRequest[]>(
        'DeploymentRequest'
      )
        .where(idFilter)
        .orWhere(parentIdFilter)
        .select('*');

      for (const { service_instance_id } of deploymentRequests) {
        await TestDeploymentHelper.deploymentRequest.delete({
          service_instance_id,
        });
        await db<Subscription>('Subscription')
          .where({ service_instance_id })
          .del();
        await TestServiceHelper.serviceInstance.delete({
          id: service_instance_id,
        });
      }
    },
    assertProperties: async (
      id: DeploymentRequestId,
      {
        hub_status,
        target_state,
        ordering,
        counts_in_orga_quota,
        cancellation_reason,
        cancellation_date,
        cancellation_user_id,
      }: {
        hub_status?: DeploymentRequestHubStatus;
        target_state?: DeploymentRequestPlatformState;
        ordering?: number;
        counts_in_orga_quota?: boolean;
        cancellation_reason?: string | null;
        cancellation_date?: Date | null;
        cancellation_user_id?: UserId | null;
      }
    ) => {
      const deploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id,
        });

      expect(deploymentRequest).toBeDefined();

      if (hub_status) {
        expect(deploymentRequest!.hub_status).toBe(hub_status);
      }

      if (target_state) {
        expect(deploymentRequest!.target_state).toBe(target_state);
      }

      if (ordering !== undefined) {
        expect(deploymentRequest!.ordering).toBe(ordering);
      }

      if (counts_in_orga_quota !== undefined) {
        expect(deploymentRequest!.counts_in_orga_quota).toBe(
          counts_in_orga_quota
        );
      }

      if (cancellation_reason !== undefined) {
        expect(deploymentRequest!.cancellation_reason).toBe(
          cancellation_reason
        );
      }

      if (cancellation_date !== undefined) {
        expect(deploymentRequest!.cancellation_date).toEqual(cancellation_date);
      }

      if (cancellation_user_id !== undefined) {
        expect(deploymentRequest!.cancellation_user_id).toBe(
          cancellation_user_id
        );
      }
    },
  },
  deploymentRequestQuota: {
    load: async (
      field: DeploymentRequestQuotaMutator
    ): Promise<DeploymentRequestQuota | undefined> => {
      return db<DeploymentRequestQuota>('DeploymentRequestQuota')
        .where(field)
        .select('*')
        .first();
    },
    update: async (
      fieldWhere: DeploymentRequestQuotaMutator,
      fieldUpdate: DeploymentRequestQuotaMutator
    ): Promise<void> => {
      await db<DeploymentRequestQuota>('DeploymentRequestQuota')
        .update(fieldUpdate)
        .where(fieldWhere);
    },
  },
};
