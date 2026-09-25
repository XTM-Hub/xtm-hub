import { v4 as uuidv4 } from 'uuid';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  requestContextSimpleUserFiligran2,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  FiligranProduct,
  VotingRoundStatus,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import PortalDocument from '../../model/kanel/public/Document';
import ServiceInstance, {
  ServiceInstanceId,
} from '../../model/kanel/public/ServiceInstance';
import { UserId } from '../../model/kanel/public/User';
import VotableFeature, {
  VotableFeatureId,
} from '../../model/kanel/public/VotableFeature';
import VotingRound, {
  VotingRoundId,
} from '../../model/kanel/public/VotingRound';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../utils/error/error.code';
import { featureVotingApp } from './feature-voting.app';
import { featureVotingDomain } from './feature-voting.domain';

const VOTER = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID;
const OTHER_VOTER = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID;

let serviceInstance: ServiceInstance;
let privateServiceInstance: ServiceInstance;

const createRound = (overrides: Partial<VotingRound> = {}) =>
  TestHelper.votingRound.create({
    service_instance_id: serviceInstance.id,
    ...overrides,
  });

const createFeature = (
  roundId: VotingRoundId,
  overrides: Partial<VotableFeature> = {}
) =>
  TestHelper.votableFeature.create({ voting_round_id: roundId, ...overrides });

