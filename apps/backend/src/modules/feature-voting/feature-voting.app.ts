import {
  CreateVotableFeatureInput,
  CreateVotingRoundInput,
  FiligranProduct,
  UpdateVotableFeatureInput,
  UpdateVotingRoundInput,
  VotingRoundStatus,
} from '../../__generated__/resolvers-types';
import {
  withAdvisoryLock,
  withTransaction,
} from '../../context/database.context';
import { requestContext } from '../../context/request.context';
import { DocumentId } from '../../model/kanel/public/Document';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import UseCase, { UseCaseId } from '../../model/kanel/public/UseCase';
import { VotableFeatureId } from '../../model/kanel/public/VotableFeature';
import VotingRound, {
  VotingRoundId,
} from '../../model/kanel/public/VotingRound';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnknownErrorCode,
} from '../../utils/error/error.code';
import { applyUpdate, stripNulls } from '../../utils/typescript';
import {
  DocumentUploadsHelper,
  Upload,
} from '../document/document.uploads.helper';
import { DocumentDomain } from '../document/domain/document.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import {
  featureVotingDomain,
  VotableFeatureWithVote,
} from './feature-voting.domain';

export type VotingRoundWithFeatures = VotingRound & {
  features: VotableFeatureWithVote[];
};

const VOTING_ROUND_STATUS_LOCK_NAMESPACE = 'voting_round_status';

/**
 * The admin list only shows how many features a round holds. Carrying the count
 * instead of the features keeps the whole descriptions, which are markdown
 * documents, out of a response that would never display them.
 */
export type VotingRoundWithFeatureCount = VotingRound & {
  feature_count: number;
};

/**
 * What a resolver is allowed to hand back for a `VotingRound`. Both derived
 * fields are optional here because the field resolvers fill in whichever one
 * the caller did not already compute.
 */
export type VotingRoundModel = VotingRound & {
  __typename?: 'VotingRound';
  features?: VotableFeatureWithVote[];
  feature_count?: number;
};

/**
 * Same idea for a feature: `use_cases` is filled in when the feature comes from
 * a round, and left out when it comes back alone from a mutation.
 */
export type VotableFeatureModel = VotableFeatureWithVote & {
  __typename?: 'VotableFeature';
};

export interface VotingRoundResults {
  round: VotingRoundWithFeatures;
  total_voters: number;
  results: { feature: VotableFeatureWithVote; vote_count: number }[];
}

const requireRound = async (id: VotingRoundId): Promise<VotingRound> => {
  const round = await featureVotingDomain.loadVotingRoundBy({ id });
  if (!round) {
    throw new Error(NotFoundErrorCode.VotingRoundNotFound);
  }
  return round;
};

/**
 * Stores the illustration alongside every other image of the hub, on the very
 * service instance the round belongs to, so removing a roadmap takes its
 * feature illustrations with it.
 */
const storeIllustration = async (
  uploads: Upload[],
  serviceInstanceId: ServiceInstanceId
): Promise<DocumentId | undefined> => {
  if (uploads.length === 0) {
    return undefined;
  }

  const [file] = await DocumentUploadsHelper.processUploads(
    uploads,
    serviceInstanceId
  );
  if (!file) {
    throw new Error(UnknownErrorCode.UnknownError);
  }

  const document = await DocumentDomain.createDocument(
    {
      service_instance_id: serviceInstanceId,
      description: 'Votable feature illustration',
      file_name: file.fileName,
      minio_name: file.minioName,
      active: true,
      mime_type: file.mimeType,
      type: 'image',
      source_type: 'internal',
    },
    []
  );
  return document?.id;
};

/**
 * Attaches the features of a round, flagged with the caller's own vote.
 *
 * `onlyActive` is a property of the audience, never of the round status: the
 * public page must not list a deactivated feature, while the admin screens must
 * always list it — otherwise deactivating a feature of an open round would make
 * it unreachable, and impossible to reactivate.
 */
const withFeatures = async (
  round: VotingRound,
  opts: { onlyActive: boolean; product?: FiligranProduct | null }
): Promise<VotingRoundWithFeatures> => {
  const user = requestContext.get()?.user;
  const features = await featureVotingDomain.loadVotableFeatures({
    roundId: round.id,
    product: opts.product,
    onlyActive: opts.onlyActive,
    userId: user?.id,
  });
  return { ...round, features };
};

/** Rounds returned by the BYPASS-only admin fields, features included. */
const withAllFeatures = (round: VotingRound) =>
  withFeatures(round, { onlyActive: false });

