import { Knex } from 'knex';
import { db, paginate } from '../../../knexfile';
import {
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  DeploymentRequestPlatformState,
  OrderingMode,
  PlatformIdentifier,
  QueryDeploymentRequestsListArgs,
  ServiceGroupName,
} from '../../__generated__/resolvers-types';
import { withTransaction } from '../../context/database.context';
import DeploymentRequest, {
  DeploymentRequestId,
  DeploymentRequestInitializer,
  DeploymentRequestMutator,
} from '../../model/kanel/public/DeploymentRequest';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { auth0Client } from '../../thirdparty/auth0/client';
import { logApp } from '../../utils/app-logger.util';
import { getErrorNumberProperty } from '../../utils/error/error-guard.util';
import { ErrorCode, UnknownErrorCode } from '../../utils/error/error.code';
import { prefixObjectKeys } from '../../utils/utils';
import { ServiceGroupDomain } from './group/service-group.domain';
import { QuotaKey } from './quota/deployment.quota.domain';

const scopeToPlatformIdentifier =
  (key: QuotaKey) => (builder: Knex.QueryBuilder<DeploymentRequest>) => {
    if (key.platformIdentifier === null) {
      builder.whereNull('platform_identifier');
    } else {
      builder.andWhere('platform_identifier', '=', key.platformIdentifier);
    }
  };

const scopeToQuotaKey =
  (key: QuotaKey) => (builder: Knex.QueryBuilder<DeploymentRequest>) => {
    builder
      .where('type', '=', key.type)
      .andWhere('region', '=', key.region)
      .whereNull('parent_id')
      .modify(scopeToPlatformIdentifier(key));
  };

const scopeToQueueOf =
  (request: DeploymentRequest) =>
  (builder: Knex.QueryBuilder<DeploymentRequest>) => {
    builder.modify(
      scopeToQuotaKey({
        type: request.type,
        platformIdentifier: request.platform_identifier,
        region: request.region,
      })
    );
  };

