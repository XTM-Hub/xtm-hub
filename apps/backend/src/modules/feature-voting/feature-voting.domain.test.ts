import { v4 as uuidv4 } from 'uuid';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { database } from '../../../knexfile';
import { TestHelper } from '../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import {
  FiligranProduct,
  VotingRoundStatus,
} from '../../__generated__/resolvers-types';
import ServiceInstance from '../../model/kanel/public/ServiceInstance';
import UseCase, { UseCaseId } from '../../model/kanel/public/UseCase';
import { UserId } from '../../model/kanel/public/User';
import VotableFeature, {
  VotableFeatureId,
} from '../../model/kanel/public/VotableFeature';
import VotingRound, {
  VotingRoundId,
} from '../../model/kanel/public/VotingRound';
import { featureVotingDomain } from './feature-voting.domain';

const VOTER = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID;
const OTHER_VOTER = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID;

let serviceInstance: ServiceInstance;

const createRound = (overrides: Partial<VotingRound> = {}) =>
  TestHelper.votingRound.create({
    service_instance_id: serviceInstance.id,
    ...overrides,
  });

const createFeature = (
  roundId: VotingRoundId,
  overrides: Partial<VotableFeature> = {}
) =>
  TestHelper.votableFeature.create({
    voting_round_id: roundId,
    ...overrides,
  });

const vote = (
  roundId: VotingRoundId,
  featureId: VotableFeatureId,
  userId: UserId = VOTER,
  product: FiligranProduct = FiligranProduct.Opencti
) =>
  featureVotingDomain.upsertFeatureVote({
    user_id: userId,
    voting_round_id: roundId,
    votable_feature_id: featureId,
    product,
    created_at: new Date(),
  });