export const featureVotingApp = {
  loadCurrentVotingRound: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<VotingRoundWithFeatures | null> => {
    // The field is reachable without authentication, so a guessed service
    // instance id must not expose the roadmap of a private instance.
    const serviceInstance = await ServiceInstanceDomain.loadServiceInstanceBy({
      id: serviceInstanceId,
    });
    if (!serviceInstance?.public) {
      return null;
    }

    const round = await featureVotingDomain.loadVotingRoundBy({
      service_instance_id: serviceInstanceId,
      status: VotingRoundStatus.Open,
    });
    return round ? withFeatures(round, { onlyActive: true }) : null;
  },

  voteForFeature: async (
    featureId: VotableFeatureId
  ): Promise<VotableFeatureWithVote[]> => {
    const user = requestContext.requireUser();

    const feature = await featureVotingDomain.loadVotableFeatureBy({
      id: featureId,
    });
    if (!feature || !feature.active) {
      throw new Error(NotFoundErrorCode.VotableFeatureNotFound);
    }

    const round = await requireRound(feature.voting_round_id);
    if (round.status !== VotingRoundStatus.Open) {
      throw new Error(ForbiddenErrorCode.VotingRoundNotOpen);
    }

    await featureVotingDomain.upsertFeatureVote({
      user_id: user.id,
      voting_round_id: round.id,
      votable_feature_id: feature.id,
      product: feature.product,
      created_at: new Date(),
    });

    return featureVotingDomain.loadVotableFeatures({
      roundId: round.id,
      product: feature.product,
      onlyActive: true,
      userId: user.id,
    });
  },

  loadVotingRounds: async (
    serviceInstanceId?: ServiceInstanceId | null
  ): Promise<VotingRoundWithFeatureCount[]> => {
    const rounds =
      await featureVotingDomain.loadVotingRounds(serviceInstanceId);
    const counts = await featureVotingDomain.countFeaturesByRound(
      rounds.map((round) => round.id)
    );
    return rounds.map((round) => ({
      ...round,
      feature_count: counts.get(round.id) ?? 0,
    }));
  },

  loadFeatureUseCases: async (id: VotableFeatureId): Promise<UseCase[]> => {
    const useCases = await featureVotingDomain.loadUseCasesByFeature([id]);
    return useCases.get(id) ?? [];
  },

  loadVotingRound: async (
    id: VotingRoundId
  ): Promise<VotingRoundWithFeatures | null> => {
    const round = await featureVotingDomain.loadVotingRoundBy({ id });
    return round ? withAllFeatures(round) : null;
  },

  createVotingRound: async (
    input: CreateVotingRoundInput
  ): Promise<VotingRoundWithFeatures> => {
    const user = requestContext.requireUser();
    const { copy_features_from_round_id, ...roundInput } = input;

    // The round and its copied features are one unit: a failure midway would
    // otherwise leave an empty round behind, with the error surfaced to the
    // admin as if nothing had been created.
    const round = await withTransaction(async () => {
      const serviceInstance = await ServiceInstanceDomain.loadServiceInstanceBy(
        { id: input.service_instance_id }
      );
      if (!serviceInstance) {
        throw new Error(NotFoundErrorCode.ServiceInstanceNotFound);
      }

      const createdRound = await featureVotingDomain.insertVotingRound({
        ...stripNulls(roundInput),
        status: VotingRoundStatus.Draft,
        creator_id: user.id,
        created_at: new Date(),
      });

      if (copy_features_from_round_id) {
        const sourceRound = await requireRound(copy_features_from_round_id);
        // Copying across roadmaps would mix unrelated feedback, and the picker
        // only ever lists rounds of the selected service instance.
        if (
          sourceRound.service_instance_id !== createdRound.service_instance_id
        ) {
          throw new Error(ForbiddenErrorCode.CopyFeaturesFromAnotherRoadmap);
        }

        const sourceFeatures = await featureVotingDomain.loadVotableFeatures({
          roundId: sourceRound.id,
        });
        const copies = await featureVotingDomain.insertVotableFeatures(
          sourceFeatures.map((feature) => ({
            voting_round_id: createdRound.id,
            title: feature.title,
            short_description: feature.short_description,
            description: feature.description,
            product: feature.product,
            illustration_document_id: feature.illustration_document_id,
            position: feature.position,
            active: feature.active,
            created_at: new Date(),
          }))
        );
        // The copies are returned in insertion order, so they line up with the
        // features they were built from and inherit their use cases.
        await Promise.all(
          copies.map((copy, index) =>
            featureVotingDomain.replaceFeatureUseCases(
              copy.id,
              (sourceFeatures[index]?.use_cases ?? []).map(({ id }) => id)
            )
          )
        );
      }

      return createdRound;
    });

    return withAllFeatures(round);
  },

  updateVotingRound: async (
    id: VotingRoundId,
    input: UpdateVotingRoundInput
  ): Promise<VotingRoundWithFeatures> => {
    await requireRound(id);
    const updated = await featureVotingDomain.updateVotingRound(id, {
      ...applyUpdate(input, ['description']),
      updated_at: new Date(),
    });
    if (!updated) {
      throw new Error(NotFoundErrorCode.VotingRoundNotFound);
    }
    return withAllFeatures(updated);
  },

  /**
   * Applies a status transition. Opening a round closes whichever round was
   * open before, so previous results stay untouched and readable.
   * Returns every round whose status changed.
   *
   * The advisory lock serialises concurrent transitions on a roadmap: without
   * it, two admins opening a round at the same time could leave the roadmap
   * with no open round at all, or trip the single-open-round unique index.
   */
  setVotingRoundStatus: async (
    id: VotingRoundId,
    status: VotingRoundStatus
  ): Promise<VotingRoundWithFeatures[]> => {
    const round = await requireRound(id);
    if (round.status === status) {
      return [await withAllFeatures(round)];
    }

    // Opening a round publishes it on the public page, so a round with nothing
    // to vote on must be refused here and not only by the disabled button:
    // the mutation is reachable on its own.
    if (status === VotingRoundStatus.Open) {
      const activeFeatures =
        await featureVotingDomain.countActiveFeaturesInRound(id);
      if (activeFeatures === 0) {
        throw new Error(ForbiddenErrorCode.OpenVotingRoundWithoutActiveFeature);
      }
    }

    const changedRounds = await withAdvisoryLock(
      VOTING_ROUND_STATUS_LOCK_NAMESPACE,
      round.service_instance_id,
      async () => {
        const closedRounds =
          status === VotingRoundStatus.Open
            ? await featureVotingDomain.closeOpenRoundsExcept(
                id,
                round.service_instance_id
              )
            : [];

        const updated = await featureVotingDomain.updateVotingRound(id, {
          status,
          updated_at: new Date(),
          // Reopening a round must clear the closure date, otherwise an open
          // round would keep advertising when it ended.
          ...(status === VotingRoundStatus.Open && {
            opened_at: new Date(),
            closed_at: null,
          }),
          ...(status === VotingRoundStatus.Closed && { closed_at: new Date() }),
        });
        if (!updated) {
          throw new Error(NotFoundErrorCode.VotingRoundNotFound);
        }

        return [updated, ...closedRounds];
      }
    );

    return Promise.all(
      changedRounds.map((changed) => withAllFeatures(changed))
    );
  },

  deleteVotingRound: async (
    id: VotingRoundId
  ): Promise<VotingRoundWithFeatures> =>
    // The vote count and the delete must see the same snapshot, otherwise a
    // vote cast in between would be silently cascaded away.
    withTransaction(async () => {
      await requireRound(id);

      const voteCount = await featureVotingDomain.countVotesInRound(id);
      if (voteCount > 0) {
        throw new Error(ForbiddenErrorCode.DeleteVotingRoundBlockedByVotes);
      }

      const deleted = await featureVotingDomain.deleteVotingRound(id);
      if (!deleted) {
        throw new Error(NotFoundErrorCode.VotingRoundNotFound);
      }
      return { ...deleted, features: [] };
    }),

  createVotableFeature: async (
    input: CreateVotableFeatureInput,
    uploads: Upload[] = []
  ): Promise<VotableFeatureWithVote> => {
    const round = await requireRound(input.voting_round_id);
    if (round.status === VotingRoundStatus.Closed) {
      throw new Error(ForbiddenErrorCode.VotingRoundClosed);
    }

    // Uploading writes to object storage, which no database transaction can
    // roll back, so it happens before the transaction rather than inside it.
    const illustrationDocumentId = await storeIllustration(
      uploads,
      round.service_instance_id
    );

    const { use_case_ids, ...featureInput } = input;
    const created = await withTransaction(async () => {
      const feature = await featureVotingDomain.insertVotableFeature({
        ...stripNulls(featureInput),
        illustration_document_id: illustrationDocumentId,
        created_at: new Date(),
      });
      await featureVotingDomain.replaceFeatureUseCases(
        feature.id,
        (use_case_ids ?? []) as UseCaseId[]
      );
      return feature;
    });
    return { ...created, has_my_vote: false };
  },

  updateVotableFeature: async (
    id: VotableFeatureId,
    input: UpdateVotableFeatureInput,
    uploads: Upload[] = []
  ): Promise<VotableFeatureWithVote> => {
    const existing = await featureVotingDomain.loadVotableFeatureBy({ id });
    if (!existing) {
      throw new Error(NotFoundErrorCode.VotableFeatureNotFound);
    }
    const existingRound = await requireRound(existing.voting_round_id);
    const illustrationDocumentId = await storeIllustration(
      uploads,
      existingRound.service_instance_id
    );

    const { use_case_ids, ...featureInput } = input;
    const updated = await withTransaction(async () => {
      const feature = await featureVotingDomain.loadVotableFeatureBy({ id });
      if (!feature) {
        throw new Error(NotFoundErrorCode.VotableFeatureNotFound);
      }

      const round = await requireRound(feature.voting_round_id);
      // Published results must not change meaning after the fact.
      if (round.status === VotingRoundStatus.Closed) {
        throw new Error(ForbiddenErrorCode.VotingRoundClosed);
      }

      // One vote is allowed per user, per round and per product. Moving a
      // feature to another product after it collected votes would let the same
      // user weigh twice on the target product's ranking.
      const isChangingProduct =
        !!input.product && input.product !== feature.product;
      if (isChangingProduct) {
        const voteCount = await featureVotingDomain.countVotesForFeature(id);
        if (voteCount > 0) {
          throw new Error(ForbiddenErrorCode.VotableFeatureProductLocked);
        }
      }

      const updatedFeature = await featureVotingDomain.updateVotableFeature(
        id,
        {
          ...applyUpdate(featureInput, ['illustration_document_id']),
          ...(illustrationDocumentId
            ? { illustration_document_id: illustrationDocumentId }
            : {}),
          updated_at: new Date(),
        }
      );
      if (!updatedFeature) {
        throw new Error(NotFoundErrorCode.VotableFeatureNotFound);
      }
      // Omitting the field leaves the selection alone; sending an empty list
      // clears it, like every other clearable field of this input.
      if (use_case_ids) {
        await featureVotingDomain.replaceFeatureUseCases(
          id,
          use_case_ids as UseCaseId[]
        );
      }
      return updatedFeature;
    });

    const roundFeatures = await featureVotingDomain.loadVotableFeatures({
      roundId: updated.voting_round_id,
      userId: requestContext.get()?.user?.id,
    });
    return (
      roundFeatures.find((roundFeature) => roundFeature.id === updated.id) ?? {
        ...updated,
        has_my_vote: false,
      }
    );
  },

  /**
   * A feature that already collected votes is never removed, otherwise the
   * round results would silently change. Deactivate it instead.
   */
  deleteVotableFeature: async (
    id: VotableFeatureId
  ): Promise<VotableFeatureWithVote> =>
    // The vote check and the delete must see the same snapshot, otherwise a
    // vote cast in between would be silently cascaded away.
    withTransaction(async () => {
      const feature = await featureVotingDomain.loadVotableFeatureBy({ id });
      if (!feature) {
        throw new Error(NotFoundErrorCode.VotableFeatureNotFound);
      }

      const voteCount = await featureVotingDomain.countVotesForFeature(id);
      if (voteCount > 0) {
        throw new Error(ForbiddenErrorCode.DeleteVotableFeatureBlockedByVotes);
      }

      const deleted = await featureVotingDomain.deleteVotableFeature(id);
      if (!deleted) {
        throw new Error(NotFoundErrorCode.VotableFeatureNotFound);
      }
      return { ...deleted, has_my_vote: false };
    }),

  loadVotingRoundResults: async (
    id: VotingRoundId
  ): Promise<VotingRoundResults> => {
    const round = await requireRound(id);
    const [hydratedRound, rows, totalVoters] = await Promise.all([
      withAllFeatures(round),
      featureVotingDomain.loadRoundResults(id),
      featureVotingDomain.countVotersInRound(id),
    ]);

    return {
      round: hydratedRound,
      total_voters: totalVoters,
      results: rows.map(({ vote_count, ...feature }) => ({
        feature: { ...feature, has_my_vote: false },
        vote_count,
      })),
    };
  },
};