export const DeploymentRequestDomain = {
  insertDeploymentRequest: async (
    deploymentRequest: DeploymentRequestInitializer
  ): Promise<DeploymentRequest> => {
    const [createdDeploymentRequest] = await db<DeploymentRequest>(
      'DeploymentRequest'
    )
      .insert(deploymentRequest)
      .returning('*');
    if (!createdDeploymentRequest) {
      throw new Error(UnknownErrorCode.CreateDeploymentRequestError);
    }
    return createdDeploymentRequest;
  },

  loadDeploymentRequestBy: async (
    conditions: DeploymentRequestMutator
  ): Promise<DeploymentRequest | undefined> => {
    return db<DeploymentRequest>('DeploymentRequest')
      .where(conditions)
      .select('*')
      .first();
  },

  loadDeploymentRequestsBy: async (
    conditions: DeploymentRequestMutator
  ): Promise<DeploymentRequest[]> => {
    return db<DeploymentRequest[]>('DeploymentRequest')
      .where(conditions)
      .select('*');
  },

  loadChildrenByParentIds: async (
    parentIds: readonly DeploymentRequestId[]
  ): Promise<FullyQualifiedDeploymentRequest[]> => {
    if (parentIds.length === 0) {
      return [];
    }

    return getDeploymentRequestWithUserDataQuery()
      .whereIn('DeploymentRequest.parent_id', parentIds)
      .orderBy('DeploymentRequest.platform_identifier', 'asc');
  },

  loadDeploymentRequestWithChildren: async (
    deploymentRequest: DeploymentRequest,
    childrenHubStatus?: DeploymentRequestHubStatus
  ): Promise<DeploymentRequest[]> => {
    if (deploymentRequest.type !== DeploymentRequestDeploymentType.Bundle) {
      return [deploymentRequest];
    }

    const children = await DeploymentRequestDomain.loadDeploymentRequestsBy({
      parent_id: deploymentRequest.id,
      ...(childrenHubStatus ? { hub_status: childrenHubStatus } : {}),
    });

    // Children are sorted by platform_identifier to keep a stable quota lock
    // acquisition order: two concurrent family cancellations would otherwise
    // be able to deadlock on DeploymentRequestQuota rows.
    return [
      deploymentRequest,
      ...children.sort((a, b) =>
        (a.platform_identifier ?? '').localeCompare(b.platform_identifier ?? '')
      ),
    ];
  },

  loadTrialsForOrganization: async (
    organizationId: OrganizationId,
    identifiers?: PlatformIdentifier[]
  ): Promise<DeploymentRequest[]> => {
    return db<DeploymentRequest>('DeploymentRequest')
      .where('organization_requester_id', '=', organizationId)
      .modify((qb) => {
        if (identifiers?.length) {
          qb.whereIn('platform_identifier', identifiers);
        }
      })
      .where('type', '=', DeploymentRequestDeploymentType.Trial)
      .where('counts_in_orga_quota', '=', true)
      .select('*');
  },

  loadBundleTrialForOrganization: async (
    organizationId: OrganizationId
  ): Promise<DeploymentRequest | undefined> => {
    return db<DeploymentRequest>('DeploymentRequest')
      .where('organization_requester_id', '=', organizationId)
      .where('type', '=', DeploymentRequestDeploymentType.Bundle)
      .where('counts_in_orga_quota', '=', true)
      .orderBy('request_date', 'desc')
      .first();
  },

  loadOngoingStandaloneTrialsForOrganization: async (
    organizationId: OrganizationId
  ): Promise<DeploymentRequest[]> => {
    return db<DeploymentRequest[]>('DeploymentRequest')
      .where('organization_requester_id', '=', organizationId)
      .where('type', '=', DeploymentRequestDeploymentType.Trial)
      .whereNull('parent_id')
      .whereIn('hub_status', [
        DeploymentRequestHubStatus.Active,
        DeploymentRequestHubStatus.Pending,
        DeploymentRequestHubStatus.Provisioning,
        DeploymentRequestHubStatus.Queued,
      ])
      .select('*');
  },

  getMaxOrderingInQueue: async (
    key: QuotaKey,
    hubStatus: DeploymentRequestHubStatus
  ): Promise<number | null> => {
    const result = await db<DeploymentRequest>('DeploymentRequest')
      .max('ordering as max')
      .where('hub_status', '=', hubStatus)
      .modify(scopeToQuotaKey(key))
      .first();
    return result?.max ? parseInt(result.max as string, 10) : null;
  },

  loadDeploymentRequests: async <T>(
    opts: QueryDeploymentRequestsListArgs,
    options?: { onlyOutOfSync?: boolean }
  ) => {
    const query = getDeploymentRequestWithUserDataQuery();

    // If onlyOutOfSync, only return deployments with sync offset (target_state different from actual_state)
    if (options?.onlyOutOfSync) {
      query.whereRaw(
        '("DeploymentRequest"."target_state" IS DISTINCT FROM "DeploymentRequest"."actual_state")'
      );
    }

    if (opts.searchTerm) {
      query.where((qb) => {
        qb.whereILike(`User.email`, `%${opts.searchTerm}%`).orWhereILike(
          `Organization.name`,
          `%${opts.searchTerm}%`
        );
      });
    }

    return paginate<FullyQualifiedDeploymentRequest, T>(
      'DeploymentRequest',
      opts,
      undefined,
      query
    );
  },

  loadFullDeploymentRequest: async (
    conditions: DeploymentRequestMutator,
    options?: {
      orderBy?: {
        column: keyof DeploymentRequest;
        order: OrderingMode;
      };
    }
  ): Promise<FullyQualifiedDeploymentRequest | undefined> => {
    const query = getDeploymentRequestWithUserDataQuery().where(
      prefixObjectKeys(conditions, 'DeploymentRequest.')
    );

    if (options?.orderBy) {
      query.orderBy(
        `DeploymentRequest.${options.orderBy.column}`,
        options.orderBy.order
      );
    }

    return query.first();
  },

  loadLatestDeploymentRequestForUser: async (
    userId: string,
    conditions: DeploymentRequestMutator
  ): Promise<FullyQualifiedDeploymentRequest | undefined> => {
    return getDeploymentRequestWithUserDataQuery()
      .leftJoin(
        'User_Organization',
        'User_Organization.organization_id',
        '=',
        'Organization.id'
      )
      .where(prefixObjectKeys(conditions, 'DeploymentRequest.'))
      .where('User_Organization.user_id', '=', userId)
      .orderBy('DeploymentRequest.request_date', 'desc')
      .first();
  },

  loadTrialDeploymentRequestByPlatformToken: async (
    platformToken: string
  ): Promise<FullyQualifiedDeploymentRequest> => {
    return getDeploymentRequestWithUserDataQuery()
      .where(
        'DeploymentRequest.type',
        '=',
        DeploymentRequestDeploymentType.Trial
      )
      .where('DeploymentRequest.platform_token', '=', platformToken)
      .first();
  },

  loadTrialsToExpire: async (): Promise<DeploymentRequest[]> => {
    return db<DeploymentRequest[]>('DeploymentRequest')
      .where('end_date', '<', new Date())
      .where('hub_status', '=', DeploymentRequestHubStatus.Active)
      .where((qb) => {
        qb.where('type', '=', DeploymentRequestDeploymentType.Bundle).orWhere(
          (subQb) => {
            subQb
              .where('type', '=', DeploymentRequestDeploymentType.Trial)
              .whereNull('parent_id');
          }
        );
      })
      .select('*');
  },

  deleteDeploymentRequestBy: async (
    conditions: DeploymentRequestMutator
  ): Promise<DeploymentRequest> => {
    return db<DeploymentRequest>('DeploymentRequest')
      .where(conditions)
      .delete();
  },

  countDeploymentRequestsBy: async (
    conditions: DeploymentRequestMutator
  ): Promise<number> => {
    const result = await db<DeploymentRequest>('DeploymentRequest')
      .where(conditions)
      .count<[{ count: string }]>('id as count')
      .first();
    return Number(result?.count ?? 0);
  },

  updateDeploymentRequestById: async (
    id: DeploymentRequestId,
    data: DeploymentRequestMutator
  ): Promise<DeploymentRequest | undefined> => {
    const [deploymentRequest] = await db<DeploymentRequest>('DeploymentRequest')
      .where('id', '=', id)
      .update(data)
      .returning('*');
    return deploymentRequest;
  },

  loadFirstQueuedRequest: async (
    key: QuotaKey
  ): Promise<DeploymentRequest | undefined> => {
    return db<DeploymentRequest>('DeploymentRequest')
      .select('*')
      .where('hub_status', '=', DeploymentRequestHubStatus.Queued)
      .modify(scopeToQuotaKey(key))
      .orderBy('ordering', 'asc')
      .first();
  },

  setRequestAsPending: async (
    request: DeploymentRequest
  ): Promise<DeploymentRequest | undefined> => {
    const maxPendingOrdering =
      await DeploymentRequestDomain.getMaxOrderingInQueue(
        {
          type: request.type,
          platformIdentifier: request.platform_identifier,
          region: request.region,
        },
        DeploymentRequestHubStatus.Pending
      );

    const [updatedRequest] = await db<DeploymentRequest>('DeploymentRequest')
      .update({
        hub_status: DeploymentRequestHubStatus.Pending,
        target_state: DeploymentRequestPlatformState.Active,
        ordering: (maxPendingOrdering ?? 0) + 1,
      })
      .where('id', '=', request.id)
      .returning('*');

    if (request.type === DeploymentRequestDeploymentType.Bundle) {
      await db<DeploymentRequest>('DeploymentRequest')
        .update({
          hub_status: DeploymentRequestHubStatus.Pending,
          target_state: DeploymentRequestPlatformState.Active,
        })
        .where('parent_id', '=', request.id)
        .andWhere('hub_status', '=', DeploymentRequestHubStatus.Queued);
    }

    return updatedRequest ?? undefined;
  },

  loadLastPendingRequest: async (
    key: QuotaKey
  ): Promise<DeploymentRequest | undefined> => {
    return db<DeploymentRequest>('DeploymentRequest')
      .select('*')
      .where('hub_status', '=', DeploymentRequestHubStatus.Pending)
      .modify(scopeToQuotaKey(key))
      .orderBy('ordering', 'desc')
      .first();
  },

  setRequestAsQueued: async (
    request: DeploymentRequest
  ): Promise<DeploymentRequest | undefined> => {
    await db<DeploymentRequest>('DeploymentRequest')
      .increment('ordering', 1)
      .where('hub_status', '=', DeploymentRequestHubStatus.Queued)
      .modify(scopeToQueueOf(request));
    const [updatedRequest] = await db<DeploymentRequest>('DeploymentRequest')
      .update({
        hub_status: DeploymentRequestHubStatus.Queued,
        target_state: DeploymentRequestPlatformState.Removed,
        ordering: 1,
      })
      .where({ id: request.id })
      .returning('*');

    if (request.type === DeploymentRequestDeploymentType.Bundle) {
      await db<DeploymentRequest>('DeploymentRequest')
        .update({
          hub_status: DeploymentRequestHubStatus.Queued,
          target_state: DeploymentRequestPlatformState.Removed,
        })
        .where('parent_id', '=', request.id)
        .andWhere('hub_status', '=', DeploymentRequestHubStatus.Pending);
    }

    return updatedRequest;
  },

  initialiseServiceGroup: async (
    id: DeploymentRequestId,
    platformIdentifier: PlatformIdentifier | null
  ) => {
    if (!platformIdentifier) {
      throw new Error(UnknownErrorCode.UnknownError);
    }

    const fullDeploymentRequest =
      await DeploymentRequestDomain.loadFullDeploymentRequest({ id });

    if (!fullDeploymentRequest) {
      throw new Error(ErrorCode.DeploymentRequestNotFound);
    }

    const {
      requester_email,
      platform_id,
      user_requester_id,
      service_instance_id,
    } = fullDeploymentRequest;
    if (!platform_id) {
      throw new Error(ErrorCode.InvalidPlatformId);
    }

    const serviceGroup = await ServiceGroupDomain.loadServiceGroups({
      service_instance_id: service_instance_id,
    });
    if (serviceGroup.length === 0) {
      await ServiceGroupDomain.initGroupWithAdmin(
        user_requester_id,
        service_instance_id,
        platformIdentifier
      );
      await auth0Client.updateUserRBACInstance(requester_email, {
        [platform_id]: {
          groups: [ServiceGroupName.Admin],
        },
      });
    }
  },

  reorderDeploymentRequestUp: async (deploymentRequest: DeploymentRequest) => {
    const previousDeploymentRequest = await db<DeploymentRequest>(
      'DeploymentRequest'
    )
      .where('ordering', '<', deploymentRequest.ordering)
      .andWhere('hub_status', '=', DeploymentRequestHubStatus.Queued)
      .modify(scopeToQueueOf(deploymentRequest))
      .select('*')
      .orderBy('ordering', 'desc')
      .first();

    const isDeploymentRequestFirst = !previousDeploymentRequest;
    if (isDeploymentRequestFirst) {
      return;
    }

    await withTransaction(async () => {
      await db<DeploymentRequest>('DeploymentRequest')
        .update({ ordering: deploymentRequest.ordering })
        .where({ id: previousDeploymentRequest.id });

      await db<DeploymentRequest>('DeploymentRequest')
        .update({ ordering: previousDeploymentRequest.ordering })
        .where({ id: deploymentRequest.id });
    });
  },

  reorderDeploymentRequestToTop: async (
    deploymentRequest: DeploymentRequest
  ) => {
    const { id } = deploymentRequest;
    const topDeploymentRequest = await db<DeploymentRequest>(
      'DeploymentRequest'
    )
      .where('hub_status', '=', DeploymentRequestHubStatus.Queued)
      .modify(scopeToQueueOf(deploymentRequest))
      .orderBy('ordering', 'asc')
      .first();
    if (!topDeploymentRequest) {
      throw new Error(ErrorCode.DeploymentRequestNotFound);
    }

    const isDeploymentRequestAlreadyOnTop = topDeploymentRequest.id === id;
    if (isDeploymentRequestAlreadyOnTop) {
      return;
    }

    await withTransaction(async () => {
      await db<DeploymentRequest>('DeploymentRequest')
        .increment('ordering', 1)
        .where('hub_status', '=', DeploymentRequestHubStatus.Queued)
        .modify(scopeToQueueOf(deploymentRequest));
      await DeploymentRequestDomain.updateDeploymentRequestById(id, {
        ordering: 1,
      });
    });
  },

  deleteDeploymentRequestAudience: async (
    deploymentRequest: DeploymentRequest
  ): Promise<void> => {
    try {
      if (deploymentRequest.platform_id) {
        await auth0Client.deleteAudienceAPI(
          deploymentRequest.organization_requester_id,
          deploymentRequest.platform_id
        );
      } else {
        logApp.error('Unable to delete audience', {
          error: 'missing platform_id',
          deploymentRequestId: deploymentRequest.id,
        });
      }
    } catch (error) {
      logDeleteAudienceError(error, deploymentRequest);
    }
  },
};

