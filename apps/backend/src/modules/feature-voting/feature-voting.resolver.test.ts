import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../tests/tests.const';
import {
  FiligranProduct,
  VotingRoundStatus,
} from '../../__generated__/resolvers-types';
import Document, { DocumentId } from '../../model/kanel/public/Document';
import UseCase, { UseCaseId } from '../../model/kanel/public/UseCase';
import { VotableFeatureId } from '../../model/kanel/public/VotableFeature';
import { featureVotingApp } from './feature-voting.app';
import {
  buildVotableFeature,
  buildVotingRoundWithFeatures,
  FIXTURE_ROUND_ID,
  FIXTURE_SERVICE_INSTANCE_ID,
} from './feature-voting.fixtures';
import featureVotingResolver from './feature-voting.resolver';

const buildUseCase = (overrides: Partial<UseCase> = {}): UseCase => ({
  id: 'use-case-1' as UseCaseId,
  name: 'Threat hunting',
  color: '#000000',
  product: [FiligranProduct.Opencti],
  ...overrides,
});

const buildDocument = (overrides: Partial<Document> = {}): Document => ({
  id: 'doc-1' as DocumentId,
  uploader_id: null,
  service_instance_id: null,
  description: null,
  file_name: null,
  minio_name: null,
  active: true,
  created_at: new Date('2024-01-01T00:00:00Z'),
  remover_id: null,
  mime_type: null,
  name: null,
  updated_at: null,
  updater_id: null,
  short_description: null,
  slug: null,
  uploader_organization_id: null,
  type: 'test-type',
  source_type: null,
  is_decommissioned: false,
  version: null,
  tags: [],
  ...overrides,
});

