import { Resolvers } from '../../__generated__/resolvers-types';
import { VotableFeatureId } from '../../model/kanel/public/VotableFeature';
import { VotingRoundId } from '../../model/kanel/public/VotingRound';
import { UnknownErrorCode } from '../../utils/error/error.code';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { createRelayIdScalar } from '../../utils/scalar.util';
import { featureVotingApp } from './feature-voting.app';

const resolvers: Resolvers = {
  VotableFeatureId: createRelayIdScalar<VotableFeatureId>('VotableFeature'),
  VotingRoundId: createRelayIdScalar<VotingRoundId>('VotingRound'),

  // Rounds come either with their features already resolved and filtered for
  // the audience, or as a bare row from the admin listing. Both fields fall
  // back to a DataLoader only when the value is missing, batched per request so
  // listing many rounds never pays for one feature query per round.
  VotingRound: {
    features: (round, _args, context) =>
      round.features ??
      context.dataLoaders.featureVoting.roundFeaturesByRoundIdLoader.load(
        round.id
      ),
    feature_count: (round) =>
      round.feature_count ?? round.features?.length ?? 0,
  },

  // Features arrive from a round with their use cases already batched in. The
  // fallback only covers the features returned on their own, by a mutation,
  // but still goes through a request-scoped DataLoader to keep the field
  // batchable regardless of where the feature came from.
  VotableFeature: {
    use_cases: (feature, _args, context) =>
      feature.use_cases ??
      context.dataLoaders.featureVoting.useCasesByFeatureIdLoader.load(
        feature.id
      ),
    illustration_document: async (feature, _args, context) => {
      if (!feature.illustration_document_id) {
        return null;
      }
      const document =
        await context.dataLoaders.document.documentByIdLoader.load(
          feature.illustration_document_id
        );
      return document ?? null;
    },
  },

  Query: {
    currentVotingRound: (_, { service_instance_id }) =>
      featureVotingApp.loadCurrentVotingRound(service_instance_id),
    votingRounds: (_, { service_instance_id }) =>
      featureVotingApp.loadVotingRounds(service_instance_id),
    votingRound: (_, { id }) => featureVotingApp.loadVotingRound(id),
    votingRoundResults: (_, { id }) =>
      featureVotingApp.loadVotingRoundResults(id),
  },

  Mutation: {
    voteForFeature: async (_, { feature_id }) => {
      try {
        return await featureVotingApp.voteForFeature(feature_id);
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.VoteForFeatureError);
      }
    },
    createVotingRound: async (_, { input }) => {
      try {
        return await featureVotingApp.createVotingRound(input);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.VotingRoundMutationError
        );
      }
    },
    updateVotingRound: async (_, { id, input }) => {
      try {
        return await featureVotingApp.updateVotingRound(id, input);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.VotingRoundMutationError
        );
      }
    },
    setVotingRoundStatus: async (_, { id, status }) => {
      try {
        return await featureVotingApp.setVotingRoundStatus(id, status);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.VotingRoundMutationError
        );
      }
    },
    deleteVotingRound: async (_, { id }) => {
      try {
        return await featureVotingApp.deleteVotingRound(id);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.VotingRoundMutationError
        );
      }
    },
    createVotableFeature: async (_, { input, document }) => {
      try {
        return await featureVotingApp.createVotableFeature(
          input,
          document ?? []
        );
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.VotableFeatureMutationError
        );
      }
    },
    updateVotableFeature: async (_, { id, input, document }) => {
      try {
        return await featureVotingApp.updateVotableFeature(
          id,
          input,
          document ?? []
        );
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.VotableFeatureMutationError
        );
      }
    },
    deleteVotableFeature: async (_, { id }) => {
      try {
        return await featureVotingApp.deleteVotableFeature(id);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.VotableFeatureMutationError
        );
      }
    },
  },
};

export default resolvers;