describe('featureVotingDomain', () => {
  beforeAll(async () => {
    serviceInstance = await TestHelper.serviceInstance.create();
  });

  // Rounds cascade to their features and votes, so removing them is enough.
  afterEach(async () => {
    await TestHelper.votingRound.delete({
      service_instance_id: serviceInstance.id,
    });
  });

  describe('loadVotableFeatures', () => {
    it('should only return the features of the requested round', async () => {
      const round = await createRound();
      const otherRound = await createRound();
      const feature = await createFeature(round.id);
      await createFeature(otherRound.id);

      const features = await featureVotingDomain.loadVotableFeatures({
        roundId: round.id,
      });

      expect(features.map(({ id }) => id)).toEqual([feature.id]);
    });

    // An OpenAEV feature used to sort ahead of every OpenCTI one, because the
    // products were ordered alphabetically rather than the way they are shown.
    it('should order the features by product display order then position', async () => {
      const round = await createRound();
      const openaev = await createFeature(round.id, {
        position: 5,
        product: FiligranProduct.Openaev,
        title: 'openaev-5',
      });
      const opencti = [];
      for (const position of [1, 2, 3, 4]) {
        opencti.push(
          await createFeature(round.id, {
            position,
            product: FiligranProduct.Opencti,
            title: `opencti-${position}`,
          })
        );
      }

      const features = await featureVotingDomain.loadVotableFeatures({
        roundId: round.id,
      });

      expect(features.map(({ title }) => title)).toEqual([
        'opencti-1',
        'opencti-2',
        'opencti-3',
        'opencti-4',
        'openaev-5',
      ]);
      expect(features.at(-1)!.id).toBe(openaev.id);
      expect(features[0]!.id).toBe(opencti[0]!.id);
    });

    it('should keep features sharing a position in a stable creation order', async () => {
      const round = await createRound();
      const first = await createFeature(round.id, {
        position: 1,
        created_at: new Date('2026-01-01'),
      });
      const second = await createFeature(round.id, {
        position: 1,
        created_at: new Date('2026-01-02'),
      });

      const features = await featureVotingDomain.loadVotableFeatures({
        roundId: round.id,
      });

      expect(features.map(({ id }) => id)).toEqual([first.id, second.id]);
    });

    it('should narrow the features down to a product when one is given', async () => {
      const round = await createRound();
      const openctiFeature = await createFeature(round.id);
      await createFeature(round.id, { product: FiligranProduct.Openaev });

      const features = await featureVotingDomain.loadVotableFeatures({
        roundId: round.id,
        product: FiligranProduct.Opencti,
      });

      expect(features.map(({ id }) => id)).toEqual([openctiFeature.id]);
    });

    it.each`
      onlyActive   | expectedTitles               | description
      ${true}      | ${['active']}                | ${'the public page, which must not offer a deactivated feature'}
      ${undefined} | ${['active', 'deactivated']} | ${'the admin screens, which must keep it reactivatable'}
    `(
      'should list $expectedTitles for $description',
      async ({ onlyActive, expectedTitles }) => {
        const round = await createRound();
        await createFeature(round.id, { title: 'active', position: 0 });
        await createFeature(round.id, {
          title: 'deactivated',
          active: false,
          position: 1,
        });

        const features = await featureVotingDomain.loadVotableFeatures({
          roundId: round.id,
          onlyActive,
        });

        expect(features.map(({ title }) => title)).toEqual(expectedTitles);
      }
    );

    it('should flag the feature the given user voted for', async () => {
      const round = await createRound();
      const voted = await createFeature(round.id, { position: 0 });
      const notVoted = await createFeature(round.id, { position: 1 });
      await vote(round.id, voted.id);

      const features = await featureVotingDomain.loadVotableFeatures({
        roundId: round.id,
        userId: VOTER,
      });

      expect(features).toEqual([
        expect.objectContaining({ id: voted.id, has_my_vote: true }),
        expect.objectContaining({ id: notVoted.id, has_my_vote: false }),
      ]);
    });

    it('should never flag a vote for an anonymous visitor', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id);
      await vote(round.id, feature.id);

      const features = await featureVotingDomain.loadVotableFeatures({
        roundId: round.id,
      });

      expect(features).toEqual([
        expect.objectContaining({ has_my_vote: false }),
      ]);
    });
  });

  describe('loadVotableFeaturesByRoundIds', () => {
    it('should group the features of every requested round in one query', async () => {
      const round = await createRound();
      const otherRound = await createRound();
      const feature = await createFeature(round.id);
      const otherFeature = await createFeature(otherRound.id);

      let queryCount = 0;
      const onQuery = () => {
        queryCount += 1;
      };
      database.on('query', onQuery);

      let grouped: Awaited<
        ReturnType<typeof featureVotingDomain.loadVotableFeaturesByRoundIds>
      >;
      try {
        grouped = await featureVotingDomain.loadVotableFeaturesByRoundIds([
          round.id,
          otherRound.id,
        ]);
      } finally {
        database.off('query', onQuery);
      }

      expect(grouped.get(round.id)?.map(({ id }) => id)).toEqual([feature.id]);
      expect(grouped.get(otherRound.id)?.map(({ id }) => id)).toEqual([
        otherFeature.id,
      ]);
      expect(queryCount).toBe(2);
    });

    it('should include inactive features, like the admin listing fallback does', async () => {
      const round = await createRound();
      const inactive = await createFeature(round.id, { active: false });

      const grouped = await featureVotingDomain.loadVotableFeaturesByRoundIds([
        round.id,
      ]);

      expect(grouped.get(round.id)?.map(({ id }) => id)).toEqual([inactive.id]);
    });

    it('should attach the use cases of every feature in the batch', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id);
      const useCase = await TestHelper.useCase.create({
        name: `feature-voting-domain-test-use-case-${uuidv4()}`,
        color: '#123456',
      });
      await featureVotingDomain.replaceFeatureUseCases(feature.id, [
        useCase.id,
      ]);

      const grouped = await featureVotingDomain.loadVotableFeaturesByRoundIds([
        round.id,
      ]);

      expect(
        grouped.get(round.id)?.[0]?.use_cases?.map(({ id }) => id)
      ).toEqual([useCase.id]);
      await TestHelper.useCase.delete({ id: useCase.id });
    });

    it('should flag the vote of the given user across every round', async () => {
      const round = await createRound();
      const voted = await createFeature(round.id);
      await vote(round.id, voted.id);

      const grouped = await featureVotingDomain.loadVotableFeaturesByRoundIds(
        [round.id],
        VOTER
      );

      expect(grouped.get(round.id)).toEqual([
        expect.objectContaining({ id: voted.id, has_my_vote: true }),
      ]);
    });

    it('should not query the database for an empty list of rounds', async () => {
      const grouped = await featureVotingDomain.loadVotableFeaturesByRoundIds(
        []
      );

      expect(grouped.size).toBe(0);
    });

    it('should not return an entry for a round without features', async () => {
      const round = await createRound();

      const grouped = await featureVotingDomain.loadVotableFeaturesByRoundIds([
        round.id,
      ]);

      expect(grouped.has(round.id)).toBe(false);
    });
  });

  describe('upsertFeatureVote', () => {
    // The primary key is what enforces one vote per user, round and product.
    it('should move the vote of a user instead of adding a second one', async () => {
      const round = await createRound();
      const first = await createFeature(round.id);
      const second = await createFeature(round.id);
      await vote(round.id, first.id);

      await vote(round.id, second.id);

      const votes = await TestHelper.featureVote.loadAll({
        voting_round_id: round.id,
        user_id: VOTER,
      });
      expect(votes).toEqual([
        expect.objectContaining({ votable_feature_id: second.id }),
      ]);
    });

    it('should let the same user vote once per product', async () => {
      const round = await createRound();
      const opencti = await createFeature(round.id);
      const openaev = await createFeature(round.id, {
        product: FiligranProduct.Openaev,
      });
      await vote(round.id, opencti.id);

      await vote(round.id, openaev.id, VOTER, FiligranProduct.Openaev);

      expect(await featureVotingDomain.countVotesInRound(round.id)).toBe(2);
      expect(await featureVotingDomain.countVotersInRound(round.id)).toBe(1);
    });
  });

  describe('closeOpenRoundsExcept', () => {
    it('should close the other open round of the same roadmap', async () => {
      const previouslyOpen = await createRound({
        status: VotingRoundStatus.Open,
      });
      const opening = await createRound();

      const closed = await featureVotingDomain.closeOpenRoundsExcept(
        opening.id,
        serviceInstance.id
      );

      expect(closed).toEqual([
        expect.objectContaining({
          id: previouslyOpen.id,
          status: VotingRoundStatus.Closed,
          closed_at: expect.any(Date),
        }),
      ]);
    });

    it('should leave the open round of another roadmap alone', async () => {
      const otherInstance = await TestHelper.serviceInstance.create();
      const foreignRound = await TestHelper.votingRound.create({
        service_instance_id: otherInstance.id,
        status: VotingRoundStatus.Open,
      });
      const opening = await createRound();

      const closed = await featureVotingDomain.closeOpenRoundsExcept(
        opening.id,
        serviceInstance.id
      );

      expect(closed).toEqual([]);
      const untouched = await TestHelper.votingRound.load({
        id: foreignRound.id,
      });
      expect(untouched?.status).toBe(VotingRoundStatus.Open);
      await TestHelper.votingRound.delete({ id: foreignRound.id });
      await TestHelper.serviceInstance.delete({ id: otherInstance.id });
    });

    // This is what makes the transition safe: the database refuses the second
    // open round even if two admins race past the application checks.
    it('should be backed by a unique index rejecting a second open round', async () => {
      await createRound({ status: VotingRoundStatus.Open });

      await expect(
        createRound({ status: VotingRoundStatus.Open })
      ).rejects.toThrow(/VotingRound_single_open_per_service_instance/);
    });

    it('should still allow several closed rounds on a roadmap', async () => {
      await createRound({ status: VotingRoundStatus.Closed });

      await expect(
        createRound({ status: VotingRoundStatus.Closed })
      ).resolves.toEqual(
        expect.objectContaining({ status: VotingRoundStatus.Closed })
      );
    });
  });

  describe('deleteVotingRound', () => {
    it('should take the features and the votes of the round down with it', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id);
      await vote(round.id, feature.id);

      await featureVotingDomain.deleteVotingRound(round.id);

      expect(
        await TestHelper.votableFeature.loadAll({ voting_round_id: round.id })
      ).toEqual([]);
      expect(
        await TestHelper.featureVote.loadAll({ voting_round_id: round.id })
      ).toEqual([]);
    });
  });

  describe('counters', () => {
    it('should count the votes and the distinct voters of a round', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id);
      const other = await createFeature(round.id);
      await vote(round.id, feature.id, VOTER);
      await vote(round.id, other.id, OTHER_VOTER);

      expect(await featureVotingDomain.countVotesInRound(round.id)).toBe(2);
      expect(await featureVotingDomain.countVotersInRound(round.id)).toBe(2);
      expect(await featureVotingDomain.countVotesForFeature(feature.id)).toBe(
        1
      );
    });

    it('should count only the active features of a round', async () => {
      const round = await createRound();
      await createFeature(round.id);
      await createFeature(round.id, { active: false });

      expect(
        await featureVotingDomain.countActiveFeaturesInRound(round.id)
      ).toBe(1);
    });

    it('should count the features of several rounds in one go', async () => {
      const withTwo = await createRound();
      const withNone = await createRound();
      await createFeature(withTwo.id);
      await createFeature(withTwo.id);

      const counts = await featureVotingDomain.countFeaturesByRound([
        withTwo.id,
        withNone.id,
      ]);

      expect(counts.get(withTwo.id)).toBe(2);
      expect(counts.has(withNone.id)).toBe(false);
    });

    it('should not query the database for an empty list of rounds', async () => {
      expect(await featureVotingDomain.countFeaturesByRound([])).toEqual(
        new Map()
      );
    });
  });

  describe('loadRoundResults', () => {
    it('should rank the features of the round by vote count', async () => {
      const round = await createRound();
      const winner = await createFeature(round.id, { position: 0 });
      const runnerUp = await createFeature(round.id, { position: 1 });
      const unvoted = await createFeature(round.id, { position: 2 });
      await vote(round.id, winner.id, VOTER);
      await vote(round.id, winner.id, OTHER_VOTER);
      await vote(round.id, runnerUp.id, VOTER, FiligranProduct.Openaev);

      const results = await featureVotingDomain.loadRoundResults(round.id);

      expect(results.map(({ id, vote_count }) => [id, vote_count])).toEqual([
        [winner.id, 2],
        [runnerUp.id, 1],
        [unvoted.id, 0],
      ]);
    });
  });

  describe('use cases', () => {
    let useCaseA: UseCase;
    let useCaseB: UseCase;

    beforeAll(async () => {
      useCaseA = await TestHelper.useCase.create({
        id: uuidv4() as UseCaseId,
        name: `test-use-case-a-${uuidv4()}`,
        color: '#001122',
        product: [FiligranProduct.Opencti],
      });
      useCaseB = await TestHelper.useCase.create({
        id: uuidv4() as UseCaseId,
        name: `test-use-case-b-${uuidv4()}`,
        color: '#334455',
        product: [FiligranProduct.Opencti],
      });
    });

    afterAll(async () => {
      await TestHelper.useCase.delete({ id: useCaseA.id });
      await TestHelper.useCase.delete({ id: useCaseB.id });
    });

    it('should attach the selected use cases to the feature', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id);

      await featureVotingDomain.replaceFeatureUseCases(feature.id, [
        useCaseA.id,
        useCaseB.id,
      ]);
      const grouped = await featureVotingDomain.loadUseCasesByFeature([
        feature.id,
      ]);

      expect(grouped.get(feature.id)?.map(({ id }) => id)).toEqual(
        expect.arrayContaining([useCaseA.id, useCaseB.id])
      );
    });

    it('should tag the use cases with their own typename so their global ID resolves as a UseCase', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id);

      await featureVotingDomain.replaceFeatureUseCases(feature.id, [
        useCaseA.id,
      ]);
      const grouped = await featureVotingDomain.loadUseCasesByFeature([
        feature.id,
      ]);

      expect(grouped.get(feature.id)).toEqual([
        expect.objectContaining({ id: useCaseA.id, __typename: 'UseCase' }),
      ]);
    });

    it('should replace the previous selection rather than add to it', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id);
      await featureVotingDomain.replaceFeatureUseCases(feature.id, [
        useCaseA.id,
      ]);

      await featureVotingDomain.replaceFeatureUseCases(feature.id, [
        useCaseB.id,
      ]);
      const grouped = await featureVotingDomain.loadUseCasesByFeature([
        feature.id,
      ]);

      expect(grouped.get(feature.id)?.map(({ id }) => id)).toEqual([
        useCaseB.id,
      ]);
    });

    it('should clear the selection when given an empty list', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id);
      await featureVotingDomain.replaceFeatureUseCases(feature.id, [
        useCaseA.id,
      ]);

      await featureVotingDomain.replaceFeatureUseCases(feature.id, []);
      const grouped = await featureVotingDomain.loadUseCasesByFeature([
        feature.id,
      ]);

      expect(grouped.get(feature.id)).toBeUndefined();
    });

    // Submitting the same use case twice must not violate the primary key.
    it('should ignore a use case selected twice', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id);

      await featureVotingDomain.replaceFeatureUseCases(feature.id, [
        useCaseA.id,
        useCaseA.id,
      ]);
      const grouped = await featureVotingDomain.loadUseCasesByFeature([
        feature.id,
      ]);

      expect(grouped.get(feature.id)?.map(({ id }) => id)).toEqual([
        useCaseA.id,
      ]);
    });

    it('should group the use cases per feature in a single load', async () => {
      const round = await createRound();
      const withA = await createFeature(round.id);
      const withB = await createFeature(round.id);
      const withNone = await createFeature(round.id);
      await featureVotingDomain.replaceFeatureUseCases(withA.id, [useCaseA.id]);
      await featureVotingDomain.replaceFeatureUseCases(withB.id, [useCaseB.id]);

      const grouped = await featureVotingDomain.loadUseCasesByFeature([
        withA.id,
        withB.id,
        withNone.id,
      ]);

      expect(grouped.get(withA.id)?.map(({ id }) => id)).toEqual([useCaseA.id]);
      expect(grouped.get(withB.id)?.map(({ id }) => id)).toEqual([useCaseB.id]);
      expect(grouped.get(withNone.id)).toBeUndefined();
    });

    // The join rows must not outlive the feature they describe.
    it('should drop the join rows when the feature is deleted', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id);
      await featureVotingDomain.replaceFeatureUseCases(feature.id, [
        useCaseA.id,
      ]);

      await featureVotingDomain.deleteVotableFeature(feature.id);
      const grouped = await featureVotingDomain.loadUseCasesByFeature([
        feature.id,
      ]);

      expect(grouped.get(feature.id)).toBeUndefined();
    });

    it('should expose the use cases alongside the features of a round', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id);
      await featureVotingDomain.replaceFeatureUseCases(feature.id, [
        useCaseA.id,
      ]);

      const [loaded] = await featureVotingDomain.loadVotableFeatures({
        roundId: round.id,
      });

      expect(loaded!.use_cases?.map(({ id }) => id)).toEqual([useCaseA.id]);
    });
  });
});
