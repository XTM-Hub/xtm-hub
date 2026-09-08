import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../../knexfile';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  contextRegistererUserSecondOrga,
  GRAPHQL_RESOLVE_INFO,
  requestContextRegistererUserSecondOrga,
  requestContextSystemUserManageDeployment,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  DeploymentRequest,
  DeploymentRequestActivitySector,
  DeploymentRequestConnection,
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  DeploymentRequestJobTitle,
  DeploymentRequestPlatformRegion,
  DeploymentRequestPlatformState,
  DeploymentRequestSource,
  DeploymentRequestUseCase,
  PlatformDeploymentRequestConnection,
  PlatformIdentifier,
  QueryDeploymentRequestsArgs,
  QueryDeploymentRequestsListArgs,
  RegisteredPlatform,
  ReorderDeploymentRequestInQueueDirection,
  TrialDeploymentsInput,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { DeploymentRequestId } from '../../model/kanel/public/DeploymentRequest';
import DeploymentRequestQuota from '../../model/kanel/public/DeploymentRequestQuota';
import { ErrorCode } from '../../utils/error/error.code';
import { ErrorType } from '../../utils/error/error.type';
import { RegistrationApp } from '../registration/registration.app';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { DeploymentApp } from './deployment.app';
import { DeploymentRequestDomain } from './deployment.domain';
import resolver from './deployment.resolver';

