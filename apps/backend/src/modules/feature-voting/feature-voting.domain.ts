import { Knex } from 'knex';
import { db, dbRaw } from '../../../knexfile';
import {
  FiligranProduct,
  VotingRoundStatus,
} from '../../__generated__/resolvers-types';
import FeatureVote, {
  FeatureVoteInitializer,
} from '../../model/kanel/public/FeatureVote';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import UseCase, { UseCaseId } from '../../model/kanel/public/UseCase';
import { UserId } from '../../model/kanel/public/User';
import VotableFeature, {
  VotableFeatureId,
  VotableFeatureInitializer,
  VotableFeatureMutator,
} from '../../model/kanel/public/VotableFeature';
import VotableFeatureUseCase from '../../model/kanel/public/VotableFeatureUseCase';
import VotingRound, {
  VotingRoundId,
  VotingRoundInitializer,
  VotingRoundMutator,
} from '../../model/kanel/public/VotingRound';
import { UnknownErrorCode } from '../../utils/error/error.code';

export type VotableFeatureWithVote = VotableFeature & {
  has_my_vote: boolean;
  use_cases?: UseCase[];
};

export type VotableFeatureWithCount = VotableFeature & {
  vote_count: number;
};

/**
 * The order the products are presented in across the product, which is neither
 * alphabetical nor the declaration order of the enum. Sorting on the column
 * itself would put OpenAEV before OpenCTI and scatter a round's features.
 */
const PRODUCT_DISPLAY_ORDER: FiligranProduct[] = [
  FiligranProduct.Opencti,
  FiligranProduct.Openaev,
  FiligranProduct.Xtmone,
  FiligranProduct.Xtmhub,
];

// created_at breaks ties so two features sharing a position keep a stable
// order instead of whichever one Postgres happens to return first.
const PRODUCT_THEN_POSITION_SQL =
  'array_position(?::text[], "VotableFeature"."product"), "VotableFeature"."position" asc, "VotableFeature"."created_at" asc';

const HAS_MY_VOTE_SQL =
  'EXISTS(SELECT 1 FROM "FeatureVote" WHERE "FeatureVote"."votable_feature_id" = "VotableFeature"."id" AND "FeatureVote"."user_id" = ?) as has_my_vote';

const selectVotableFeaturesWithVote = (
  query: Knex.QueryBuilder<VotableFeature>,
  userId?: UserId
): Knex.QueryBuilder<VotableFeature, VotableFeatureWithVote[]> =>
  query
    .orderByRaw(PRODUCT_THEN_POSITION_SQL, [PRODUCT_DISPLAY_ORDER])
    .select<VotableFeatureWithVote[]>(
      'VotableFeature.*',
      userId ? dbRaw(HAS_MY_VOTE_SQL, [userId]) : dbRaw('false as has_my_vote')
    );

const attachUseCases = async (
  features: VotableFeatureWithVote[]
): Promise<VotableFeatureWithVote[]> => {
  const useCases = await featureVotingDomain.loadUseCasesByFeature(
    features.map(({ id }) => id)
  );
  return features.map((feature) => ({
    ...feature,
    use_cases: useCases.get(feature.id) ?? [],
  }));
};

