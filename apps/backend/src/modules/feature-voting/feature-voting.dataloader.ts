import DataLoader from 'dataloader';
import { requestContext } from '../../context/request.context';
import UseCase from '../../model/kanel/public/UseCase';
import { VotableFeatureId } from '../../model/kanel/public/VotableFeature';
import { VotingRoundId } from '../../model/kanel/public/VotingRound';
import {
  featureVotingDomain,
  VotableFeatureWithVote,
} from './feature-voting.domain';

export interface FeatureVotingDataLoaders {
  roundFeaturesByRoundIdLoader: DataLoader<
    VotingRoundId,
    VotableFeatureWithVote[]
  >;
  useCasesByFeatureIdLoader: DataLoader<VotableFeatureId, UseCase[]>;
}

export const FeatureVotingDataLoader = {
  batchLoadRoundFeatures: async (
    roundIds: readonly VotingRoundId[]
  ): Promise<VotableFeatureWithVote[][]> => {
    const grouped = await featureVotingDomain.loadVotableFeaturesByRoundIds(
      [...roundIds],
      requestContext.get()?.user?.id
    );
    return roundIds.map((roundId) => grouped.get(roundId) ?? []);
  },

  batchLoadUseCasesByFeature: async (
    featureIds: readonly VotableFeatureId[]
  ): Promise<UseCase[][]> => {
    const useCases = await featureVotingDomain.loadUseCasesByFeature([
      ...featureIds,
    ]);
    return featureIds.map((featureId) => useCases.get(featureId) ?? []);
  },

  create: (): FeatureVotingDataLoaders => ({
    roundFeaturesByRoundIdLoader: new DataLoader(
      FeatureVotingDataLoader.batchLoadRoundFeatures
    ),
    useCasesByFeatureIdLoader: new DataLoader(
      FeatureVotingDataLoader.batchLoadUseCasesByFeature
    ),
  }),
};