describe('deployment resolver', () => {
  afterEach(async () => {
    await TestHelper.deploymentRequest.deleteAllWithServiceInstanceAndSubscription();
  });
  describe('createDeploymentRequest', () => {
    beforeEach(() => {
      requestContext.set(requestContextRegistererUserSecondOrga);
    });
    it('should return the deployment request created', async () => {
      const deployment = await resolver.Mutation.createDeploymentRequest(
        undefined,
        {
          input: {
            activity_sector:
              DeploymentRequestActivitySector.ComputerNetworkSecurity,
            job_title: DeploymentRequestJobTitle.CybersecurityEngineer,
            use_cases_by_product: [
              {
                platform_identifier: PlatformIdentifier.Opencti,
                use_case: DeploymentRequestUseCase.ThreatHunting,
              },
            ],
            products: [PlatformIdentifier.Opencti],
            region: DeploymentRequestPlatformRegion.UsEast,
            type: DeploymentRequestDeploymentType.Trial,
            source: DeploymentRequestSource.Xtmhub,
          },
        }
      );
      expect(deployment).toMatchObject({
        activity_sector:
          DeploymentRequestActivitySector.ComputerNetworkSecurity,
        job_title: DeploymentRequestJobTitle.CybersecurityEngineer,
        use_case: DeploymentRequestUseCase.ThreatHunting,
        platform_identifier: PlatformIdentifier.Opencti,
        region: DeploymentRequestPlatformRegion.UsEast,
        type: DeploymentRequestDeploymentType.Trial,
        hub_status: DeploymentRequestHubStatus.Pending,
        target_state: DeploymentRequestPlatformState.Active,
        actual_state: DeploymentRequestPlatformState.Unprovisioned,
      });
    });
  });

  describe('updateDeploymentRequest', () => {
    let initialDeployment: DeploymentRequest;

    beforeEach(async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);
      initialDeployment = await DeploymentApp.createDeploymentRequest({
        activity_sector:
          DeploymentRequestActivitySector.ComputerNetworkSecurity,
        job_title: DeploymentRequestJobTitle.CybersecurityEngineer,
        use_cases_by_product: [
          {
            platform_identifier: PlatformIdentifier.Opencti,
            use_case: DeploymentRequestUseCase.ThreatHunting,
          },
        ],
        products: [PlatformIdentifier.Opencti],
        region: DeploymentRequestPlatformRegion.UsEast,
        type: DeploymentRequestDeploymentType.Trial,
        source: DeploymentRequestSource.Xtmhub,
      });
      requestContext.set(requestContextSystemUserManageDeployment);
    });
    it('should return the updated deployment request', async () => {
      expect(initialDeployment).toMatchObject({
        platform_identifier: PlatformIdentifier.Opencti,
        region: DeploymentRequestPlatformRegion.UsEast,
        type: DeploymentRequestDeploymentType.Trial,
        start_date: null,
        end_date: null,
        hub_status: DeploymentRequestHubStatus.Pending,
        target_state: DeploymentRequestPlatformState.Active,
        actual_state: DeploymentRequestPlatformState.Unprovisioned,
      });

      const updatedDeployment = await resolver.Mutation.updateDeploymentRequest(
        undefined,
        {
          input: {
            id: initialDeployment.id,
            actual_state: DeploymentRequestPlatformState.Provisioning,
          },
        }
      );

      expect(updatedDeployment).toMatchObject({
        platform_identifier: PlatformIdentifier.Opencti,
        region: DeploymentRequestPlatformRegion.UsEast,
        type: DeploymentRequestDeploymentType.Trial,
        hub_status: DeploymentRequestHubStatus.Provisioning,
        target_state: DeploymentRequestPlatformState.Active,
        actual_state: DeploymentRequestPlatformState.Provisioning,
        start_date: null,
        end_date: null,
      });

      const updatedActiveDeployment =
        await resolver.Mutation.updateDeploymentRequest(undefined, {
          input: {
            id: initialDeployment.id,
            actual_state: DeploymentRequestPlatformState.Provisioning,
            start_date: new Date(2025, 1, 3),
            end_date: new Date(2025, 2, 3),
            platform_id: 'fake product instance id',
            failure_reason: 'not failed',
          },
        });
      expect(updatedActiveDeployment).toMatchObject({
        activity_sector:
          DeploymentRequestActivitySector.ComputerNetworkSecurity,
        job_title: DeploymentRequestJobTitle.CybersecurityEngineer,
        use_case: DeploymentRequestUseCase.ThreatHunting,
        platform_identifier: PlatformIdentifier.Opencti,
        region: DeploymentRequestPlatformRegion.UsEast,
        type: DeploymentRequestDeploymentType.Trial,
        hub_status: DeploymentRequestHubStatus.Provisioning,
        target_state: DeploymentRequestPlatformState.Active,
        actual_state: DeploymentRequestPlatformState.Provisioning,
        start_date: new Date(2025, 1, 3),
        end_date: new Date(2025, 2, 3),
        platform_id: 'fake product instance id',
        failure_reason: 'not failed',
        organization_name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
        organization_domains: [
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.DOMAINS.FIRST.NAME,
        ],
        requester_email:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.EMAIL,
        requester_first_name:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.FIRST_NAME,
        requester_last_name:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.LAST_NAME,
      });
    });
    it('should return an error when status transition is not allowed', async () => {
      const updates = {
        id: initialDeployment.id,
        actual_state: DeploymentRequestPlatformState.Removed,
      };

      const call = resolver.Mutation.updateDeploymentRequest(undefined, {
        input: updates,
      });

      await expect(call).rejects.toMatchObject({
        name: ErrorType.BadRequest,
        message: ErrorCode.DeploymentRequestStatusUpdateNotAllowed,
      });
    });
  });
  describe('deploymentRequestsAvailable', () => {
    it('should return the available deployment request', async () => {
      // eslint-disable-next-line no-restricted-syntax
      await db<DeploymentRequestQuota>('DeploymentRequestQuota')
        .update({
          availability: 10,
        })
        .whereIn('region', [
          DeploymentRequestPlatformRegion.ApacAu,
          DeploymentRequestPlatformRegion.ApacSg,
        ]);

      // eslint-disable-next-line no-restricted-syntax
      await db<DeploymentRequestQuota>('DeploymentRequestQuota')
        .update({
          availability: 20,
        })
        .whereIn('region', [
          DeploymentRequestPlatformRegion.EuWest,
          DeploymentRequestPlatformRegion.UsEast,
        ]);
      const availableDeployments =
        await resolver.Query.deploymentRequestsAvailable(undefined, {
          platformIdentifier: PlatformIdentifier.Opencti,
        });

      expect(availableDeployments).toStrictEqual([
        {
          id: expect.any(String),
          region: DeploymentRequestPlatformRegion.ApacAu,
          availableCount: 10,
          capacity: 10,
          platform_identifier: PlatformIdentifier.Opencti,
        },
        {
          id: expect.any(String),
          region: DeploymentRequestPlatformRegion.ApacSg,
          availableCount: 10,
          capacity: 10,
          platform_identifier: PlatformIdentifier.Opencti,
        },
        {
          id: expect.any(String),
          region: DeploymentRequestPlatformRegion.EuWest,
          availableCount: 20,
          capacity: 20,
          platform_identifier: PlatformIdentifier.Opencti,
        },
        {
          id: expect.any(String),
          region: DeploymentRequestPlatformRegion.UsEast,
          availableCount: 20,
          capacity: 20,
          platform_identifier: PlatformIdentifier.Opencti,
        },
      ]);
    });
  });
});