export const featureVotingDomain = {
  loadVotingRounds: (
    serviceInstanceId?: ServiceInstanceId | null
  ): Promise<VotingRound[]> =>
    db<VotingRound>('VotingRound')
      .modify((queryBuilder) => {
        if (serviceInstanceId) {
          queryBuilder.where({ service_instance_id: serviceInstanceId });
        }
      })
      .orderBy('created_at', 'desc')
      .select<VotingRound[]>('*'),

  loadVotingRoundBy: (
    field: VotingRoundMutator
  ): Promise<VotingRound | undefined> =>
    db<VotingRound>('VotingRound').where(field).first(),

  insertVotingRound: async (
    input: VotingRoundInitializer
  ): Promise<VotingRound> => {
    const [round] = await db<VotingRound>('VotingRound')
      .insert(input)
      .returning('*');
    if (!round) {
      throw new Error(UnknownErrorCode.UnknownError);
    }
    return round;
  },

  updateVotingRound: async (
    id: VotingRoundId,
    fields: VotingRoundMutator
  ): Promise<VotingRound | undefined> => {
    const [round] = await db<VotingRound>('VotingRound')
      .where({ id })
      .update(fields)
      .returning('*');
    return round;
  },

  /**
   * Closes the round left open on the same service instance, except the one
   * being opened. Keeps the "single open round per service instance" database
   * index satisfiable when switching rounds, without touching other roadmaps.
   */
  closeOpenRoundsExcept: async (
    id: VotingRoundId,
    serviceInstanceId: ServiceInstanceId
  ): Promise<VotingRound[]> =>
    db<VotingRound>('VotingRound')
      .where({
        status: VotingRoundStatus.Open,
        service_instance_id: serviceInstanceId,
      })
      .whereNot({ id })
      .update({ status: VotingRoundStatus.Closed, closed_at: new Date() })
      .returning('*'),

  deleteVotingRound: async (
    id: VotingRoundId
  ): Promise<VotingRound | undefined> => {
    const [deleted] = await db<VotingRound>('VotingRound')
      .where({ id })
      .delete('*');
    return deleted;
  },

  loadVotableFeatures: async (opts: {
    roundId: VotingRoundId;
    product?: FiligranProduct | null;
    userId?: UserId;
    onlyActive?: boolean;
  }): Promise<VotableFeatureWithVote[]> => {
    const query = db<VotableFeature>('VotableFeature')
      .where('VotableFeature.voting_round_id', opts.roundId)
      .modify((queryBuilder) => {
        if (opts.onlyActive) {
          queryBuilder.andWhere('VotableFeature.active', true);
        }
        if (opts.product) {
          queryBuilder.andWhere('VotableFeature.product', opts.product);
        }
      });
    const features = await selectVotableFeaturesWithVote(query, opts.userId);
    return attachUseCases(features);
  },

  loadVotableFeaturesByRoundIds: async (
    roundIds: VotingRoundId[],
    userId?: UserId
  ): Promise<Map<VotingRoundId, VotableFeatureWithVote[]>> => {
    const grouped = new Map<VotingRoundId, VotableFeatureWithVote[]>();
    if (roundIds.length === 0) {
      return grouped;
    }

    const query = db<VotableFeature>('VotableFeature').whereIn(
      'VotableFeature.voting_round_id',
      roundIds
    );
    const features = await attachUseCases(
      await selectVotableFeaturesWithVote(query, userId)
    );

    for (const feature of features) {
      const current = grouped.get(feature.voting_round_id) ?? [];
      current.push(feature);
      grouped.set(feature.voting_round_id, current);
    }
    return grouped;
  },

  loadVotableFeatureBy: (
    field: VotableFeatureMutator
  ): Promise<VotableFeature | undefined> =>
    db<VotableFeature>('VotableFeature').where(field).first(),

  insertVotableFeature: async (
    input: VotableFeatureInitializer
  ): Promise<VotableFeature> => {
    const [feature] = await db<VotableFeature>('VotableFeature')
      .insert(input)
      .returning('*');
    if (!feature) {
      throw new Error(UnknownErrorCode.UnknownError);
    }
    return feature;
  },

  insertVotableFeatures: async (
    inputs: VotableFeatureInitializer[]
  ): Promise<VotableFeature[]> => {
    if (inputs.length === 0) {
      return [];
    }
    return db<VotableFeature>('VotableFeature').insert(inputs).returning('*');
  },

  updateVotableFeature: async (
    id: VotableFeatureId,
    fields: VotableFeatureMutator
  ): Promise<VotableFeature | undefined> => {
    const [feature] = await db<VotableFeature>('VotableFeature')
      .where({ id })
      .update(fields)
      .returning('*');
    return feature;
  },

  deleteVotableFeature: async (
    id: VotableFeatureId
  ): Promise<VotableFeature | undefined> => {
    const [deleted] = await db<VotableFeature>('VotableFeature')
      .where({ id })
      .delete('*');
    return deleted;
  },

  /**
   * The whole set of use cases of a feature, replaced in one go: the admin form
   * always submits the complete selection, so diffing would only add failure
   * modes for no gain.
   */
  replaceFeatureUseCases: async (
    featureId: VotableFeatureId,
    useCaseIds: UseCaseId[]
  ): Promise<void> => {
    await db<VotableFeatureUseCase>('VotableFeature_UseCase')
      .where({ votable_feature_id: featureId })
      .delete();
    const deduped = Array.from(new Set(useCaseIds));
    if (deduped.length === 0) {
      return;
    }
    await db<VotableFeatureUseCase>('VotableFeature_UseCase').insert(
      deduped.map((useCaseId) => ({
        votable_feature_id: featureId,
        use_case_id: useCaseId,
      }))
    );
  },

  /**
   * Grouped by feature in a single round trip: the public page renders every
   * feature of a round at once, so resolving this per feature would put the
   * page one query away from the number of features it displays.
   */
  /**
   * The query must start from `UseCase`: `db()` stamps every row with the
   * `__typename` of the table it was called on, and that typename is what the
   * Relay global ID is built from. Starting from the join table would expose
   * `VotableFeature_UseCase` ids, which the `UseCaseId` scalar then rejects.
   */
  loadUseCasesByFeature: async (
    featureIds: VotableFeatureId[]
  ): Promise<Map<VotableFeatureId, UseCase[]>> => {
    const grouped = new Map<VotableFeatureId, UseCase[]>();
    if (featureIds.length === 0) {
      return grouped;
    }

    const rows = await db<UseCase>('UseCase')
      .join(
        'VotableFeature_UseCase',
        'VotableFeature_UseCase.use_case_id',
        'UseCase.id'
      )
      .whereIn('VotableFeature_UseCase.votable_feature_id', featureIds)
      .orderBy('UseCase.name', 'asc')
      .select<(UseCase & { votable_feature_id: VotableFeatureId })[]>(
        'UseCase.*',
        'VotableFeature_UseCase.votable_feature_id'
      );

    for (const { votable_feature_id, ...useCase } of rows) {
      const current = grouped.get(votable_feature_id) ?? [];
      current.push(useCase as UseCase);
      grouped.set(votable_feature_id, current);
    }
    return grouped;
  },

  upsertFeatureVote: async (input: FeatureVoteInitializer): Promise<void> => {
    await db<FeatureVote>('FeatureVote')
      .insert(input)
      .onConflict(['user_id', 'voting_round_id', 'product'])
      .merge(['votable_feature_id', 'created_at']);
  },

  countVotesInRound: async (roundId: VotingRoundId): Promise<number> => {
    const row = await db<FeatureVote>('FeatureVote')
      .where({ voting_round_id: roundId })
      .count<{ count: string | number }>({ count: '*' })
      .first();
    return Number(row?.count ?? 0);
  },

  countVotersInRound: async (roundId: VotingRoundId): Promise<number> => {
    const row = await db<FeatureVote>('FeatureVote')
      .where({ voting_round_id: roundId })
      .countDistinct<{ count: string | number }>({ count: 'user_id' })
      .first();
    return Number(row?.count ?? 0);
  },

  countVotesForFeature: async (
    featureId: VotableFeatureId
  ): Promise<number> => {
    const row = await db<FeatureVote>('FeatureVote')
      .where({ votable_feature_id: featureId })
      .count<{ count: string | number }>({ count: '*' })
      .first();
    return Number(row?.count ?? 0);
  },

  /**
   * Counts the features of several rounds at once, so listing rounds stays at a
   * fixed number of queries instead of one per row.
   */
  countFeaturesByRound: async (
    roundIds: VotingRoundId[]
  ): Promise<Map<VotingRoundId, number>> => {
    if (roundIds.length === 0) {
      return new Map();
    }
    const rows = (await db<VotableFeature>('VotableFeature')
      .whereIn('voting_round_id', roundIds)
      .groupBy('voting_round_id')
      .select('voting_round_id')
      .count({ count: '*' })) as unknown as {
      voting_round_id: VotingRoundId;
      count: string | number;
    }[];
    return new Map(rows.map((row) => [row.voting_round_id, Number(row.count)]));
  },

  countActiveFeaturesInRound: async (
    roundId: VotingRoundId
  ): Promise<number> => {
    const row = await db<VotableFeature>('VotableFeature')
      .where({ voting_round_id: roundId, active: true })
      .count<{ count: string | number }>({ count: '*' })
      .first();
    return Number(row?.count ?? 0);
  },

  loadRoundResults: async (
    roundId: VotingRoundId
  ): Promise<VotableFeatureWithCount[]> => {
    const rows = (await db<VotableFeature>('VotableFeature')
      .leftJoin(
        'FeatureVote',
        'FeatureVote.votable_feature_id',
        'VotableFeature.id'
      )
      .where('VotableFeature.voting_round_id', roundId)
      .groupBy('VotableFeature.id')
      .select('VotableFeature.*')
      .count({ vote_count: 'FeatureVote.user_id' })
      .orderByRaw(`vote_count desc, ${PRODUCT_THEN_POSITION_SQL}`, [
        PRODUCT_DISPLAY_ORDER,
      ])) as unknown as (VotableFeature & { vote_count: string | number })[];

    return rows.map((row) => ({
      ...row,
      vote_count: Number(row.vote_count ?? 0),
    }));
  },
};