export const isBundleChild = <T extends Pick<DeploymentRequest, 'parent_id'>>(
  deploymentRequest: T
): deploymentRequest is T & { parent_id: DeploymentRequestId } =>
  deploymentRequest.parent_id !== null;

/**
 * Bundles never create an Auth0 audience for themselves nor for their XtmOne,
 * OpenAEV or Opencti children. Standalone OpenAEV and Opencti trials no
 * longer create one either, but older deployment requests may still have one
 * left over. This tells callers whether it is worth attempting to delete an
 * audience for a given deployment request.
 */
export const shouldDeleteDeploymentRequestAudience = (
  deploymentRequest: Pick<
    DeploymentRequest,
    'type' | 'platform_identifier' | 'parent_id'
  >
): boolean => {
  if (deploymentRequest.type === DeploymentRequestDeploymentType.Bundle) {
    return false;
  }

  if (deploymentRequest.platform_identifier === PlatformIdentifier.Xtmone) {
    return false;
  }

  if (
    deploymentRequest.platform_identifier === PlatformIdentifier.Openaev &&
    isBundleChild(deploymentRequest)
  ) {
    return false;
  }

  return true;
};

export type FullyQualifiedDeploymentRequest = DeploymentRequest & {
  organization_name: string;
  organization_domains: string[];
  requester_email: string;
  requester_first_name: string;
  requester_last_name: string;
};

