import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { requestContext } from '../../context/request.context';
import UseCase from '../../model/kanel/public/UseCase';
import { VotableFeatureId } from '../../model/kanel/public/VotableFeature';
import { VotingRoundId } from '../../model/kanel/public/VotingRound';
import { FeatureVotingDataLoader } from './feature-voting.dataloader';
import {
  featureVotingDomain,
  VotableFeatureWithVote,
} from './feature-voting.domain';
import { buildVotableFeature } from './feature-voting.fixtures';

describe('featureVotingDataLoader', () => {
  describe('batchLoadRoundFeatures', () => {
    it('should map each round id to the features grouped by loadVotableFeaturesByRoundIds', async () => {
      const roundId = uuidv4() as VotingRoundId;
      const otherRoundId = uuidv4() as VotingRoundId;
      const feature = buildVotableFeature({ voting_round_id: roundId });
      const grouped = new Map<VotingRoundId, VotableFeatureWithVote[]>([
        [roundId, [feature]],
      ]);
      vi.spyOn(
        featureVotingDomain,
        'loadVotableFeaturesByRoundIds'
      ).mockResolvedValue(grouped);
      vi.spyOn(requestContext, 'get').mockReturnValue(undefined);

      const result = await FeatureVotingDataLoader.batchLoadRoundFeatures([
        roundId,
        otherRoundId,
      ]);

      expect(
        featureVotingDomain.loadVotableFeaturesByRoundIds
      ).toHaveBeenCalledWith([roundId, otherRoundId], undefined);
      expect(result).toEqual([[feature], []]);
    });

    it('should pass the current request user id along for the has_my_vote flag', async () => {
      const roundId = uuidv4() as VotingRoundId;
      const userId = uuidv4();
      vi.spyOn(
        featureVotingDomain,
        'loadVotableFeaturesByRoundIds'
      ).mockResolvedValue(new Map());
      vi.spyOn(requestContext, 'get').mockReturnValue({
        user: { id: userId },
      } as never);

      await FeatureVotingDataLoader.batchLoadRoundFeatures([roundId]);

      expect(
        featureVotingDomain.loadVotableFeaturesByRoundIds
      ).toHaveBeenCalledWith([roundId], userId);
    });
  });

  describe('batchLoadUseCasesByFeature', () => {
    it('should map each feature id to its use cases and default to an empty array', async () => {
      const featureId = uuidv4() as VotableFeatureId;
      const otherFeatureId = uuidv4() as VotableFeatureId;
      const useCases = [{ id: 'use-case-1' } as UseCase];
      vi.spyOn(featureVotingDomain, 'loadUseCasesByFeature').mockResolvedValue(
        new Map([[featureId, useCases]])
      );

      const result = await FeatureVotingDataLoader.batchLoadUseCasesByFeature([
        featureId,
        otherFeatureId,
      ]);

      expect(featureVotingDomain.loadUseCasesByFeature).toHaveBeenCalledWith([
        featureId,
        otherFeatureId,
      ]);
      expect(result).toEqual([useCases, []]);
    });
  });

  describe('create', () => {
    it('should wire the round features loader to batchLoadRoundFeatures', async () => {
      const roundId = uuidv4() as VotingRoundId;
      const batchSpy = vi
        .spyOn(FeatureVotingDataLoader, 'batchLoadRoundFeatures')
        .mockResolvedValue([[]]);

      const loaders = FeatureVotingDataLoader.create();
      await loaders.roundFeaturesByRoundIdLoader.load(roundId);

      expect(batchSpy).toHaveBeenCalledWith([roundId]);
    });

    it('should wire the use cases loader to batchLoadUseCasesByFeature', async () => {
      const featureId = uuidv4() as VotableFeatureId;
      const batchSpy = vi
        .spyOn(FeatureVotingDataLoader, 'batchLoadUseCasesByFeature')
        .mockResolvedValue([[]]);

      const loaders = FeatureVotingDataLoader.create();
      await loaders.useCasesByFeatureIdLoader.load(featureId);

      expect(batchSpy).toHaveBeenCalledWith([featureId]);
    });
  });
});