describe('currentVotingRound GraphQL query', () => {
  it('should delegate to featureVotingApp.loadCurrentVotingRound', async () => {
    // Given
    const expected = buildVotingRoundWithFeatures();
    vi.spyOn(featureVotingApp, 'loadCurrentVotingRound').mockResolvedValue(
      expected
    );

    // When
    const result = await featureVotingResolver.Query!.currentVotingRound!(
      {},
      { service_instance_id: FIXTURE_SERVICE_INSTANCE_ID },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(featureVotingApp.loadCurrentVotingRound).toHaveBeenCalledWith(
      FIXTURE_SERVICE_INSTANCE_ID
    );
    expect(result).toEqual(expected);
  });
});

describe('votingRounds GraphQL query', () => {
  it('should delegate to featureVotingApp.loadVotingRounds', async () => {
    // Given
    const expected = [buildVotingRoundWithFeatures()];
    vi.spyOn(featureVotingApp, 'loadVotingRounds').mockResolvedValue(expected);

    // When
    const result = await featureVotingResolver.Query!.votingRounds!(
      {},
      { service_instance_id: FIXTURE_SERVICE_INSTANCE_ID },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(featureVotingApp.loadVotingRounds).toHaveBeenCalledWith(
      FIXTURE_SERVICE_INSTANCE_ID
    );
    expect(result).toEqual(expected);
  });
});

describe('votingRoundResults GraphQL query', () => {
  it('should delegate to featureVotingApp.loadVotingRoundResults with the round id', async () => {
    // Given
    const expected = {
      round: buildVotingRoundWithFeatures(),
      total_voters: 4,
      results: [{ feature: buildVotableFeature(), vote_count: 4 }],
    };
    vi.spyOn(featureVotingApp, 'loadVotingRoundResults').mockResolvedValue(
      expected
    );

    // When
    const result = await featureVotingResolver.Query!.votingRoundResults!(
      {},
      { id: FIXTURE_ROUND_ID },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(featureVotingApp.loadVotingRoundResults).toHaveBeenCalledWith(
      FIXTURE_ROUND_ID
    );
    expect(result).toEqual(expected);
  });
});

describe('voteForFeature GraphQL mutation', () => {
  it('should delegate to featureVotingApp.voteForFeature and return the round features', async () => {
    // Given
    const featureId = uuidv4() as VotableFeatureId;
    const expected = [
      buildVotableFeature({ id: featureId, has_my_vote: true }),
    ];
    vi.spyOn(featureVotingApp, 'voteForFeature').mockResolvedValue(expected);

    // When
    const result = await featureVotingResolver.Mutation!.voteForFeature!(
      {},
      { feature_id: featureId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(featureVotingApp.voteForFeature).toHaveBeenCalledWith(featureId);
    expect(result).toEqual(expected);
  });
});

describe('voting round admin GraphQL mutations', () => {
  it('should delegate createVotingRound to the app layer', async () => {
    // Given
    const input = { name: 'Feature vote #2' };
    const expected = buildVotingRoundWithFeatures();
    vi.spyOn(featureVotingApp, 'createVotingRound').mockResolvedValue(expected);

    // When
    const result = await featureVotingResolver.Mutation!.createVotingRound!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(featureVotingApp.createVotingRound).toHaveBeenCalledWith(input);
    expect(result).toEqual(expected);
  });

  it('should delegate setVotingRoundStatus to the app layer', async () => {
    // Given
    const expected = [
      buildVotingRoundWithFeatures({ status: VotingRoundStatus.Open }),
    ];
    vi.spyOn(featureVotingApp, 'setVotingRoundStatus').mockResolvedValue(
      expected
    );

    // When
    const result = await featureVotingResolver.Mutation!.setVotingRoundStatus!(
      {},
      { id: FIXTURE_ROUND_ID, status: VotingRoundStatus.Open },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(featureVotingApp.setVotingRoundStatus).toHaveBeenCalledWith(
      FIXTURE_ROUND_ID,
      VotingRoundStatus.Open
    );
    expect(result).toEqual(expected);
  });

  it('should delegate deleteVotingRound to the app layer', async () => {
    // Given
    const expected = buildVotingRoundWithFeatures();
    vi.spyOn(featureVotingApp, 'deleteVotingRound').mockResolvedValue(expected);

    // When
    const result = await featureVotingResolver.Mutation!.deleteVotingRound!(
      {},
      { id: FIXTURE_ROUND_ID },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(featureVotingApp.deleteVotingRound).toHaveBeenCalledWith(
      FIXTURE_ROUND_ID
    );
    expect(result).toEqual(expected);
  });
});

describe('votable feature admin GraphQL mutations', () => {
  it('should delegate createVotableFeature to the app layer', async () => {
    // Given
    const input = {
      voting_round_id: FIXTURE_ROUND_ID,
      title: 'New feature',
      short_description: 'Short',
      description: 'Long',
      product: FiligranProduct.Opencti,
    };
    const expected = buildVotableFeature();
    vi.spyOn(featureVotingApp, 'createVotableFeature').mockResolvedValue(
      expected
    );

    // When
    const result = await featureVotingResolver.Mutation!.createVotableFeature!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(featureVotingApp.createVotableFeature).toHaveBeenCalledWith(
      input,
      []
    );
    expect(result).toEqual(expected);
  });

  it('should delegate updateVotableFeature to the app layer', async () => {
    // Given
    const featureId = uuidv4() as VotableFeatureId;
    const input = { title: 'Renamed feature' };
    const expected = buildVotableFeature({
      id: featureId,
      title: 'Renamed feature',
    });
    vi.spyOn(featureVotingApp, 'updateVotableFeature').mockResolvedValue(
      expected
    );

    // When
    const result = await featureVotingResolver.Mutation!.updateVotableFeature!(
      {},
      { id: featureId, input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(featureVotingApp.updateVotableFeature).toHaveBeenCalledWith(
      featureId,
      input,
      []
    );
    expect(result).toMatchObject({ title: 'Renamed feature' });
  });

  it('should delegate deleteVotableFeature to the app layer', async () => {
    // Given
    const featureId = uuidv4() as VotableFeatureId;
    const expected = buildVotableFeature({ id: featureId });
    vi.spyOn(featureVotingApp, 'deleteVotableFeature').mockResolvedValue(
      expected
    );

    // When
    const result = await featureVotingResolver.Mutation!.deleteVotableFeature!(
      {},
      { id: featureId },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(featureVotingApp.deleteVotableFeature).toHaveBeenCalledWith(
      featureId
    );
    expect(result).toEqual(expected);
  });
});

describe('votingRound field resolvers', () => {
  it('should keep the features the caller already filtered for its audience', async () => {
    // Given
    const features = [buildVotableFeature()];
    const loadSpy = vi.spyOn(
      contextSimpleUserFiligran2.dataLoaders.featureVoting
        .roundFeaturesByRoundIdLoader,
      'load'
    );

    // When
    const result = await featureVotingResolver.VotingRound!.features!(
      buildVotingRoundWithFeatures({ features }),
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toEqual(features);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('should load the features of a round that was listed without them', async () => {
    // Given
    const features = [buildVotableFeature()];
    const loadSpy = vi
      .spyOn(
        contextSimpleUserFiligran2.dataLoaders.featureVoting
          .roundFeaturesByRoundIdLoader,
        'load'
      )
      .mockResolvedValue(features);
    const { features: _omitted, ...roundWithoutFeatures } =
      buildVotingRoundWithFeatures();

    // When
    const result = await featureVotingResolver.VotingRound!.features!(
      roundWithoutFeatures,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(loadSpy).toHaveBeenCalledWith(FIXTURE_ROUND_ID);
    expect(result).toEqual(features);
  });

  it('should report the precomputed count when the round was listed', async () => {
    // Given
    const { features: _omitted, ...round } = buildVotingRoundWithFeatures();

    // When
    const result = await featureVotingResolver.VotingRound!.feature_count!(
      { ...round, feature_count: 4 },
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toBe(4);
  });

  it('should count the features already attached to the round', async () => {
    // When
    const result = await featureVotingResolver.VotingRound!.feature_count!(
      buildVotingRoundWithFeatures({
        features: [buildVotableFeature(), buildVotableFeature()],
      }),
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toBe(2);
  });
});

describe('votableFeature field resolvers', () => {
  describe('use_cases', () => {
    it('should keep the use cases the caller already attached', async () => {
      // Given
      const useCases = [buildUseCase()];
      const loadSpy = vi.spyOn(
        contextSimpleUserFiligran2.dataLoaders.featureVoting
          .useCasesByFeatureIdLoader,
        'load'
      );

      // When
      const result = await featureVotingResolver.VotableFeature!.use_cases!(
        buildVotableFeature({ use_cases: useCases }),
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(result).toEqual(useCases);
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('should load the use cases of a feature returned without them', async () => {
      // Given
      const useCases = [buildUseCase()];
      const loadSpy = vi
        .spyOn(
          contextSimpleUserFiligran2.dataLoaders.featureVoting
            .useCasesByFeatureIdLoader,
          'load'
        )
        .mockResolvedValue(useCases);
      const { use_cases: _omitted, ...featureWithoutUseCases } =
        buildVotableFeature();

      // When
      const result = await featureVotingResolver.VotableFeature!.use_cases!(
        featureWithoutUseCases,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(loadSpy).toHaveBeenCalledWith(featureWithoutUseCases.id);
      expect(result).toEqual(useCases);
    });
  });

  describe('illustration_document', () => {
    it('should return null when the feature has no illustration', async () => {
      // Given
      const loadSpy = vi.spyOn(
        contextSimpleUserFiligran2.dataLoaders.document.documentByIdLoader,
        'load'
      );

      // When
      const result = await featureVotingResolver.VotableFeature!
        .illustration_document!(
        buildVotableFeature({ illustration_document_id: null }),
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(result).toBeNull();
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('should load the illustration document through the document DataLoader', async () => {
      // Given
      const documentId = uuidv4() as DocumentId;
      const document = buildDocument({
        id: documentId,
        file_name: 'illustration.png',
      });
      const loadSpy = vi
        .spyOn(
          contextSimpleUserFiligran2.dataLoaders.document.documentByIdLoader,
          'load'
        )
        .mockResolvedValue(document);

      // When
      const result = await featureVotingResolver.VotableFeature!
        .illustration_document!(
        buildVotableFeature({ illustration_document_id: documentId }),
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(loadSpy).toHaveBeenCalledWith(documentId);
      expect(result).toEqual(document);
    });
  });
});