const logDeleteAudienceError = (
  error: unknown,
  deploymentRequest: Pick<DeploymentRequest, 'id' | 'platform_identifier'>
) => {
  const isExpectedOpenaevAudienceMiss =
    getErrorNumberProperty(error, 'statusCode') === 404 &&
    deploymentRequest.platform_identifier === PlatformIdentifier.Openaev;

  if (isExpectedOpenaevAudienceMiss) {
    logApp.warn('No Auth0 audience to delete for OpenAEV trial', {
      deploymentRequestId: deploymentRequest.id,
    });
    return;
  }

  logApp.error('Unable to delete audience', {
    error,
    deploymentRequestId: deploymentRequest.id,
  });
};

const getDeploymentRequestWithUserDataQuery =
  (): Knex.QueryBuilder<FullyQualifiedDeploymentRequest> => {
    return db<DeploymentRequest>('DeploymentRequest')
      .leftJoin(
        'Organization',
        'DeploymentRequest.organization_requester_id',
        '=',
        'Organization.id'
      )
      .leftJoin('User', 'DeploymentRequest.user_requester_id', '=', 'User.id')
      .leftJoin(
        'User as CancellationUser',
        'DeploymentRequest.cancellation_user_id',
        '=',
        'CancellationUser.id'
      )
      .leftJoin(
        'PlatformConfiguration',
        'DeploymentRequest.service_instance_id',
        '=',
        'PlatformConfiguration.service_instance_id'
      )
      .select([
        'DeploymentRequest.*',
        'Organization.name as organization_name',
        'Organization.domains as organization_domains',
        'User.email as requester_email',
        'User.first_name as requester_first_name',
        'User.last_name as requester_last_name',
        'CancellationUser.email as cancellation_user_email',
        'PlatformConfiguration.platform_url as platform_url',
      ]);
  };
