import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { requestContext } from '../../context/request.context';
import UseCase from '../../model/kanel/public/UseCase';
import { VotableFeatureId } from '../../model/kanel/public/VotableFeature';
import { VotingRoundId } from '../../model/kanel/public/VotingRound';
import { UserLoadUserBy } from '../../model/user';
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
        user: { id: userId } as UserLoadUserBy,
      });

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
    it('should batch concurrent round feature loads into a single call', async () => {
      const roundId = uuidv4() as VotingRoundId;
      const otherRoundId = uuidv4() as VotingRoundId;
      const batchSpy = vi
        .spyOn(FeatureVotingDataLoader, 'batchLoadRoundFeatures')
        .mockResolvedValue([[], []]);

      const loaders = FeatureVotingDataLoader.create();
      const roundIdLoad = loaders.roundFeaturesByRoundIdLoader.load(roundId);
      const otherRoundIdLoad =
        loaders.roundFeaturesByRoundIdLoader.load(otherRoundId);
      await Promise.all([roundIdLoad, otherRoundIdLoad]);

      expect(batchSpy).toHaveBeenCalledTimes(1);
      expect(batchSpy).toHaveBeenCalledWith([roundId, otherRoundId]);
    });

    it('should batch concurrent use case loads into a single call', async () => {
      const featureId = uuidv4() as VotableFeatureId;
      const otherFeatureId = uuidv4() as VotableFeatureId;
      const batchSpy = vi
        .spyOn(FeatureVotingDataLoader, 'batchLoadUseCasesByFeature')
        .mockResolvedValue([[], []]);

      const loaders = FeatureVotingDataLoader.create();
      const featureIdLoad = loaders.useCasesByFeatureIdLoader.load(featureId);
      const otherFeatureIdLoad =
        loaders.useCasesByFeatureIdLoader.load(otherFeatureId);
      await Promise.all([featureIdLoad, otherFeatureIdLoad]);

      expect(batchSpy).toHaveBeenCalledTimes(1);
      expect(batchSpy).toHaveBeenCalledWith([featureId, otherFeatureId]);
    });
  });
});
