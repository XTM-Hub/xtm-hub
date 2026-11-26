import { v4 as uuidv4 } from 'uuid';
import {
  FiligranProduct,
  VotingRoundStatus,
  VotingRoundTheme,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { VotableFeatureId } from '../../model/kanel/public/VotableFeature';
import VotingRound, {
  VotingRoundId,
} from '../../model/kanel/public/VotingRound';
import { VotingRoundWithFeatures } from './feature-voting.app';
import { VotableFeatureWithVote } from './feature-voting.domain';

/**
 * In-memory shapes shared by the unit tests that mock the domain layer, namely
 * the resolver tests. The app tests exercise real Postgres and build their rows
 * through TestHelper instead.
 */
export const FIXTURE_ROUND_ID = uuidv4() as VotingRoundId;
export const FIXTURE_SERVICE_INSTANCE_ID = uuidv4() as ServiceInstanceId;

export const buildVotingRound = (
  overrides: Partial<VotingRound> = {}
): VotingRound => ({
  id: FIXTURE_ROUND_ID,
  service_instance_id: FIXTURE_SERVICE_INSTANCE_ID,
  name: 'Feature vote #1',
  description: null,
  status: VotingRoundStatus.Open,
  theme: VotingRoundTheme.Default,
  opened_at: null,
  closed_at: null,
  creator_id: null,
  created_at: new Date(),
  updated_at: null,
  ...overrides,
});

export const buildVotableFeature = (
  overrides: Partial<VotableFeatureWithVote> = {}
): VotableFeatureWithVote => ({
  id: uuidv4() as VotableFeatureId,
  voting_round_id: FIXTURE_ROUND_ID,
  title: 'AI-powered report triage',
  short_description: 'Automatically extract entities from reports.',
  description: 'Leverage AI to ingest unstructured threat reports.',
  product: FiligranProduct.Opencti,
  use_cases: [],
  illustration_document_id: null,
  position: 1,
  active: true,
  created_at: new Date(),
  updated_at: null,
  has_my_vote: false,
  ...overrides,
});

export const buildVotingRoundWithFeatures = (
  overrides: Partial<VotingRoundWithFeatures> = {}
): VotingRoundWithFeatures => ({
  ...buildVotingRound(),
  features: [],
  ...overrides,
});