describe('deployment resolver — unit tests', () => {
  describe('deployment requests GraphQL query', () => {
    it('should delegate to DeploymentApp.loadPlatformDeploymentRequests and return result', async () => {
      const expected = {
        edges: [],
      } as unknown as PlatformDeploymentRequestConnection;
      vi.spyOn(
        DeploymentApp,
        'loadPlatformDeploymentRequests'
      ).mockResolvedValue(expected);

      const result = await resolver.Query.deploymentRequests(
        undefined,
        {} as unknown as QueryDeploymentRequestsArgs
      );

      expect(result).toEqual(expected);
    });

    it('should map to NotFound for DeploymentRequestNotFound error', async () => {
      vi.spyOn(
        DeploymentApp,
        'loadPlatformDeploymentRequests'
      ).mockRejectedValue(new Error(ErrorCode.DeploymentRequestNotFound));

      const call = resolver.Query.deploymentRequests(
        undefined,
        {} as unknown as QueryDeploymentRequestsArgs
      );
      await expect(call).rejects.toMatchObject({ name: ErrorType.NotFound });
    });
  });

  describe('deployment requests list GraphQL query', () => {
    it('should delegate to DeploymentRequestDomain.loadDeploymentRequests', async () => {
      const expected = { edges: [] } as unknown as DeploymentRequestConnection;
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequests'
      ).mockResolvedValue(expected);

      const result = await resolver.Query.deploymentRequestsList(
        undefined,
        {} as unknown as QueryDeploymentRequestsListArgs
      );

      expect(result).toEqual(expected);
    });

    it('should map to BadRequest for DeploymentRequestHubStatusNotQueued error', async () => {
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequests'
      ).mockRejectedValue(
        new Error(ErrorCode.DeploymentRequestHubStatusNotQueued)
      );

      const call = resolver.Query.deploymentRequestsList(
        undefined,
        {} as unknown as QueryDeploymentRequestsListArgs
      );
      await expect(call).rejects.toMatchObject({ name: ErrorType.BadRequest });
    });
  });

  describe('trial deployments GraphQL query', () => {
    it('should delegate to DeploymentApp.loadTrialDeployments and return result', async () => {
      const expected = [] as unknown as Awaited<
        ReturnType<typeof DeploymentApp.loadTrialDeployments>
      >;
      vi.spyOn(DeploymentApp, 'loadTrialDeployments').mockResolvedValue(
        expected
      );

      const result = await resolver.Query.trialDeployments(undefined, {
        input: {} as unknown as TrialDeploymentsInput,
      });

      expect(result).toEqual(expected);
    });

    it('should map to NotFound for DeploymentRequestQuotaNotFound error', async () => {
      vi.spyOn(DeploymentApp, 'loadTrialDeployments').mockRejectedValue(
        new Error(ErrorCode.DeploymentRequestQuotaNotFound)
      );

      const call = resolver.Query.trialDeployments(undefined, {
        input: {} as unknown as TrialDeploymentsInput,
      });
      await expect(call).rejects.toMatchObject({ name: ErrorType.NotFound });
    });
  });

  describe('cancel deployment request GraphQL mutation', () => {
    it('should call DeploymentApp.cancelDeploymentRequest with isAdmin=false', async () => {
      const expected = { id: 'req-1' } as unknown as DeploymentRequest;
      vi.spyOn(DeploymentApp, 'cancelDeploymentRequest').mockResolvedValue(
        expected
      );

      const result = await resolver.Mutation.cancelDeploymentRequest(
        undefined,
        {
          deploymentRequestId: 'req-1' as DeploymentRequestId,
          cancellationReason: 'reason',
        }
      );

      expect(DeploymentApp.cancelDeploymentRequest).toHaveBeenCalledWith(
        'req-1',
        false,
        'reason'
      );
      expect(result).toEqual(expected);
    });

    it('should map to ForbiddenAccess for NotAllowedByDeploymentStatus error', async () => {
      vi.spyOn(DeploymentApp, 'cancelDeploymentRequest').mockRejectedValue(
        new Error(ErrorCode.NotAllowedByDeploymentStatus)
      );

      const call = resolver.Mutation.cancelDeploymentRequest(undefined, {
        deploymentRequestId: 'req-1' as DeploymentRequestId,
        cancellationReason: 'reason',
      });

      await expect(call).rejects.toMatchObject({
        name: ErrorType.ForbiddenAccess,
      });
    });
  });

  describe('admin cancel deployment request GraphQL mutation', () => {
    it('should call DeploymentApp.cancelDeploymentRequest with isAdmin=true', async () => {
      const expected = { id: 'req-1' } as DeploymentRequest;
      vi.spyOn(DeploymentApp, 'cancelDeploymentRequest').mockResolvedValue(
        expected
      );

      const result = await resolver.Mutation.adminCancelDeploymentRequest(
        undefined,
        { deploymentRequestId: 'req-1' as DeploymentRequestId }
      );

      expect(DeploymentApp.cancelDeploymentRequest).toHaveBeenCalledWith(
        'req-1',
        true
      );
      expect(result).toEqual(expected);
    });

    it('should map to BadRequest for DeploymentRequestStatusUpdateNotAllowed error', async () => {
      vi.spyOn(DeploymentApp, 'cancelDeploymentRequest').mockRejectedValue(
        new Error(ErrorCode.DeploymentRequestStatusUpdateNotAllowed)
      );

      const call = resolver.Mutation.adminCancelDeploymentRequest(undefined, {
        deploymentRequestId: 'req-1' as DeploymentRequestId,
      });

      await expect(call).rejects.toMatchObject({ name: ErrorType.BadRequest });
    });
  });

  describe('reorder deployment request in queue GraphQL mutation', () => {
    it('should delegate to DeploymentApp.reorderDeploymentRequestInQueue and return result', async () => {
      const expected = { success: true } as unknown as Awaited<
        ReturnType<typeof DeploymentApp.reorderDeploymentRequestInQueue>
      >;
      vi.spyOn(
        DeploymentApp,
        'reorderDeploymentRequestInQueue'
      ).mockResolvedValue(expected);
      const input = {
        id: 'req-1' as DeploymentRequestId,
        direction: ReorderDeploymentRequestInQueueDirection.Up,
      };

      const result = await resolver.Mutation.reorderDeploymentRequestInQueue(
        undefined,
        { input }
      );

      expect(
        DeploymentApp.reorderDeploymentRequestInQueue
      ).toHaveBeenCalledWith(input);
      expect(result).toEqual(expected);
    });
  });

  describe('update deployment quota capacity GraphQL mutation', () => {
    it('should delegate to DeploymentApp.updateDeploymentQuotaCapacity and return result', async () => {
      const expected = { success: true } as unknown as Awaited<
        ReturnType<typeof DeploymentApp.updateDeploymentQuotaCapacity>
      >;
      vi.spyOn(
        DeploymentApp,
        'updateDeploymentQuotaCapacity'
      ).mockResolvedValue(expected);
      const input = {
        region: DeploymentRequestPlatformRegion.UsEast,
        capacity: 10,
        platform_identifier: PlatformIdentifier.Opencti,
      };

      const result = await resolver.Mutation.updateDeploymentQuotaCapacity(
        undefined,
        { input }
      );

      expect(DeploymentApp.updateDeploymentQuotaCapacity).toHaveBeenCalledWith(
        input
      );
      expect(result).toEqual(expected);
    });
  });

  describe('deploymentRequest type resolvers', () => {
    it('children should load child deployment requests by parent id', async () => {
      const children = [{ id: 'child-1' }] as unknown as Awaited<
        ReturnType<
          typeof contextRegistererUserSecondOrga.dataLoaders.deploymentRequest.childrenByParentLoader.load
        >
      >;
      const spy = vi
        .spyOn(
          contextRegistererUserSecondOrga.dataLoaders.deploymentRequest
            .childrenByParentLoader,
          'load'
        )
        .mockResolvedValue(children);

      const result = await resolver.DeploymentRequest!.children!(
        { id: 'bundle-1' } as unknown as DeploymentRequest,
        {},
        contextRegistererUserSecondOrga,
        GRAPHQL_RESOLVE_INFO
      );

      expect(spy).toHaveBeenCalledWith('bundle-1');
      expect(result).toEqual(children);
    });

    it('registered_platform should load the registered platform for the service instance', async () => {
      const registeredPlatform = {
        id: 'si-1',
      } as unknown as RegisteredPlatform;
      const spy = vi
        .spyOn(RegistrationApp, 'loadRegisteredPlatform')
        .mockResolvedValue(registeredPlatform);

      const result = await resolver.DeploymentRequest!.registered_platform!(
        { service_instance_id: 'si-1' } as unknown as DeploymentRequest,
        {},
        contextRegistererUserSecondOrga,
        GRAPHQL_RESOLVE_INFO
      );

      expect(spy).toHaveBeenCalledWith('si-1');
      expect(result).toEqual(registeredPlatform);
    });

    it('service_instance should load the service instance for the deployment request', async () => {
      const serviceInstance = {
        id: 'si-1',
        name: 'Instance',
      } as unknown as Awaited<
        ReturnType<typeof ServiceInstanceDomain.loadServiceInstanceBy>
      >;
      const spy = vi
        .spyOn(ServiceInstanceDomain, 'loadServiceInstanceBy')
        .mockResolvedValue(serviceInstance);

      const result = await resolver.DeploymentRequest!.service_instance!(
        { service_instance_id: 'si-1' } as unknown as DeploymentRequest,
        {},
        contextRegistererUserSecondOrga,
        GRAPHQL_RESOLVE_INFO
      );

      expect(spy).toHaveBeenCalledWith({ id: 'si-1' });
      expect(result).toMatchObject({ id: 'si-1', name: 'Instance' });
    });
  });
});