const createUseCase = () =>
  TestHelper.useCase.create({
    name: `app-test-use-case-${uuidv4()}`,
    color: '#123456',
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

describe('featureVotingApp', () => {
  beforeAll(async () => {
    serviceInstance = await TestHelper.serviceInstance.create();
    privateServiceInstance = await TestHelper.serviceInstance.create({
      public: false,
    });
  });

  // Rounds cascade to their features, votes and use case links, so removing
  // them before each test is enough to isolate it.
  beforeEach(async () => {
    requestContext.set(requestContextSimpleUserFiligran2);
    await TestHelper.votingRound.delete({
      service_instance_id: serviceInstance.id,
    });
    await TestHelper.votingRound.delete({
      service_instance_id: privateServiceInstance.id,
    });
  });

  // The service instances are shared by the whole file, so they are only
  // removed once every round referencing them is gone.
  afterAll(async () => {
    await TestHelper.votingRound.delete({
      service_instance_id: serviceInstance.id,
    });
    await TestHelper.votingRound.delete({
      service_instance_id: privateServiceInstance.id,
    });
    await TestHelper.serviceInstance.delete({ id: serviceInstance.id });
    await TestHelper.serviceInstance.delete({
      id: privateServiceInstance.id,
    });
  });

  describe('loadCurrentVotingRound', () => {
    it('should return the round open on that service instance, with only its active features', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });
      const active = await createFeature(round.id, { title: 'Active' });
      await createFeature(round.id, { title: 'Inactive', active: false });

      const result = await featureVotingApp.loadCurrentVotingRound(
        serviceInstance.id
      );

      expect(result).toMatchObject({ id: round.id });
      expect(result?.features.map(({ id }) => id)).toEqual([active.id]);
    });

    it('should return null when that service instance has no round collecting votes', async () => {
      await createRound({ status: VotingRoundStatus.Draft });

      const result = await featureVotingApp.loadCurrentVotingRound(
        serviceInstance.id
      );

      expect(result).toBeNull();
    });

    // The field is public, so a guessed service instance id must not leak the
    // roadmap of a private instance.
    it('should return null for a private service instance even when it has an open round', async () => {
      await TestHelper.votingRound.create({
        service_instance_id: privateServiceInstance.id,
        status: VotingRoundStatus.Open,
      });

      const result = await featureVotingApp.loadCurrentVotingRound(
        privateServiceInstance.id
      );

      expect(result).toBeNull();
    });

    it('should return null for a service instance that does not exist', async () => {
      const result = await featureVotingApp.loadCurrentVotingRound(
        uuidv4() as ServiceInstanceId
      );

      expect(result).toBeNull();
    });

    it('should flag the features the caller already voted for', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });
      const voted = await createFeature(round.id, { position: 1 });
      const notVoted = await createFeature(round.id, { position: 2 });
      await vote(round.id, voted.id);

      const result = await featureVotingApp.loadCurrentVotingRound(
        serviceInstance.id
      );

      expect(result?.features).toEqual([
        expect.objectContaining({ id: voted.id, has_my_vote: true }),
        expect.objectContaining({ id: notVoted.id, has_my_vote: false }),
      ]);
    });
  });

  describe('admin reads of a voting round', () => {
    // A deactivated feature that disappears from the admin screens can never be
    // reactivated, so the admin fields must list inactive features whatever the
    // status of the round — an open round included.
    it.each([
      VotingRoundStatus.Draft,
      VotingRoundStatus.Open,
      VotingRoundStatus.Closed,
    ])(
      'should expose inactive features of a %s round to the admin',
      async (status) => {
        const round = await createRound({ status });
        const inactive = await createFeature(round.id, { active: false });

        const result = await featureVotingApp.loadVotingRound(round.id);

        expect(result?.features.map(({ id }) => id)).toEqual([inactive.id]);
      }
    );

    it('should return null for a round that does not exist', async () => {
      const result = await featureVotingApp.loadVotingRound(
        uuidv4() as VotingRoundId
      );

      expect(result).toBeNull();
    });

    it('should count the features of each listed round without returning them', async () => {
      const round = await createRound();
      await createFeature(round.id);
      await createFeature(round.id);
      await createFeature(round.id, { active: false });

      const rounds = await featureVotingApp.loadVotingRounds(
        serviceInstance.id
      );

      expect(rounds).toEqual([
        expect.objectContaining({ id: round.id, feature_count: 3 }),
      ]);
      expect(rounds[0]).not.toHaveProperty('features');
    });

    it('should report no feature for a round that has none', async () => {
      const round = await createRound();

      const rounds = await featureVotingApp.loadVotingRounds(
        serviceInstance.id
      );

      expect(rounds).toEqual([
        expect.objectContaining({ id: round.id, feature_count: 0 }),
      ]);
    });

    it('should restrict the admin round list to a service instance when asked', async () => {
      const round = await createRound();
      await TestHelper.votingRound.create({
        service_instance_id: privateServiceInstance.id,
      });

      const rounds = await featureVotingApp.loadVotingRounds(
        serviceInstance.id
      );

      expect(rounds.map(({ id }) => id)).toEqual([round.id]);
    });

    it('should return the use cases attached to a feature', async () => {
      const useCase = await createUseCase();
      const round = await createRound();
      const feature = await createFeature(round.id);
      await featureVotingDomain.replaceFeatureUseCases(feature.id, [
        useCase.id,
      ]);

      const useCases = await featureVotingApp.loadFeatureUseCases(feature.id);

      expect(useCases.map(({ id }) => id)).toEqual([useCase.id]);
      await TestHelper.useCase.delete({ id: useCase.id });
    });
  });

  describe('voteForFeature', () => {
    it('should record the vote against the round of the feature', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });
      const feature = await createFeature(round.id, {
        product: FiligranProduct.Xtmhub,
      });

      const result = await featureVotingApp.voteForFeature(feature.id);

      const votes = await TestHelper.featureVote.loadAll({
        voting_round_id: round.id,
      });
      expect(votes).toEqual([
        expect.objectContaining({
          user_id: VOTER,
          votable_feature_id: feature.id,
          product: FiligranProduct.Xtmhub,
        }),
      ]);
      expect(result).toEqual([
        expect.objectContaining({ id: feature.id, has_my_vote: true }),
      ]);
    });

    // One vote is allowed per user, per round and per product: voting again
    // must move the vote rather than add a second one.
    it('should move the vote when the user votes again on the same product', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });
      const first = await createFeature(round.id, { position: 1 });
      const second = await createFeature(round.id, { position: 2 });

      await featureVotingApp.voteForFeature(first.id);
      await featureVotingApp.voteForFeature(second.id);

      const votes = await TestHelper.featureVote.loadAll({
        voting_round_id: round.id,
      });
      expect(votes).toEqual([
        expect.objectContaining({ votable_feature_id: second.id }),
      ]);
    });

    it.each([VotingRoundStatus.Draft, VotingRoundStatus.Closed])(
      'should refuse to vote when the round is %s',
      async (status) => {
        const round = await createRound({ status });
        const feature = await createFeature(round.id);

        await expect(
          featureVotingApp.voteForFeature(feature.id)
        ).rejects.toThrow(ForbiddenErrorCode.VotingRoundNotOpen);

        const votes = await TestHelper.featureVote.loadAll({
          voting_round_id: round.id,
        });
        expect(votes).toHaveLength(0);
      }
    );

    it('should refuse to vote for an inactive feature', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });
      const feature = await createFeature(round.id, { active: false });

      await expect(featureVotingApp.voteForFeature(feature.id)).rejects.toThrow(
        NotFoundErrorCode.VotableFeatureNotFound
      );
    });

    it('should refuse to vote for a feature that does not exist', async () => {
      await expect(
        featureVotingApp.voteForFeature(uuidv4() as VotableFeatureId)
      ).rejects.toThrow(NotFoundErrorCode.VotableFeatureNotFound);
    });
  });

  describe('createVotingRound', () => {
    it('should refuse to create a round on a service instance that does not exist', async () => {
      await expect(
        featureVotingApp.createVotingRound({
          service_instance_id: uuidv4() as ServiceInstanceId,
          name: 'Feature vote #2',
        })
      ).rejects.toThrow(NotFoundErrorCode.ServiceInstanceNotFound);
    });

    it('should create the round as a draft attached to the service instance', async () => {
      const created = await featureVotingApp.createVotingRound({
        service_instance_id: serviceInstance.id,
        name: 'Feature vote #2',
      });

      const stored = await TestHelper.votingRound.load({ id: created.id });
      expect(stored).toMatchObject({
        service_instance_id: serviceInstance.id,
        name: 'Feature vote #2',
        status: VotingRoundStatus.Draft,
        creator_id: VOTER,
      });
      expect(created.features).toEqual([]);
    });

    it('should copy the features of the source round without copying its votes', async () => {
      const source = await createRound({ status: VotingRoundStatus.Open });
      const sourceFeature = await createFeature(source.id, {
        title: 'Copied feature',
        product: FiligranProduct.Openaev,
      });
      await vote(source.id, sourceFeature.id, VOTER, FiligranProduct.Openaev);

      const created = await featureVotingApp.createVotingRound({
        service_instance_id: serviceInstance.id,
        name: 'Feature vote #2',
        copy_features_from_round_id: source.id,
      });

      expect(created.features).toEqual([
        expect.objectContaining({
          title: 'Copied feature',
          product: FiligranProduct.Openaev,
          has_my_vote: false,
        }),
      ]);
      const copiedVotes = await TestHelper.featureVote.loadAll({
        voting_round_id: created.id,
      });
      expect(copiedVotes).toHaveLength(0);
    });

    it('should copy the use cases along with the features', async () => {
      const useCase = await createUseCase();
      const source = await createRound();
      const sourceFeature = await createFeature(source.id);
      await featureVotingDomain.replaceFeatureUseCases(sourceFeature.id, [
        useCase.id,
      ]);

      const created = await featureVotingApp.createVotingRound({
        service_instance_id: serviceInstance.id,
        name: 'Feature vote #2',
        copy_features_from_round_id: source.id,
      });

      const copy = created.features[0];
      const copiedUseCases = await featureVotingApp.loadFeatureUseCases(
        copy!.id
      );
      expect(copiedUseCases.map(({ id }) => id)).toEqual([useCase.id]);
      await TestHelper.useCase.delete({ id: useCase.id });
    });

    // Copying across roadmaps would mix unrelated feedback.
    it('should refuse to copy the features of a round of another roadmap', async () => {
      const source = await TestHelper.votingRound.create({
        service_instance_id: privateServiceInstance.id,
      });

      await expect(
        featureVotingApp.createVotingRound({
          service_instance_id: serviceInstance.id,
          name: 'Feature vote #2',
          copy_features_from_round_id: source.id,
        })
      ).rejects.toThrow(ForbiddenErrorCode.CopyFeaturesFromAnotherRoadmap);
    });

    // The round and its copied features are one unit: a failure midway must not
    // leave an empty round behind.
    it('should not leave a round behind when copying the features fails', async () => {
      const source = await TestHelper.votingRound.create({
        service_instance_id: privateServiceInstance.id,
      });

      await expect(
        featureVotingApp.createVotingRound({
          service_instance_id: serviceInstance.id,
          name: 'Rolled back round',
          copy_features_from_round_id: source.id,
        })
      ).rejects.toThrow();

      const stored = await TestHelper.votingRound.load({
        name: 'Rolled back round',
      });
      expect(stored).toBeUndefined();
    });
  });

  describe('updateVotingRound', () => {
    it('should clear the description when it is explicitly set to null', async () => {
      const round = await createRound({ description: 'Some description' });

      await featureVotingApp.updateVotingRound(round.id, {
        description: null,
      });

      const stored = await TestHelper.votingRound.load({ id: round.id });
      expect(stored?.description).toBeNull();
    });

    it('should leave the description untouched when the field is absent', async () => {
      const round = await createRound({ description: 'Some description' });

      await featureVotingApp.updateVotingRound(round.id, { name: 'Renamed' });

      const stored = await TestHelper.votingRound.load({ id: round.id });
      expect(stored).toMatchObject({
        name: 'Renamed',
        description: 'Some description',
      });
    });

    it('should refuse to update a round that does not exist', async () => {
      await expect(
        featureVotingApp.updateVotingRound(uuidv4() as VotingRoundId, {
          name: 'Ghost',
        })
      ).rejects.toThrow(NotFoundErrorCode.VotingRoundNotFound);
    });
  });

  describe('setVotingRoundStatus', () => {
    it('should close the previously open round when opening another one', async () => {
      const previouslyOpen = await createRound({
        status: VotingRoundStatus.Open,
      });
      await createFeature(previouslyOpen.id);
      const draft = await createRound({ status: VotingRoundStatus.Draft });
      await createFeature(draft.id);

      const result = await featureVotingApp.setVotingRoundStatus(
        draft.id,
        VotingRoundStatus.Open
      );

      expect(result.map(({ id }) => id)).toEqual([draft.id, previouslyOpen.id]);
      const opened = await TestHelper.votingRound.load({ id: draft.id });
      const closed = await TestHelper.votingRound.load({
        id: previouslyOpen.id,
      });
      expect(opened).toMatchObject({
        status: VotingRoundStatus.Open,
        opened_at: expect.any(Date),
      });
      expect(closed).toMatchObject({ status: VotingRoundStatus.Closed });
    });

    // Only the roadmap being changed is serialised, so a round open on another
    // roadmap must keep collecting votes.
    it('should leave the open round of another roadmap alone', async () => {
      const otherRoadmapRound = await TestHelper.votingRound.create({
        service_instance_id: privateServiceInstance.id,
        status: VotingRoundStatus.Open,
      });
      const draft = await createRound({ status: VotingRoundStatus.Draft });
      await createFeature(draft.id);

      await featureVotingApp.setVotingRoundStatus(
        draft.id,
        VotingRoundStatus.Open
      );

      const untouched = await TestHelper.votingRound.load({
        id: otherRoadmapRound.id,
      });
      expect(untouched).toMatchObject({ status: VotingRoundStatus.Open });
    });

    it('should stamp closed_at when closing a round', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });

      await featureVotingApp.setVotingRoundStatus(
        round.id,
        VotingRoundStatus.Closed
      );

      const stored = await TestHelper.votingRound.load({ id: round.id });
      expect(stored).toMatchObject({
        status: VotingRoundStatus.Closed,
        closed_at: expect.any(Date),
      });
    });

    it('should be a no-op when the round already has the target status', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });

      const result = await featureVotingApp.setVotingRoundStatus(
        round.id,
        VotingRoundStatus.Open
      );

      expect(result.map(({ id }) => id)).toEqual([round.id]);
      const stored = await TestHelper.votingRound.load({ id: round.id });
      expect(stored?.opened_at).toBeNull();
    });

    // The disabled button is a convenience; the mutation is reachable on its own.
    it('should refuse to open a round that has no active feature', async () => {
      const round = await createRound({ status: VotingRoundStatus.Draft });
      await createFeature(round.id, { active: false });

      await expect(
        featureVotingApp.setVotingRoundStatus(round.id, VotingRoundStatus.Open)
      ).rejects.toThrow(ForbiddenErrorCode.OpenVotingRoundWithoutActiveFeature);

      const stored = await TestHelper.votingRound.load({ id: round.id });
      expect(stored?.status).toBe(VotingRoundStatus.Draft);
    });

    it('should still allow closing a round that has no active feature', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });

      await featureVotingApp.setVotingRoundStatus(
        round.id,
        VotingRoundStatus.Closed
      );

      const stored = await TestHelper.votingRound.load({ id: round.id });
      expect(stored?.status).toBe(VotingRoundStatus.Closed);
    });

    it('should refuse to change the status of a round that does not exist', async () => {
      await expect(
        featureVotingApp.setVotingRoundStatus(
          uuidv4() as VotingRoundId,
          VotingRoundStatus.Open
        )
      ).rejects.toThrow(NotFoundErrorCode.VotingRoundNotFound);
    });
  });

  describe('deleteVotingRound', () => {
    it('should refuse to delete a round that already collected votes', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });
      const feature = await createFeature(round.id);
      await vote(round.id, feature.id);

      await expect(
        featureVotingApp.deleteVotingRound(round.id)
      ).rejects.toThrow(ForbiddenErrorCode.DeleteVotingRoundBlockedByVotes);

      const stored = await TestHelper.votingRound.load({ id: round.id });
      expect(stored).toBeDefined();
    });

    it('should delete a round without votes, along with its features', async () => {
      const round = await createRound();
      await createFeature(round.id);

      const result = await featureVotingApp.deleteVotingRound(round.id);

      expect(result).toMatchObject({ id: round.id, features: [] });
      const stored = await TestHelper.votingRound.load({ id: round.id });
      expect(stored).toBeUndefined();
      const features = await TestHelper.votableFeature.loadAll({
        voting_round_id: round.id,
      });
      expect(features).toHaveLength(0);
    });

    it('should refuse to delete a round that does not exist', async () => {
      await expect(
        featureVotingApp.deleteVotingRound(uuidv4() as VotingRoundId)
      ).rejects.toThrow(NotFoundErrorCode.VotingRoundNotFound);
    });
  });

  describe('createVotableFeature', () => {
    it('should refuse to add a feature to a closed round', async () => {
      const round = await createRound({ status: VotingRoundStatus.Closed });

      await expect(
        featureVotingApp.createVotableFeature({
          voting_round_id: round.id,
          title: 'New feature',
          short_description: 'Short',
          description: 'Long',
          product: FiligranProduct.Opencti,
        })
      ).rejects.toThrow(ForbiddenErrorCode.VotingRoundClosed);

      const features = await TestHelper.votableFeature.loadAll({
        voting_round_id: round.id,
      });
      expect(features).toHaveLength(0);
    });

    it('should store the feature with the submitted use cases', async () => {
      const useCase = await createUseCase();
      const round = await createRound();

      const created = await featureVotingApp.createVotableFeature({
        voting_round_id: round.id,
        title: 'New feature',
        short_description: 'Short',
        description: 'Long',
        product: FiligranProduct.Opencti,
        use_case_ids: [useCase.id],
      });

      expect(created).toMatchObject({
        title: 'New feature',
        has_my_vote: false,
      });
      const useCases = await featureVotingApp.loadFeatureUseCases(created.id);
      expect(useCases.map(({ id }) => id)).toEqual([useCase.id]);
      await TestHelper.useCase.delete({ id: useCase.id });
    });

    it('should refuse to add a feature to a round that does not exist', async () => {
      await expect(
        featureVotingApp.createVotableFeature({
          voting_round_id: uuidv4() as VotingRoundId,
          title: 'New feature',
          short_description: 'Short',
          description: 'Long',
          product: FiligranProduct.Opencti,
        })
      ).rejects.toThrow(NotFoundErrorCode.VotingRoundNotFound);
    });
  });

  describe('updateVotableFeature', () => {
    let illustration: PortalDocument;

    beforeEach(async () => {
      illustration = await TestHelper.document.create({
        service_instance_id: serviceInstance.id,
        file_name: 'illustration.png',
        mime_type: 'image/png',
      });
    });

    // The feature keeps a foreign key on the document, so the row must not
    // outlive the test and leak into the other suites.
    afterEach(async () => {
      await TestHelper.document.delete({ id: illustration.id });
    });

    // An explicit null is how the admin removes the illustration: it must reach
    // the database instead of being stripped away as an absent field.
    it('should clear the illustration when it is explicitly set to null', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id, {
        illustration_document_id: illustration.id,
      });

      await featureVotingApp.updateVotableFeature(feature.id, {
        illustration_document_id: null,
      });

      const [stored] = await TestHelper.votableFeature.loadAll({
        id: feature.id,
      });
      expect(stored?.illustration_document_id).toBeNull();
    });

    it('should leave the illustration untouched when the field is absent', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id, {
        illustration_document_id: illustration.id,
      });

      await featureVotingApp.updateVotableFeature(feature.id, {
        title: 'Renamed',
      });

      const [stored] = await TestHelper.votableFeature.loadAll({
        id: feature.id,
      });
      expect(stored).toMatchObject({
        title: 'Renamed',
        illustration_document_id: illustration.id,
      });
    });

    // An explicit empty list is how the admin clears the selection: it must
    // reach the database instead of being read as an absent field.
    it('should clear the use cases when an empty list is sent', async () => {
      const useCase = await createUseCase();
      const round = await createRound();
      const feature = await createFeature(round.id);
      await featureVotingDomain.replaceFeatureUseCases(feature.id, [
        useCase.id,
      ]);

      await featureVotingApp.updateVotableFeature(feature.id, {
        use_case_ids: [],
      });

      const useCases = await featureVotingApp.loadFeatureUseCases(feature.id);
      expect(useCases).toHaveLength(0);
      await TestHelper.useCase.delete({ id: useCase.id });
    });

    it('should leave the use cases untouched when the field is absent', async () => {
      const useCase = await createUseCase();
      const round = await createRound();
      const feature = await createFeature(round.id);
      await featureVotingDomain.replaceFeatureUseCases(feature.id, [
        useCase.id,
      ]);

      await featureVotingApp.updateVotableFeature(feature.id, {
        title: 'Renamed',
      });

      const useCases = await featureVotingApp.loadFeatureUseCases(feature.id);
      expect(useCases.map(({ id }) => id)).toEqual([useCase.id]);
      await TestHelper.useCase.delete({ id: useCase.id });
    });

    it('should replace the use cases with the submitted selection', async () => {
      const first = await createUseCase();
      const second = await createUseCase();
      const round = await createRound();
      const feature = await createFeature(round.id);
      await featureVotingDomain.replaceFeatureUseCases(feature.id, [first.id]);

      await featureVotingApp.updateVotableFeature(feature.id, {
        use_case_ids: [second.id],
      });

      const useCases = await featureVotingApp.loadFeatureUseCases(feature.id);
      expect(useCases.map(({ id }) => id)).toEqual([second.id]);
      await TestHelper.useCase.delete({ id: first.id });
      await TestHelper.useCase.delete({ id: second.id });
    });

    // The results of a closed round are published: editing a feature afterwards
    // would silently change what people voted on.
    it('should refuse to edit a feature of a closed round', async () => {
      const round = await createRound({ status: VotingRoundStatus.Closed });
      const feature = await createFeature(round.id, { title: 'Original' });

      await expect(
        featureVotingApp.updateVotableFeature(feature.id, { title: 'Renamed' })
      ).rejects.toThrow(ForbiddenErrorCode.VotingRoundClosed);

      const [stored] = await TestHelper.votableFeature.loadAll({
        id: feature.id,
      });
      expect(stored?.title).toBe('Original');
    });

    // One vote is allowed per user, per round and per product: moving a voted
    // feature to another product would let the same user weigh twice there.
    it('should refuse to move a feature that already collected votes to another product', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });
      const feature = await createFeature(round.id, {
        product: FiligranProduct.Opencti,
      });
      await vote(round.id, feature.id);

      await expect(
        featureVotingApp.updateVotableFeature(feature.id, {
          product: FiligranProduct.Openaev,
        })
      ).rejects.toThrow(ForbiddenErrorCode.VotableFeatureProductLocked);

      const [stored] = await TestHelper.votableFeature.loadAll({
        id: feature.id,
      });
      expect(stored?.product).toBe(FiligranProduct.Opencti);
    });

    it('should still allow editing a voted feature as long as its product is unchanged', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });
      const feature = await createFeature(round.id, {
        product: FiligranProduct.Opencti,
      });
      await vote(round.id, feature.id);

      const result = await featureVotingApp.updateVotableFeature(feature.id, {
        title: 'Renamed',
        product: FiligranProduct.Opencti,
      });

      expect(result).toMatchObject({ title: 'Renamed', has_my_vote: true });
    });

    it('should refuse to edit a feature that does not exist', async () => {
      await expect(
        featureVotingApp.updateVotableFeature(uuidv4() as VotableFeatureId, {
          title: 'Ghost',
        })
      ).rejects.toThrow(NotFoundErrorCode.VotableFeatureNotFound);
    });
  });

  describe('deleteVotableFeature', () => {
    it('should refuse to delete a feature that already collected votes', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });
      const feature = await createFeature(round.id);
      await vote(round.id, feature.id);

      await expect(
        featureVotingApp.deleteVotableFeature(feature.id)
      ).rejects.toThrow(ForbiddenErrorCode.DeleteVotableFeatureBlockedByVotes);

      const features = await TestHelper.votableFeature.loadAll({
        id: feature.id,
      });
      expect(features).toHaveLength(1);
    });

    it('should delete a feature without votes', async () => {
      const round = await createRound();
      const feature = await createFeature(round.id);

      const result = await featureVotingApp.deleteVotableFeature(feature.id);

      expect(result).toMatchObject({ id: feature.id, has_my_vote: false });
      const features = await TestHelper.votableFeature.loadAll({
        id: feature.id,
      });
      expect(features).toHaveLength(0);
    });

    it('should refuse to delete a feature that does not exist', async () => {
      await expect(
        featureVotingApp.deleteVotableFeature(uuidv4() as VotableFeatureId)
      ).rejects.toThrow(NotFoundErrorCode.VotableFeatureNotFound);
    });
  });

  describe('loadVotingRoundResults', () => {
    it('should return the ranking and the number of distinct voters', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });
      const winner = await createFeature(round.id, { position: 1 });
      const runnerUp = await createFeature(round.id, { position: 2 });
      await vote(round.id, winner.id, VOTER);
      await vote(round.id, winner.id, OTHER_VOTER);
      await vote(round.id, runnerUp.id, OTHER_VOTER, FiligranProduct.Openaev);

      const result = await featureVotingApp.loadVotingRoundResults(round.id);

      expect(result.round).toMatchObject({ id: round.id });
      expect(result.total_voters).toBe(2);
      expect(
        result.results.map(({ feature, vote_count }) => [
          feature.id,
          vote_count,
        ])
      ).toEqual([
        [winner.id, 2],
        [runnerUp.id, 1],
      ]);
    });

    // The results back a page shared by everyone, so they must never carry the
    // reader's own vote and turn it into a personalised view.
    it('should never flag the reader own vote in the results', async () => {
      const round = await createRound({ status: VotingRoundStatus.Open });
      const feature = await createFeature(round.id);
      await vote(round.id, feature.id, VOTER);

      const result = await featureVotingApp.loadVotingRoundResults(round.id);

      expect(result.results[0]?.feature.has_my_vote).toBe(false);
    });

    it('should refuse to return the results of a round that does not exist', async () => {
      await expect(
        featureVotingApp.loadVotingRoundResults(uuidv4() as VotingRoundId)
      ).rejects.toThrow(NotFoundErrorCode.VotingRoundNotFound);
    });
  });
});
