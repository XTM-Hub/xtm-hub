import type { CompetitorId } from '../model/kanel/public/Competitor.js';
import type { DeploymentRequestId } from '../model/kanel/public/DeploymentRequest.js';
import type { DocumentId } from '../model/kanel/public/Document.js';
import type { NewsFeedItemId } from '../model/kanel/public/NewsFeedItem.js';
import type { OrganizationId } from '../model/kanel/public/Organization.js';
import type { ServiceCapabilityId } from '../model/kanel/public/ServiceCapability.js';
import type { ServiceInstanceId } from '../model/kanel/public/ServiceInstance.js';
import type { SolutionCategoryId } from '../model/kanel/public/SolutionCategory.js';
import type { SubscriptionId } from '../model/kanel/public/Subscription.js';
import type { UseCaseId } from '../model/kanel/public/UseCase.js';
import type { UserId } from '../model/kanel/public/User.js';
import type { UserServiceId } from '../model/kanel/public/UserService.js';
import type { VotableFeatureId } from '../model/kanel/public/VotableFeature.js';
import type { VotingRoundId } from '../model/kanel/public/VotingRound.js';
import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { VotingRoundModel, VotableFeatureModel } from '../modules/feature-voting/feature-voting.app.js';
import type { PortalContext } from '../model/portal-context.js';
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  CompetitorId: { input: CompetitorId; output: CompetitorId; }
  Date: { input: any; output: any; }
  DeploymentRequestId: { input: DeploymentRequestId; output: DeploymentRequestId; }
  DocumentId: { input: DocumentId; output: DocumentId; }
  JSON: { input: any; output: any; }
  NewsFeedItemId: { input: NewsFeedItemId; output: NewsFeedItemId; }
  OrganizationId: { input: OrganizationId; output: OrganizationId; }
  ServiceCapabilityId: { input: ServiceCapabilityId; output: ServiceCapabilityId; }
  ServiceGroupId: { input: any; output: any; }
  ServiceInstanceId: { input: ServiceInstanceId; output: ServiceInstanceId; }
  SolutionCategoryId: { input: SolutionCategoryId; output: SolutionCategoryId; }
  SubscriptionId: { input: SubscriptionId; output: SubscriptionId; }
  Upload: { input: any; output: any; }
  UseCaseId: { input: UseCaseId; output: UseCaseId; }
  UserId: { input: UserId; output: UserId; }
  UserServiceId: { input: UserServiceId; output: UserServiceId; }
  VotableFeatureId: { input: VotableFeatureId; output: VotableFeatureId; }
  VotingRoundId: { input: VotingRoundId; output: VotingRoundId; }
};

export type AddServiceInput = {
  fee_type?: InputMaybe<Scalars['String']['input']>;
  organization_id?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Int']['input']>;
  service_instance_description?: InputMaybe<Scalars['String']['input']>;
  service_instance_name?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type AddSolutionCategoryInput = {
  name: Scalars['String']['input'];
  product?: InputMaybe<Array<FiligranProduct>>;
};

export type AddSubscriptionCapabilityInput = {
  capabilitiesId: Array<Scalars['ServiceCapabilityId']['input']>;
  subscriptionsId: Array<Scalars['SubscriptionId']['input']>;
};

export type AddUseCaseInput = {
  color: Scalars['String']['input'];
  name: Scalars['String']['input'];
  product?: InputMaybe<Array<FiligranProduct>>;
};

export type AddUserInput = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>;
  email: Scalars['String']['input'];
  password?: InputMaybe<Scalars['String']['input']>;
};

export type AddUsersToBundleGroupsInput = {
  roles: Array<BundleUserRoleAssignmentInput>;
  userIds: Array<Scalars['UserId']['input']>;
};

export type AdminAddUserInput = {
  email: Scalars['String']['input'];
  first_name?: InputMaybe<Scalars['String']['input']>;
  last_name?: InputMaybe<Scalars['String']['input']>;
  organization_capabilities?: InputMaybe<Array<OrganizationCapabilitiesInput>>;
  password?: InputMaybe<Scalars['String']['input']>;
};

export type AdminEditUserInput = {
  disabled?: InputMaybe<Scalars['Boolean']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  first_name?: InputMaybe<Scalars['String']['input']>;
  last_name?: InputMaybe<Scalars['String']['input']>;
  organization_capabilities?: InputMaybe<Array<OrganizationCapabilitiesInput>>;
};

export type AutoRegisterPlatformInput = {
  existing_users_count?: InputMaybe<Scalars['Int']['input']>;
  platform: PlatformInput;
};

export type BulkPendingUserFromOrganizationInput = {
  excludedIds?: InputMaybe<Array<Scalars['UserId']['input']>>;
  filters?: InputMaybe<Array<Filter>>;
  ids?: InputMaybe<Array<Scalars['UserId']['input']>>;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};

export type BundleUserRoleAssignmentInput = {
  product: PlatformIdentifier;
  role: ServiceGroupName;
};

export type BundleUserServiceGroup = {
  __typename?: 'BundleUserServiceGroup';
  groups: Array<UserPlatformGroup>;
  user: User;
};

export type CanUnregisterPlatformInput = {
  platformId: Scalars['String']['input'];
  tenantId?: InputMaybe<Scalars['String']['input']>;
};

export type CanUnregisterResponse = {
  __typename?: 'CanUnregisterResponse';
  isAllowed?: Maybe<Scalars['Boolean']['output']>;
  isInOrganization?: Maybe<Scalars['Boolean']['output']>;
  isPlatformRegistered: Scalars['Boolean']['output'];
  organizationId?: Maybe<Scalars['OrganizationId']['output']>;
};

export type Capability = Node & {
  __typename?: 'Capability';
  id: Scalars['ID']['output'];
  name: PortalCapability;
};

export type Competitor = Node & {
  __typename?: 'Competitor';
  domain: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tier: CompetitorTier;
};

export type CompetitorConnection = {
  __typename?: 'CompetitorConnection';
  edges: Array<CompetitorEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CompetitorEdge = {
  __typename?: 'CompetitorEdge';
  cursor: Scalars['String']['output'];
  node: Competitor;
};

export enum CompetitorOrdering {
  Domain = 'domain',
  Name = 'name',
  Tier = 'tier'
}

export enum CompetitorTier {
  Tier1 = 'tier1',
  Tier2 = 'tier2',
  Tier3 = 'tier3'
}

export type Connector = Document & Integration & Node & {
  __typename?: 'Connector';
  active: Scalars['Boolean']['output'];
  blogpost_url?: Maybe<Scalars['String']['output']>;
  children_documents?: Maybe<Array<ShareableResource>>;
  contact?: Maybe<Scalars['String']['output']>;
  container_image?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['Date']['output'];
  datasheet_url?: Maybe<Scalars['String']['output']>;
  demo_url?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  file_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type?: Maybe<LicenseType>;
  manager_supported: Scalars['Boolean']['output'];
  minimum_deployable_version?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  playbook_supported: Scalars['Boolean']['output'];
  product_version?: Maybe<Scalars['String']['output']>;
  remover_id?: Maybe<Scalars['ID']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories?: Maybe<Array<SolutionCategory>>;
  source_code?: Maybe<Scalars['String']['output']>;
  subscription?: Maybe<SubscriptionModel>;
  subscription_link?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
  verified: Scalars['Boolean']['output'];
  version?: Maybe<Scalars['String']['output']>;
};

export type ConsumeProvisionedNewsFeedItemsResponse = {
  __typename?: 'ConsumeProvisionedNewsFeedItemsResponse';
  available_news_feed_types: Array<NewsFeedItemType>;
  news_feed_items: Array<ProvisionedNewsFeedItem>;
};

export type CreateCompetitorInput = {
  domain: Scalars['String']['input'];
  name: Scalars['String']['input'];
  tier: CompetitorTier;
};

export type CreateDeploymentRequestInput = {
  activity_sector?: InputMaybe<DeploymentRequestActivitySector>;
  job_title?: InputMaybe<DeploymentRequestJobTitle>;
  products: Array<PlatformIdentifier>;
  region: DeploymentRequestPlatformRegion;
  source: DeploymentRequestSource;
  type: DeploymentRequestDeploymentType;
  use_cases_by_product?: InputMaybe<Array<ProductUseCaseInput>>;
};

export type CreateDocumentInput = {
  active: Scalars['Boolean']['input'];
  description: Scalars['String']['input'];
  entity_types?: InputMaybe<Array<Scalars['String']['input']>>;
  license_type?: InputMaybe<LicenseType>;
  name: Scalars['String']['input'];
  short_description: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  solution_categories: Array<Scalars['SolutionCategoryId']['input']>;
  uploader_id: Scalars['UserId']['input'];
  use_cases: Array<Scalars['UseCaseId']['input']>;
};

export type CreateEpicInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  description: Scalars['String']['input'];
  edition_type: EditionType;
  illustration_document?: InputMaybe<Scalars['Upload']['input']>;
  is_integration?: InputMaybe<Scalars['Boolean']['input']>;
  product: FiligranProduct;
  short_description: Scalars['String']['input'];
  timeline: Timeline;
  title: Scalars['String']['input'];
};

export type CreateSubscriptionsInput = {
  capability_ids?: InputMaybe<Array<Scalars['ServiceCapabilityId']['input']>>;
  end_date?: InputMaybe<Scalars['Date']['input']>;
  organization_id: Array<Scalars['OrganizationId']['input']>;
  service_instance_id: Scalars['ServiceInstanceId']['input'];
  start_date: Scalars['Date']['input'];
};

export type CreateVotableFeatureInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  description: Scalars['String']['input'];
  position?: InputMaybe<Scalars['Int']['input']>;
  product: FiligranProduct;
  short_description: Scalars['String']['input'];
  title: Scalars['String']['input'];
  use_case_ids?: InputMaybe<Array<Scalars['UseCaseId']['input']>>;
  voting_round_id: Scalars['VotingRoundId']['input'];
};

export type CreateVotingRoundInput = {
  copy_features_from_round_id?: InputMaybe<Scalars['VotingRoundId']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  service_instance_id: Scalars['ServiceInstanceId']['input'];
  theme?: InputMaybe<VotingRoundTheme>;
};

export type CsvFeed = Document & Integration & Node & {
  __typename?: 'CsvFeed';
  active: Scalars['Boolean']['output'];
  blogpost_url?: Maybe<Scalars['String']['output']>;
  children_documents?: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url?: Maybe<Scalars['String']['output']>;
  demo_url?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  feed_url?: Maybe<Scalars['String']['output']>;
  file_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type?: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  remover_id?: Maybe<Scalars['ID']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories?: Maybe<Array<SolutionCategory>>;
  subscription?: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
};

export type CustomDashboard = Document & Node & {
  __typename?: 'CustomDashboard';
  active: Scalars['Boolean']['output'];
  children_documents?: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  file_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  product_version?: Maybe<Scalars['String']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  subscription?: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
};

export type CustomView = Document & Node & {
  __typename?: 'CustomView';
  active: Scalars['Boolean']['output'];
  children_documents?: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  entity_types?: Maybe<Array<Scalars['String']['output']>>;
  file_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  product_version?: Maybe<Scalars['String']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  subscription?: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
};

/**
 * /!\ WARNING Do not use this type.
 * It exists only to cover cases where we failed to map to a specific Document.
 */
export type DefaultDocument = Document & Node & {
  __typename?: 'DefaultDocument';
  active: Scalars['Boolean']['output'];
  children_documents?: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  file_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug?: Maybe<Scalars['String']['output']>;
  subscription?: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
};

export type DeployedPlatform = {
  __typename?: 'DeployedPlatform';
  platformIdentifier: PlatformIdentifier;
  serviceInstanceId: Scalars['ServiceInstanceId']['output'];
};

export type DeployedResource = {
  __typename?: 'DeployedResource';
  deployedAt: Scalars['Date']['output'];
  deployedBy?: Maybe<User>;
  document: Document;
};

export type DeploymentAvailability = {
  __typename?: 'DeploymentAvailability';
  availableCount: Scalars['Int']['output'];
  capacity: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  platform_identifier?: Maybe<PlatformIdentifier>;
  region: DeploymentRequestPlatformRegion;
};

export type DeploymentRequest = Node & {
  __typename?: 'DeploymentRequest';
  activity_sector?: Maybe<DeploymentRequestActivitySector>;
  cancellation_date?: Maybe<Scalars['Date']['output']>;
  cancellation_reason?: Maybe<Scalars['String']['output']>;
  cancellation_user_email?: Maybe<Scalars['String']['output']>;
  children?: Maybe<Array<DeploymentRequest>>;
  counts_in_orga_quota: Scalars['Boolean']['output'];
  end_date?: Maybe<Scalars['Date']['output']>;
  hub_status: DeploymentRequestHubStatus;
  id: Scalars['ID']['output'];
  job_title?: Maybe<DeploymentRequestJobTitle>;
  ordering: Scalars['Int']['output'];
  organization_name?: Maybe<Scalars['String']['output']>;
  organization_requester_id: Scalars['OrganizationId']['output'];
  parent_id?: Maybe<Scalars['DeploymentRequestId']['output']>;
  platform_id?: Maybe<Scalars['String']['output']>;
  platform_identifier?: Maybe<PlatformIdentifier>;
  platform_url?: Maybe<Scalars['String']['output']>;
  region: DeploymentRequestPlatformRegion;
  registered_platform?: Maybe<RegisteredPlatform>;
  request_date: Scalars['Date']['output'];
  requester_email?: Maybe<Scalars['String']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id: Scalars['ServiceInstanceId']['output'];
  start_date?: Maybe<Scalars['Date']['output']>;
  type: DeploymentRequestDeploymentType;
  url?: Maybe<Scalars['String']['output']>;
  use_case?: Maybe<DeploymentRequestUseCase>;
};

export enum DeploymentRequestActivitySector {
  ComputerGames = 'computer_games',
  ComputerNetworkSecurity = 'computer_network_security',
  ComputerSoftware = 'computer_software',
  DefenseSpace = 'defense_space',
  Entertainment = 'entertainment',
  FinancialServices = 'financial_services',
  GovernmentAdministration = 'government_administration',
  GovernmentRelations = 'government_relations',
  HigherEducation = 'higher_education',
  HospitalHealthCare = 'hospital_health_care',
  Hospitality = 'hospitality',
  InformationTechnology = 'information_technology',
  Insurance = 'insurance',
  LegalServices = 'legal_services',
  LuxuryGoodsJewelry = 'luxury_goods_jewelry',
  ManagementConsulting = 'management_consulting',
  MarketingAdvertising = 'marketing_advertising',
  Military = 'military',
  NonProfit = 'non_profit',
  OilEnergy = 'oil_energy',
  Pharmaceuticals = 'pharmaceuticals',
  Photography = 'photography',
  Retail = 'retail',
  SecurityInvestigations = 'security_investigations',
  Semiconductors = 'semiconductors',
  Telecommunications = 'telecommunications',
  Transportation = 'transportation',
  Utilities = 'utilities',
  Wireless = 'wireless'
}

export type DeploymentRequestConnection = {
  __typename?: 'DeploymentRequestConnection';
  edges: Array<DeploymentRequestEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export enum DeploymentRequestDeploymentType {
  Bundle = 'bundle',
  Trial = 'trial'
}

export type DeploymentRequestEdge = {
  __typename?: 'DeploymentRequestEdge';
  cursor: Scalars['String']['output'];
  node: DeploymentRequest;
};

export type DeploymentRequestFilter = {
  key?: InputMaybe<DeploymentRequestFilterKey>;
  value: Array<Scalars['String']['input']>;
};

export enum DeploymentRequestFilterKey {
  ActualState = 'actual_state',
  HubStatus = 'hub_status',
  ParentId = 'parent_id',
  PlatformIdentifier = 'platform_identifier',
  Region = 'region',
  TargetState = 'target_state',
  Type = 'type'
}

export enum DeploymentRequestHubStatus {
  Active = 'active',
  Cancelled = 'cancelled',
  Expired = 'expired',
  Failed = 'failed',
  Pending = 'pending',
  Provisioning = 'provisioning',
  Queued = 'queued'
}

export enum DeploymentRequestJobTitle {
  ApplicationSecuritySpecialist = 'application_security_specialist',
  CLevel = 'c_level',
  Ceo = 'ceo',
  CisoCsoCio = 'ciso_cso_cio',
  CloudSecuritySpecialist = 'cloud_security_specialist',
  Consultant = 'consultant',
  CybersecurityArchitect = 'cybersecurity_architect',
  CybersecurityEngineer = 'cybersecurity_engineer',
  CybersecurityTeamLead = 'cybersecurity_team_lead',
  DfirSpecialist = 'dfir_specialist',
  DirectorHeadCybersecurity = 'director_head_cybersecurity',
  GeneralManagerVp = 'general_manager_vp',
  GrcSpecialist = 'grc_specialist',
  IamSpecialist = 'iam_specialist',
  Other = 'other',
  PenetrationTester = 'penetration_tester',
  SocAnalyst = 'soc_analyst',
  ThreatIntelligenceAnalyst = 'threat_intelligence_analyst',
  VulnerabilityAnalyst = 'vulnerability_analyst'
}

export enum DeploymentRequestOrdering {
  CancellationDate = 'cancellation_date',
  CancellationReason = 'cancellation_reason',
  CancellationUserEmail = 'cancellation_user_email',
  EndDate = 'end_date',
  HubStatus = 'hub_status',
  Ordering = 'ordering',
  OrganizationName = 'organization_name',
  Region = 'region',
  RequestDate = 'request_date',
  RequesterEmail = 'requester_email',
  StartDate = 'start_date'
}

export enum DeploymentRequestPlatformRegion {
  ApacAu = 'apac_au',
  ApacSg = 'apac_sg',
  EuWest = 'eu_west',
  UsEast = 'us_east'
}

export enum DeploymentRequestPlatformState {
  Active = 'active',
  Provisioning = 'provisioning',
  Removed = 'removed',
  Removing = 'removing',
  Unprovisioned = 'unprovisioned'
}

export enum DeploymentRequestSource {
  OpenaevDemo = 'openaev_demo',
  OpenctiDemo = 'opencti_demo',
  Xtmhub = 'xtmhub'
}

export enum DeploymentRequestUseCase {
  AttackSimulation = 'attack_simulation',
  CentralizingKnowledge = 'centralizing_knowledge',
  CrisisSimulation = 'crisis_simulation',
  DetectionEngineering = 'detection_engineering',
  HostingThreatCommunity = 'hosting_threat_community',
  IncidentResponse = 'incident_response',
  OaevAtomicTesting = 'oaev_atomic_testing',
  OaevAttackSimulation = 'oaev_attack_simulation',
  OaevCtemFramework = 'oaev_ctem_framework',
  OaevOpenctiCoverage = 'oaev_opencti_coverage',
  OaevPenetrationTesting = 'oaev_penetration_testing',
  OaevPlatformValidation = 'oaev_platform_validation',
  OaevPurpleTeam = 'oaev_purple_team',
  OaevTabletopExercise = 'oaev_tabletop_exercise',
  SecurityStack = 'security_stack',
  SharingKnowledge = 'sharing_knowledge',
  StrategicReporting = 'strategic_reporting',
  TechnicalReporting = 'technical_reporting',
  ThreatHunting = 'threat_hunting',
  ThreatProfilingCti = 'threat_profiling_cti',
  ThreatProfilingFaml = 'threat_profiling_faml',
  ThreatProfilingFimi = 'threat_profiling_fimi',
  ThreatProfilingLeo = 'threat_profiling_leo',
  VulnerabilityManagement = 'vulnerability_management'
}

export type Document = {
  active: Scalars['Boolean']['output'];
  children_documents?: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  file_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug?: Maybe<Scalars['String']['output']>;
  subscription?: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
};

export type DocumentConnection = {
  __typename?: 'DocumentConnection';
  edges: Array<DocumentEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type DocumentEdge = {
  __typename?: 'DocumentEdge';
  cursor: Scalars['String']['output'];
  node: Document;
};

export enum DocumentImageType {
  Image = 'image',
  Logo = 'logo'
}

export type DocumentMetadata = {
  key: DocumentMetadataKeyCode;
  value: Scalars['String']['input'];
};

export enum DocumentMetadataKeyCode {
  AdditionalProperties = 'additional_properties',
  BlogpostUrl = 'blogpost_url',
  ConfigSchema = 'config_schema',
  Contact = 'contact',
  ContainerImage = 'container_image',
  DatasheetUrl = 'datasheet_url',
  DemoUrl = 'demo_url',
  EntityTypes = 'entity_types',
  FeedUrl = 'feed_url',
  GithubUrl = 'github_url',
  ImageName = 'image_name',
  ImageType = 'image_type',
  IntegrationType = 'integration_type',
  LastVerifiedDate = 'last_verified_date',
  LicenseType = 'license_type',
  ManagerSupported = 'manager_supported',
  ManifestFragmentId = 'manifest_fragment_id',
  MinimumDeployableVersion = 'minimum_deployable_version',
  MinimumDeployableVersionPadded = 'minimum_deployable_version_padded',
  PlaybookSupported = 'playbook_supported',
  ProductVersion = 'product_version',
  SolutionCategories = 'solution_categories',
  SourceCode = 'source_code',
  SubscriptionLink = 'subscription_link',
  VendorUrl = 'vendor_url',
  Verified = 'verified',
  VersionPadded = 'version_padded'
}

export enum DocumentOrdering {
  CreatedAt = 'created_at',
  Description = 'description',
  DownloadNumber = 'download_number',
  FileName = 'file_name',
  Name = 'name',
  UpdatedAt = 'updated_at'
}

export enum DocumentSourceType {
  External = 'external',
  Internal = 'internal'
}

export type EditMeUserInput = {
  country?: InputMaybe<Scalars['String']['input']>;
  first_name?: InputMaybe<Scalars['String']['input']>;
  last_name?: InputMaybe<Scalars['String']['input']>;
  selected_language?: InputMaybe<Scalars['String']['input']>;
};

export type EditSeoServiceInstanceInput = {
  meta_description: Scalars['String']['input'];
  meta_title: Scalars['String']['input'];
};

export type EditSolutionCategoryInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  product?: InputMaybe<Array<FiligranProduct>>;
};

export type EditUseCaseInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  product?: InputMaybe<Array<FiligranProduct>>;
};

export type EditUserCapabilitiesInput = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>;
};

export enum EditionType {
  CommunityEdition = 'community_edition',
  EnterpriseEdition = 'enterprise_edition',
  PartialEe = 'partial_ee'
}

export type Epic = Node & {
  __typename?: 'Epic';
  active: Scalars['Boolean']['output'];
  created_at: Scalars['Date']['output'];
  description: Scalars['String']['output'];
  document?: Maybe<Document>;
  document_id?: Maybe<Scalars['DocumentId']['output']>;
  edition_type: EditionType;
  epic_type: EpicType;
  id: Scalars['ID']['output'];
  product: FiligranProduct;
  short_description: Scalars['String']['output'];
  timeline: Timeline;
  title: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader_id: Scalars['String']['output'];
};

export type EpicConnection = {
  __typename?: 'EpicConnection';
  edges: Array<EpicEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type EpicCountPerTimeline = {
  __typename?: 'EpicCountPerTimeline';
  count: Scalars['Int']['output'];
  timeline: Timeline;
};

export type EpicEdge = {
  __typename?: 'EpicEdge';
  cursor: Scalars['String']['output'];
  node: Epic;
};

export enum EpicOrdering {
  Title = 'title'
}

export enum EpicType {
  Integration = 'integration',
  Other = 'other'
}

export enum FeatureFlag {
  DecouplingConnectors = 'DECOUPLING_CONNECTORS',
  Dummy = 'DUMMY',
  XtmPlatformTrial = 'XTM_PLATFORM_TRIAL'
}

export enum FiligranProduct {
  Openaev = 'openaev',
  Opencti = 'opencti',
  Xtmhub = 'xtmhub',
  Xtmone = 'xtmone'
}

export type Filter = {
  key: FilterKey;
  value: Array<Scalars['String']['input']>;
};

export enum FilterKey {
  EntityType = 'entity_type',
  FeedUrl = 'feed_url',
  IntegrationType = 'integration_type',
  Label = 'label',
  LicenseType = 'license_type',
  ManagerSupported = 'manager_supported',
  OrganizationId = 'organization_id',
  PersonalSpace = 'personal_space',
  ProductVersion = 'product_version',
  Slug = 'slug',
  SolutionCategory = 'solution_category',
  Verified = 'verified'
}

export type GenericServiceCapability = Node & {
  __typename?: 'GenericServiceCapability';
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type Integration = {
  active: Scalars['Boolean']['output'];
  blogpost_url?: Maybe<Scalars['String']['output']>;
  children_documents?: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url?: Maybe<Scalars['String']['output']>;
  demo_url?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  file_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type?: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  remover_id?: Maybe<Scalars['ID']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories?: Maybe<Array<SolutionCategory>>;
  subscription?: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
};

export type IntegrationHack = Document & Integration & Node & {
  __typename?: 'IntegrationHack';
  active: Scalars['Boolean']['output'];
  blogpost_url?: Maybe<Scalars['String']['output']>;
  children_documents?: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url?: Maybe<Scalars['String']['output']>;
  demo_url?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  file_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type?: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  remover_id?: Maybe<Scalars['ID']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories?: Maybe<Array<SolutionCategory>>;
  subscription?: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
};

export enum IntegrationType {
  Connector = 'connector',
  CsvFeed = 'csv_feed',
  RssFeed = 'rss_feed',
  Stream = 'stream',
  TaxiiFeed = 'taxii_feed',
  ThirdPartyIntegration = 'third_party_integration'
}

export type IsPlatformRegisteredInput = {
  platformId: Scalars['String']['input'];
  tenantId?: InputMaybe<Scalars['String']['input']>;
};

export type IsPlatformRegisteredOrganization = Node & {
  __typename?: 'IsPlatformRegisteredOrganization';
  id: Scalars['ID']['output'];
};

export type IsPlatformRegisteredResponse = {
  __typename?: 'IsPlatformRegisteredResponse';
  organization?: Maybe<IsPlatformRegisteredOrganization>;
  platformTitle?: Maybe<Scalars['String']['output']>;
  status: PlatformRegistrationStatus;
};

export type LastDeployedOverview = {
  __typename?: 'LastDeployedOverview';
  resources: Array<DeployedResource>;
};

export enum LicenseType {
  Commercial = 'Commercial',
  Free = 'Free'
}

export type LogicalFilterInput = {
  children?: InputMaybe<Array<LogicalFilterInput>>;
  leaf?: InputMaybe<Filter>;
  operator?: InputMaybe<LogicalOperator>;
};

export enum LogicalOperator {
  And = 'AND',
  Or = 'OR'
}

export type ManifestFragmentInput = {
  additional_properties: Scalars['JSON']['input'];
  config_schema: Scalars['JSON']['input'];
  contact?: InputMaybe<Scalars['String']['input']>;
  description: Scalars['String']['input'];
  id: Scalars['String']['input'];
  image_name: Scalars['String']['input'];
  image_type: Scalars['String']['input'];
  integration_type: Scalars['String']['input'];
  last_verified_date?: InputMaybe<Scalars['String']['input']>;
  license_type?: InputMaybe<LicenseType>;
  logo: Scalars['String']['input'];
  manager_supported: Scalars['Boolean']['input'];
  min_version: Scalars['String']['input'];
  platform: Scalars['String']['input'];
  short_description: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  solution_categories: Array<Scalars['String']['input']>;
  source_code: Scalars['String']['input'];
  subscription_link?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  use_cases: Array<Scalars['String']['input']>;
  verified?: InputMaybe<Scalars['Boolean']['input']>;
  version: Scalars['String']['input'];
};

export enum ManifestType {
  Connector = 'connector'
}

export type MeUserSubscription = {
  __typename?: 'MeUserSubscription';
  delete?: Maybe<User>;
  edit?: Maybe<User>;
};

export type MergeEvent = Node & {
  __typename?: 'MergeEvent';
  from: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  target: Scalars['ID']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptPendingUserInOrganization?: Maybe<User>;
  addCapabilitiesToUserServices?: Maybe<Array<Maybe<UserService>>>;
  addOrganization?: Maybe<Organization>;
  addServicePicture?: Maybe<ServiceInstance>;
  addSolutionCategory: SolutionCategory;
  addSubscription?: Maybe<ServiceInstance>;
  addSubscriptionCapability: Array<SubscriptionModel>;
  addUseCase: UseCase;
  addUser?: Maybe<User>;
  addUserService?: Maybe<Array<Maybe<UserService>>>;
  addUsersToBundleGroups: Array<BundleUserServiceGroup>;
  adminAddUser?: Maybe<User>;
  adminCancelDeploymentRequest?: Maybe<DeploymentRequest>;
  adminEditUser: User;
  autoRegisterPlatform: Success;
  bulkAcceptPendingUserInOrganization?: Maybe<Success>;
  bulkRemovePendingUserFromOrganization?: Maybe<Success>;
  cancelDeploymentRequest?: Maybe<DeploymentRequest>;
  changeSelectedOrganization?: Maybe<User>;
  consumeProvisionedNewsFeedItems: ConsumeProvisionedNewsFeedItemsResponse;
  contactUs: Success;
  createCompetitor: Competitor;
  createDeploymentRequest: DeploymentRequest;
  createDocument: Document;
  createEpic: Epic;
  createSubscriptions: Array<SubscriptionModel>;
  createVotableFeature: VotableFeature;
  createVotingRound: VotingRound;
  deleteCompetitor: Competitor;
  deleteDocument: Document;
  deleteEpic?: Maybe<Epic>;
  deleteNewsFeedItem: Scalars['Boolean']['output'];
  deleteOrganization?: Maybe<Organization>;
  deleteSolutionCategory: SolutionCategory;
  deleteSubscriptions: Array<SubscriptionModel>;
  deleteUseCase: UseCase;
  deleteUser: User;
  deleteUserServices?: Maybe<Array<Maybe<UserService>>>;
  deleteVotableFeature: VotableFeature;
  deleteVotingRound: VotingRound;
  editMeUser: User;
  editOrganization?: Maybe<Organization>;
  editSeoServiceInstance: SeoServiceInstanceMetadata;
  editSolutionCategory: SolutionCategory;
  editUseCase: UseCase;
  editUserCapabilities: User;
  editUserService?: Maybe<UserService>;
  frontendErrorLog?: Maybe<Scalars['Boolean']['output']>;
  generateManifest: Success;
  incrementShareNumberDocument: Document;
  ingestManifestFragments: Success;
  login?: Maybe<User>;
  logout: Scalars['ID']['output'];
  newProductVersion: Success;
  refreshPlatformRegistrationConnectivityStatus: RefreshPlatformRegistrationConnectivityStatusResponse;
  refreshPlatformRegistrationConnectivityStatusAllTenants: RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse;
  refreshPlatformRegistrationConnectivityStatusSingleTenant: RefreshPlatformRegistrationConnectivityStatusResponse;
  refreshUserPlatformToken: RefreshUserPlatformTokenResponse;
  registerPlatform: RegistrationResponse;
  removePendingUserFromOrganization?: Maybe<User>;
  removeUserFromOrganization?: Maybe<User>;
  removeUsersFromBundleGroups: Array<Scalars['UserId']['output']>;
  reorderDeploymentRequestInQueue: Success;
  requestTransferPersonalSpace: Success;
  resetPassword: Success;
  sendTelemetryEvent?: Maybe<SendTelemetryMutation>;
  setVotingRoundStatus: Array<VotingRound>;
  transferPersonalSpace: Success;
  unregisterPlatform: Success;
  updateBundleUserGroups: Array<BundleUserServiceGroup>;
  updateCompetitor: Competitor;
  updateDeploymentQuotaCapacity: Success;
  updateDeploymentRequest: PlatformDeploymentRequest;
  updateDocument: Document;
  updateEpic: Epic;
  updatePlatformServiceMetadata?: Maybe<RegisteredPlatform>;
  updateServiceGroups: Array<ServiceGroup>;
  updateSubscription?: Maybe<SubscriptionModel>;
  updateVotableFeature: VotableFeature;
  updateVotingRound: VotingRound;
  uploadUserPicture: User;
  voteForFeature: Array<VotableFeature>;
};


export type MutationAcceptPendingUserInOrganizationArgs = {
  organization_id: Scalars['OrganizationId']['input'];
  user_id: Scalars['UserId']['input'];
};


export type MutationAddCapabilitiesToUserServicesArgs = {
  input: UserServicesAddCapabilitiesInput;
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type MutationAddOrganizationArgs = {
  input: OrganizationInput;
};


export type MutationAddServicePictureArgs = {
  document?: InputMaybe<Scalars['Upload']['input']>;
  isLogo: Scalars['Boolean']['input'];
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};


export type MutationAddSolutionCategoryArgs = {
  input: AddSolutionCategoryInput;
};


export type MutationAddSubscriptionArgs = {
  service_instance_id?: InputMaybe<Scalars['ServiceInstanceId']['input']>;
};


export type MutationAddSubscriptionCapabilityArgs = {
  input: AddSubscriptionCapabilityInput;
};


export type MutationAddUseCaseArgs = {
  input: AddUseCaseInput;
};


export type MutationAddUserArgs = {
  input: AddUserInput;
};


export type MutationAddUserServiceArgs = {
  input: UserServiceAddInput;
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type MutationAddUsersToBundleGroupsArgs = {
  input: AddUsersToBundleGroupsInput;
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};


export type MutationAdminAddUserArgs = {
  input: AdminAddUserInput;
};


export type MutationAdminCancelDeploymentRequestArgs = {
  deploymentRequestId: Scalars['DeploymentRequestId']['input'];
};


export type MutationAdminEditUserArgs = {
  id: Scalars['ID']['input'];
  input: AdminEditUserInput;
};


export type MutationAutoRegisterPlatformArgs = {
  input?: InputMaybe<AutoRegisterPlatformInput>;
  platform?: InputMaybe<PlatformInput>;
};


export type MutationBulkAcceptPendingUserInOrganizationArgs = {
  input: BulkPendingUserFromOrganizationInput;
};


export type MutationBulkRemovePendingUserFromOrganizationArgs = {
  input: BulkPendingUserFromOrganizationInput;
};


export type MutationCancelDeploymentRequestArgs = {
  cancellationReason?: InputMaybe<Scalars['String']['input']>;
  deploymentRequestId: Scalars['DeploymentRequestId']['input'];
};


export type MutationChangeSelectedOrganizationArgs = {
  organization_id: Scalars['OrganizationId']['input'];
};


export type MutationContactUsArgs = {
  deploymentRequestType?: InputMaybe<DeploymentRequestDeploymentType>;
  message?: InputMaybe<Scalars['String']['input']>;
  platformId?: InputMaybe<Scalars['ID']['input']>;
  platformIdentifier?: InputMaybe<PlatformIdentifier>;
};


export type MutationCreateCompetitorArgs = {
  input: CreateCompetitorInput;
};


export type MutationCreateDeploymentRequestArgs = {
  input: CreateDeploymentRequestInput;
};


export type MutationCreateDocumentArgs = {
  images?: InputMaybe<Array<Scalars['Upload']['input']>>;
  input: CreateDocumentInput;
  logo?: InputMaybe<Scalars['Upload']['input']>;
  metadata: Array<DocumentMetadata>;
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
  sourceDocument?: InputMaybe<Scalars['Upload']['input']>;
};


export type MutationCreateEpicArgs = {
  document?: InputMaybe<Array<Scalars['Upload']['input']>>;
  input: CreateEpicInput;
};


export type MutationCreateSubscriptionsArgs = {
  input: CreateSubscriptionsInput;
};


export type MutationCreateVotableFeatureArgs = {
  document?: InputMaybe<Array<Scalars['Upload']['input']>>;
  input: CreateVotableFeatureInput;
};


export type MutationCreateVotingRoundArgs = {
  input: CreateVotingRoundInput;
};


export type MutationDeleteCompetitorArgs = {
  id: Scalars['CompetitorId']['input'];
};


export type MutationDeleteDocumentArgs = {
  documentId: Scalars['DocumentId']['input'];
  forceDelete?: InputMaybe<Scalars['Boolean']['input']>;
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type MutationDeleteEpicArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteNewsFeedItemArgs = {
  id: Scalars['NewsFeedItemId']['input'];
};


export type MutationDeleteOrganizationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSolutionCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSubscriptionsArgs = {
  subscription_ids: Array<Scalars['SubscriptionId']['input']>;
};


export type MutationDeleteUseCaseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserServicesArgs = {
  input: UserServicesDeleteInput;
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type MutationDeleteVotableFeatureArgs = {
  id: Scalars['VotableFeatureId']['input'];
};


export type MutationDeleteVotingRoundArgs = {
  id: Scalars['VotingRoundId']['input'];
};


export type MutationEditMeUserArgs = {
  input: EditMeUserInput;
};


export type MutationEditOrganizationArgs = {
  id: Scalars['ID']['input'];
  input: OrganizationInput;
};


export type MutationEditSeoServiceInstanceArgs = {
  input: EditSeoServiceInstanceInput;
  language: SeoServiceInstanceLanguage;
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type MutationEditSolutionCategoryArgs = {
  id: Scalars['ID']['input'];
  input: EditSolutionCategoryInput;
};


export type MutationEditUseCaseArgs = {
  id: Scalars['ID']['input'];
  input: EditUseCaseInput;
};


export type MutationEditUserCapabilitiesArgs = {
  id: Scalars['ID']['input'];
  input: EditUserCapabilitiesInput;
};


export type MutationEditUserServiceArgs = {
  input: UserServiceEditInput;
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type MutationFrontendErrorLogArgs = {
  codeStack?: InputMaybe<Scalars['String']['input']>;
  componentStack?: InputMaybe<Scalars['String']['input']>;
  message: Scalars['String']['input'];
};


export type MutationGenerateManifestArgs = {
  product: PlatformIdentifier;
  type: ManifestType;
  version: Scalars['String']['input'];
};


export type MutationIncrementShareNumberDocumentArgs = {
  documentId: Scalars['DocumentId']['input'];
};


export type MutationIngestManifestFragmentsArgs = {
  manifestFragments: Array<ManifestFragmentInput>;
};


export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  password?: InputMaybe<Scalars['String']['input']>;
};


export type MutationNewProductVersionArgs = {
  product: PlatformIdentifier;
  version: Scalars['String']['input'];
};


export type MutationRefreshPlatformRegistrationConnectivityStatusArgs = {
  input: RefreshPlatformRegistrationConnectivityStatusInput;
};


export type MutationRefreshPlatformRegistrationConnectivityStatusAllTenantsArgs = {
  input: RefreshPlatformRegistrationConnectivityStatusAllTenantsInput;
};


export type MutationRefreshPlatformRegistrationConnectivityStatusSingleTenantArgs = {
  input: RefreshPlatformRegistrationConnectivityStatusSingleTenantInput;
};


export type MutationRegisterPlatformArgs = {
  input: RegisterPlatformInput;
};


export type MutationRemovePendingUserFromOrganizationArgs = {
  organization_id: Scalars['OrganizationId']['input'];
  user_id: Scalars['UserId']['input'];
};


export type MutationRemoveUserFromOrganizationArgs = {
  organization_id: Scalars['OrganizationId']['input'];
  user_id: Scalars['UserId']['input'];
};


export type MutationRemoveUsersFromBundleGroupsArgs = {
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
  userIds: Array<Scalars['UserId']['input']>;
};


export type MutationReorderDeploymentRequestInQueueArgs = {
  input: ReorderDeploymentRequestInQueueInput;
};


export type MutationRequestTransferPersonalSpaceArgs = {
  new_email: Scalars['String']['input'];
};


export type MutationSetVotingRoundStatusArgs = {
  id: Scalars['VotingRoundId']['input'];
  status: VotingRoundStatus;
};


export type MutationTransferPersonalSpaceArgs = {
  requestId: Scalars['ID']['input'];
};


export type MutationUnregisterPlatformArgs = {
  input: UnregisterPlatformInput;
};


export type MutationUpdateBundleUserGroupsArgs = {
  input: UpdateBundleUserGroupsInput;
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};


export type MutationUpdateCompetitorArgs = {
  input: UpdateCompetitorInput;
};


export type MutationUpdateDeploymentQuotaCapacityArgs = {
  input: UpdateDeploymentQuotaCapacityInput;
};


export type MutationUpdateDeploymentRequestArgs = {
  input: UpdateDeploymentRequestInput;
};


export type MutationUpdateDocumentArgs = {
  documentId: Scalars['DocumentId']['input'];
  existingImageIds?: InputMaybe<Array<Scalars['DocumentId']['input']>>;
  images?: InputMaybe<Array<Scalars['Upload']['input']>>;
  input: UpdateDocumentInput;
  logo?: InputMaybe<Scalars['Upload']['input']>;
  metadata: Array<DocumentMetadata>;
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
  sourceDocument?: InputMaybe<Scalars['Upload']['input']>;
};


export type MutationUpdateEpicArgs = {
  document?: InputMaybe<Array<Scalars['Upload']['input']>>;
  id: Scalars['ID']['input'];
  input: UpdateEpicInput;
};


export type MutationUpdatePlatformServiceMetadataArgs = {
  document?: InputMaybe<Scalars['Upload']['input']>;
  input: UpdatePlatformServiceMetadataInput;
};


export type MutationUpdateServiceGroupsArgs = {
  input: UpdateServiceGroupsInput;
};


export type MutationUpdateSubscriptionArgs = {
  input: UpdateSubscriptionInput;
  subscription_id: Scalars['SubscriptionId']['input'];
};


export type MutationUpdateVotableFeatureArgs = {
  document?: InputMaybe<Array<Scalars['Upload']['input']>>;
  id: Scalars['VotableFeatureId']['input'];
  input: UpdateVotableFeatureInput;
};


export type MutationUpdateVotingRoundArgs = {
  id: Scalars['VotingRoundId']['input'];
  input: UpdateVotingRoundInput;
};


export type MutationUploadUserPictureArgs = {
  document: Scalars['Upload']['input'];
};


export type MutationVoteForFeatureArgs = {
  feature_id: Scalars['VotableFeatureId']['input'];
};

export type NewsFeedItem = Node & {
  __typename?: 'NewsFeedItem';
  creation_date: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  is_deleted: Scalars['Boolean']['output'];
  metadata: Array<NewsFeedItemMetadata>;
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  type: NewsFeedItemType;
};

export type NewsFeedItemConnection = {
  __typename?: 'NewsFeedItemConnection';
  edges: Array<NewsFeedItemEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type NewsFeedItemEdge = {
  __typename?: 'NewsFeedItemEdge';
  cursor: Scalars['String']['output'];
  node: NewsFeedItem;
};

export type NewsFeedItemMetadata = {
  __typename?: 'NewsFeedItemMetadata';
  key: NewsFeedItemMetadataKey;
  value?: Maybe<Scalars['String']['output']>;
};

export enum NewsFeedItemMetadataKey {
  DocumentId = 'document_id',
  UrlPath = 'url_path'
}

export enum NewsFeedItemType {
  ResourceCustomDashboard = 'RESOURCE_CUSTOM_DASHBOARD',
  ResourceCustomView = 'RESOURCE_CUSTOM_VIEW',
  ResourcePlaybook = 'RESOURCE_PLAYBOOK'
}

export type Node = {
  id: Scalars['ID']['output'];
};

export type OneClickDeployInput = {
  platform_identifier: PlatformIdentifier;
  platform_service_instance_id: Scalars['ID']['input'];
  resource_id: Scalars['DocumentId']['input'];
  resource_title: Scalars['String']['input'];
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};

export type OpenAevScenario = Document & Node & {
  __typename?: 'OpenAEVScenario';
  active: Scalars['Boolean']['output'];
  children_documents?: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  file_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  product_version?: Maybe<Scalars['String']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  subscription?: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
};

export type OpenCtiPlatformRegistrationStatusInput = {
  platformId: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type OpenCtiPlatformRegistrationStatusResponse = {
  __typename?: 'OpenCTIPlatformRegistrationStatusResponse';
  status: PlatformRegistrationConnectivityStatus;
};

export type OpenCtiPlaybook = Document & Node & {
  __typename?: 'OpenCTIPlaybook';
  active: Scalars['Boolean']['output'];
  children_documents?: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  file_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  product_version?: Maybe<Scalars['String']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  subscription?: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
};

export enum OrderingMode {
  Asc = 'asc',
  Desc = 'desc'
}

export type Organization = Node & {
  __typename?: 'Organization';
  capabilityUser?: Maybe<Array<Maybe<Capability>>>;
  domains?: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  personal_space: Scalars['Boolean']['output'];
};

export type OrganizationCapabilities = Node & {
  __typename?: 'OrganizationCapabilities';
  capabilities?: Maybe<Array<OrganizationCapability>>;
  id: Scalars['ID']['output'];
  organization: Organization;
};

export type OrganizationCapabilitiesInput = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>;
  organization_id: Scalars['OrganizationId']['input'];
};

export enum OrganizationCapability {
  AdministrateOrganization = 'ADMINISTRATE_ORGANIZATION',
  ManageAccess = 'MANAGE_ACCESS',
  ManagePlatformRegistration = 'MANAGE_PLATFORM_REGISTRATION',
  ManageSubscription = 'MANAGE_SUBSCRIPTION'
}

export type OrganizationConnection = {
  __typename?: 'OrganizationConnection';
  edges: Array<OrganizationEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type OrganizationEdge = {
  __typename?: 'OrganizationEdge';
  cursor: Scalars['String']['output'];
  node: Organization;
};

export type OrganizationInput = {
  domains?: InputMaybe<Array<Scalars['String']['input']>>;
  name: Scalars['String']['input'];
};

export enum OrganizationOrdering {
  Name = 'name'
}

export type OrganizationRef = Node & {
  __typename?: 'OrganizationRef';
  id: Scalars['ID']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export enum PlatformConfigurationStatus {
  Active = 'active',
  Inactive = 'inactive'
}

export enum PlatformContract {
  Ce = 'CE',
  Ee = 'EE',
  Trial = 'trial'
}

export type PlatformDeploymentRequest = {
  __typename?: 'PlatformDeploymentRequest';
  activity_sector?: Maybe<DeploymentRequestActivitySector>;
  actual_state?: Maybe<DeploymentRequestPlatformState>;
  end_date?: Maybe<Scalars['Date']['output']>;
  failure_reason?: Maybe<Scalars['String']['output']>;
  hub_status: DeploymentRequestHubStatus;
  id: Scalars['ID']['output'];
  job_title?: Maybe<DeploymentRequestJobTitle>;
  ordering: Scalars['Int']['output'];
  organization_domains?: Maybe<Array<Scalars['String']['output']>>;
  organization_name: Scalars['String']['output'];
  parent_id?: Maybe<Scalars['String']['output']>;
  platform_id?: Maybe<Scalars['String']['output']>;
  platform_identifier?: Maybe<PlatformIdentifier>;
  platform_token: Scalars['String']['output'];
  platform_url?: Maybe<Scalars['String']['output']>;
  region: DeploymentRequestPlatformRegion;
  requester_email: Scalars['String']['output'];
  requester_first_name?: Maybe<Scalars['String']['output']>;
  requester_last_name?: Maybe<Scalars['String']['output']>;
  start_date?: Maybe<Scalars['Date']['output']>;
  target_state?: Maybe<DeploymentRequestPlatformState>;
  type: DeploymentRequestDeploymentType;
  url?: Maybe<Scalars['String']['output']>;
  use_case?: Maybe<DeploymentRequestUseCase>;
};

export type PlatformDeploymentRequestConnection = {
  __typename?: 'PlatformDeploymentRequestConnection';
  edges: Array<PlatformDeploymentRequestEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type PlatformDeploymentRequestEdge = {
  __typename?: 'PlatformDeploymentRequestEdge';
  cursor: Scalars['String']['output'];
  node: PlatformDeploymentRequest;
};

export enum PlatformIdentifier {
  Openaev = 'openaev',
  Opencti = 'opencti',
  Xtmone = 'xtmone'
}

export type PlatformInput = {
  contract: PlatformContract;
  id: Scalars['ID']['input'];
  tenantId?: InputMaybe<Scalars['String']['input']>;
  tenantName?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  url: Scalars['String']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};

export type PlatformProvider = {
  __typename?: 'PlatformProvider';
  name: Scalars['String']['output'];
  provider: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export enum PlatformRegistrationConnectivityStatus {
  Active = 'active',
  Inactive = 'inactive',
  NotFound = 'not_found'
}

export enum PlatformRegistrationStatus {
  NeverRegistered = 'never_registered',
  Registered = 'registered',
  Unregistered = 'unregistered'
}

export type PlatformTrialStatus = {
  __typename?: 'PlatformTrialStatus';
  end_date?: Maybe<Scalars['Date']['output']>;
  hub_status?: Maybe<DeploymentRequestHubStatus>;
  isBlacklisted: Scalars['Boolean']['output'];
  ongoingStandaloneTrials: Array<PlatformIdentifier>;
};

export enum PortalCapability {
  Bypass = 'BYPASS',
  GenerateManifest = 'GENERATE_MANIFEST',
  ManageConnectorsIngestions = 'MANAGE_CONNECTORS_INGESTIONS',
  ManageDeployment = 'MANAGE_DEPLOYMENT',
  ManageManifestIngestions = 'MANAGE_MANIFEST_INGESTIONS',
  ModifyCompetitors = 'MODIFY_COMPETITORS',
  ModifyServiceMetadata = 'MODIFY_SERVICE_METADATA',
  ModifyTrials = 'MODIFY_TRIALS',
  ModifyTrialsQuota = 'MODIFY_TRIALS_QUOTA',
  ReadTrials = 'READ_TRIALS'
}

export type ProductUseCaseInput = {
  platform_identifier: PlatformIdentifier;
  use_case: DeploymentRequestUseCase;
};

export type ProvisionedNewsFeedItem = Node & {
  __typename?: 'ProvisionedNewsFeedItem';
  creation_date: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  is_deleted: Scalars['Boolean']['output'];
  metadata: Array<NewsFeedItemMetadata>;
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  type: NewsFeedItemType;
};

export type Query = {
  __typename?: 'Query';
  bundleProducts: Array<PlatformIdentifier>;
  bundleUserServiceGroups: Array<BundleUserServiceGroup>;
  canUnregisterPlatform: CanUnregisterResponse;
  competitors: CompetitorConnection;
  countEpicsPerTimeline: Array<EpicCountPerTimeline>;
  /**
   * The round currently collecting votes on a service instance, if any.
   * Publicly readable, like the roadmap the round belongs to.
   */
  currentVotingRound?: Maybe<VotingRound>;
  deploymentRequests: PlatformDeploymentRequestConnection;
  deploymentRequestsAvailable: Array<DeploymentAvailability>;
  deploymentRequestsList: DeploymentRequestConnection;
  document?: Maybe<Document>;
  documentExists?: Maybe<Scalars['Boolean']['output']>;
  documents: DocumentConnection;
  epics?: Maybe<EpicConnection>;
  isPlatformRegistered: IsPlatformRegisteredResponse;
  lastDeployedOverview: LastDeployedOverview;
  me?: Maybe<User>;
  mostDeployedDocuments: Array<Document>;
  newestDocuments: Array<Document>;
  newsFeedItems: NewsFeedItemConnection;
  node?: Maybe<Node>;
  /** @deprecated Use `refreshPlatformRegistrationConnectivityStatus` instead. This field is no longer used in the OpenCTI platform due to refactoring and the addition of a version value in the endpoint. */
  openCTIPlatformRegistrationStatus: OpenCtiPlatformRegistrationStatusResponse;
  organization?: Maybe<Organization>;
  organizations: OrganizationConnection;
  pendingUsers: UserConnection;
  platformAssociatedOrganization?: Maybe<Organization>;
  platformTrialStatus: PlatformTrialStatus;
  publicDocumentBySlug?: Maybe<Document>;
  publicDocuments: DocumentConnection;
  publicDocumentsByServiceSlug: Array<Document>;
  registeredPlatform?: Maybe<RegisteredPlatform>;
  registeredPlatforms: Array<RegisteredPlatform>;
  registeredProductVersions: Array<RegisteredProductVersion>;
  seoServiceInstance: SeoServiceInstance;
  seoServiceInstanceMetadata: Array<SeoServiceInstanceMetadata>;
  seoServiceInstances: Array<SeoServiceInstance>;
  serviceGroups: Array<ServiceGroup>;
  serviceInstanceById?: Maybe<ServiceInstance>;
  serviceInstanceLinksByTags: Array<SeoServiceInstance>;
  serviceInstances: ServiceConnection;
  settings: Settings;
  solutionCategories?: Maybe<SolutionCategoryConnection>;
  subscriptionById?: Maybe<SubscriptionModel>;
  subscriptions: SubscriptionConnection;
  trialDeployments: TrialsDeployments;
  updateOpenCTIManifest: Success;
  useCases?: Maybe<UseCaseConnection>;
  userOrganizations: Array<Organization>;
  userServiceCapabilities: UserServiceCapabilitiesResponse;
  userServiceFromSubscription?: Maybe<UserServiceConnection>;
  users: UserConnection;
  usersWithCapabilitiesInOrganization: Array<User>;
  votingRound?: Maybe<VotingRound>;
  votingRoundResults: VotingRoundResults;
  votingRounds: Array<VotingRound>;
  xtmPlatformBundle?: Maybe<DeploymentRequest>;
  xtmonePlatformIntegrationStatus?: Maybe<XtmoneIntegrationStatus>;
};


export type QueryBundleProductsArgs = {
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};


export type QueryBundleUserServiceGroupsArgs = {
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};


export type QueryCanUnregisterPlatformArgs = {
  input: CanUnregisterPlatformInput;
};


export type QueryCompetitorsArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  first: Scalars['Int']['input'];
  orderBy: CompetitorOrdering;
  orderMode: OrderingMode;
};


export type QueryCurrentVotingRoundArgs = {
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type QueryDeploymentRequestsArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  filters?: InputMaybe<Array<DeploymentRequestFilter>>;
  first: Scalars['Int']['input'];
};


export type QueryDeploymentRequestsAvailableArgs = {
  platformIdentifier?: InputMaybe<PlatformIdentifier>;
};


export type QueryDeploymentRequestsListArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  filters?: InputMaybe<Array<DeploymentRequestFilter>>;
  first: Scalars['Int']['input'];
  orderBy: DeploymentRequestOrdering;
  orderMode: OrderingMode;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};


export type QueryDocumentArgs = {
  documentId: Scalars['DocumentId']['input'];
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};


export type QueryDocumentExistsArgs = {
  documentName?: InputMaybe<Scalars['String']['input']>;
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type QueryDocumentsArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  first: Scalars['Int']['input'];
  logicalFilters?: InputMaybe<LogicalFilterInput>;
  orderBy: DocumentOrdering;
  orderMode: OrderingMode;
  parentsOnly?: InputMaybe<Scalars['Boolean']['input']>;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};


export type QueryEpicsArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  first: Scalars['Int']['input'];
  orderBy: EpicOrdering;
  orderMode: OrderingMode;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};


export type QueryIsPlatformRegisteredArgs = {
  input: IsPlatformRegisteredInput;
};


export type QueryLastDeployedOverviewArgs = {
  limit: Scalars['Int']['input'];
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};


export type QueryMostDeployedDocumentsArgs = {
  limit: Scalars['Int']['input'];
  platformIdentifiers?: InputMaybe<Array<PlatformIdentifier>>;
};


export type QueryNewestDocumentsArgs = {
  limit: Scalars['Int']['input'];
  platformIdentifiers?: InputMaybe<Array<PlatformIdentifier>>;
};


export type QueryNewsFeedItemsArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  first: Scalars['Int']['input'];
};


export type QueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOpenCtiPlatformRegistrationStatusArgs = {
  input: OpenCtiPlatformRegistrationStatusInput;
};


export type QueryOrganizationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOrganizationsArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy: OrganizationOrdering;
  orderMode: OrderingMode;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPendingUsersArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  filters?: InputMaybe<Array<Filter>>;
  first: Scalars['Int']['input'];
  orderBy: UserOrdering;
  orderMode: OrderingMode;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPlatformAssociatedOrganizationArgs = {
  platformId: Scalars['String']['input'];
  tenantId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPlatformTrialStatusArgs = {
  organizationId: Scalars['OrganizationId']['input'];
};


export type QueryPublicDocumentBySlugArgs = {
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
  slug: Scalars['String']['input'];
};


export type QueryPublicDocumentsArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  first: Scalars['Int']['input'];
  logicalFilters?: InputMaybe<LogicalFilterInput>;
  orderBy: DocumentOrdering;
  orderMode: OrderingMode;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
  slug: Scalars['String']['input'];
};


export type QueryPublicDocumentsByServiceSlugArgs = {
  serviceInstanceSlug: Scalars['String']['input'];
};


export type QueryRegisteredPlatformArgs = {
  input: RegisteredPlatformInput;
};


export type QueryRegisteredPlatformsArgs = {
  input: RegisteredPlatformsInput;
};


export type QueryRegisteredProductVersionsArgs = {
  product: PlatformIdentifier;
};


export type QuerySeoServiceInstanceArgs = {
  slug: Scalars['String']['input'];
};


export type QuerySeoServiceInstanceMetadataArgs = {
  language?: InputMaybe<SeoServiceInstanceLanguage>;
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type QueryServiceGroupsArgs = {
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};


export type QueryServiceInstanceByIdArgs = {
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type QueryServiceInstanceLinksByTagsArgs = {
  tags: Array<ServiceInstanceTag>;
};


export type QueryServiceInstancesArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  filters?: InputMaybe<Array<ServiceInstanceFilter>>;
  first: Scalars['Int']['input'];
  includeInaccessible?: InputMaybe<Scalars['Boolean']['input']>;
  orderBy: ServiceInstanceOrdering;
  orderMode: OrderingMode;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySolutionCategoriesArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  first: Scalars['Int']['input'];
  orderBy: SolutionCategoryOrdering;
  orderMode: OrderingMode;
  product?: InputMaybe<FiligranProduct>;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySubscriptionByIdArgs = {
  subscription_id?: InputMaybe<Scalars['SubscriptionId']['input']>;
};


export type QuerySubscriptionsArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  filters?: InputMaybe<Array<SubscriptionFilter>>;
  first: Scalars['Int']['input'];
  orderBy: SubscriptionOrdering;
  orderMode: OrderingMode;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTrialDeploymentsArgs = {
  input: TrialDeploymentsInput;
};


export type QueryUpdateOpenCtiManifestArgs = {
  tag: Scalars['String']['input'];
};


export type QueryUseCasesArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  documentType?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
  orderBy: UseCaseOrdering;
  orderMode: OrderingMode;
  product?: InputMaybe<FiligranProduct>;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUserServiceCapabilitiesArgs = {
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type QueryUserServiceFromSubscriptionArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  first: Scalars['Int']['input'];
  orderBy: UserServiceOrdering;
  orderMode: OrderingMode;
  subscription_id: Scalars['SubscriptionId']['input'];
};


export type QueryUsersArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  filters?: InputMaybe<Array<Filter>>;
  first: Scalars['Int']['input'];
  orderBy: UserOrdering;
  orderMode: OrderingMode;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUsersWithCapabilitiesInOrganizationArgs = {
  input: UsersWithCapabilitiesInOrganizationInput;
};


export type QueryVotingRoundArgs = {
  id: Scalars['VotingRoundId']['input'];
};


export type QueryVotingRoundResultsArgs = {
  id: Scalars['VotingRoundId']['input'];
};


export type QueryVotingRoundsArgs = {
  service_instance_id?: InputMaybe<Scalars['ServiceInstanceId']['input']>;
};


export type QueryXtmonePlatformIntegrationStatusArgs = {
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};

export type RefreshPlatformRegistrationConnectivityStatusAllTenantsInput = {
  platformId: Scalars['String']['input'];
  platformIdentifier: PlatformIdentifier;
  platformVersion: Scalars['String']['input'];
  tenants: Array<TenantDetails>;
};

export type RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse = {
  __typename?: 'RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse';
  statuses: Array<TenantStatus>;
};

export type RefreshPlatformRegistrationConnectivityStatusInput = {
  platformId: Scalars['String']['input'];
  platformIdentifier?: InputMaybe<PlatformIdentifier>;
  platformVersion: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type RefreshPlatformRegistrationConnectivityStatusResponse = {
  __typename?: 'RefreshPlatformRegistrationConnectivityStatusResponse';
  status: PlatformRegistrationConnectivityStatus;
};

export type RefreshPlatformRegistrationConnectivityStatusSingleTenantInput = {
  platformId: Scalars['String']['input'];
  platformIdentifier: PlatformIdentifier;
  platformVersion: Scalars['String']['input'];
  tenantId: Scalars['String']['input'];
  tenantName: Scalars['String']['input'];
  token: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type RefreshUserPlatformTokenResponse = {
  __typename?: 'RefreshUserPlatformTokenResponse';
  token: Scalars['String']['output'];
};

export type RegisterPlatformInput = {
  identifier: PlatformIdentifier;
  organizationId: Scalars['ID']['input'];
  platform: PlatformInput;
};

export type RegisteredPlatform = Node & {
  __typename?: 'RegisteredPlatform';
  contract: PlatformContract;
  deployment_request?: Maybe<DeploymentRequest>;
  id: Scalars['ID']['output'];
  identifier: ServiceDefinitionIdentifier;
  illustration_document_id?: Maybe<Scalars['DocumentId']['output']>;
  last_connectivity_check?: Maybe<Scalars['Date']['output']>;
  myGroups?: Maybe<Array<ServiceGroup>>;
  platform_id: Scalars['String']['output'];
  status?: Maybe<PlatformConfigurationStatus>;
  subscription?: Maybe<SubscriptionModel>;
  tenant_id?: Maybe<Scalars['String']['output']>;
  tenant_name?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  url: Scalars['String']['output'];
  version?: Maybe<Scalars['String']['output']>;
};

export type RegisteredPlatformInput = {
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};

export type RegisteredPlatformsInput = {
  hasDeployedResources?: InputMaybe<Scalars['Boolean']['input']>;
  identifier?: InputMaybe<PlatformIdentifier>;
  onlyActive?: InputMaybe<Scalars['Boolean']['input']>;
  onlyTrial?: InputMaybe<Scalars['Boolean']['input']>;
};

export type RegisteredProductVersion = {
  __typename?: 'RegisteredProductVersion';
  created_at: Scalars['Date']['output'];
  product: PlatformIdentifier;
  version: Scalars['String']['output'];
};

export type RegistrationResponse = {
  __typename?: 'RegistrationResponse';
  token: Scalars['String']['output'];
};

export enum ReorderDeploymentRequestInQueueDirection {
  Top = 'top',
  Up = 'up'
}

export type ReorderDeploymentRequestInQueueInput = {
  direction: ReorderDeploymentRequestInQueueDirection;
  id: Scalars['DeploymentRequestId']['input'];
};

export type RolePortal = Node & {
  __typename?: 'RolePortal';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type RssFeed = Document & Integration & Node & {
  __typename?: 'RssFeed';
  active: Scalars['Boolean']['output'];
  blogpost_url?: Maybe<Scalars['String']['output']>;
  children_documents?: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url?: Maybe<Scalars['String']['output']>;
  demo_url?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  feed_url?: Maybe<Scalars['String']['output']>;
  file_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type?: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  remover_id?: Maybe<Scalars['ID']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories?: Maybe<Array<SolutionCategory>>;
  subscription?: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
};

export type SendTelemetryMutation = {
  __typename?: 'SendTelemetryMutation';
  oneClickDeploy?: Maybe<TelemetryResponse>;
};


export type SendTelemetryMutationOneClickDeployArgs = {
  input: OneClickDeployInput;
};

export type SeoServiceInstance = Node & {
  __typename?: 'SeoServiceInstance';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  illustration_document_id?: Maybe<Scalars['DocumentId']['output']>;
  links?: Maybe<Array<Maybe<ServiceLink>>>;
  logo_document_id?: Maybe<Scalars['DocumentId']['output']>;
  name: Scalars['String']['output'];
  service_definition: ServiceDefinition;
  slug?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<ServiceInstanceTag>>;
};

export enum SeoServiceInstanceLanguage {
  En = 'en',
  Fr = 'fr',
  Ja = 'ja'
}

export type SeoServiceInstanceMetadata = {
  __typename?: 'SeoServiceInstanceMetadata';
  language: SeoServiceInstanceLanguage;
  meta_description: Scalars['String']['output'];
  meta_title: Scalars['String']['output'];
  service_instance_id: Scalars['ServiceInstanceId']['output'];
};

export type ServiceCapability = Node & {
  __typename?: 'ServiceCapability';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  service_definition_id?: Maybe<Scalars['ID']['output']>;
};

export type ServiceConnection = {
  __typename?: 'ServiceConnection';
  edges: Array<ServiceInstanceEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ServiceDefinition = Node & {
  __typename?: 'ServiceDefinition';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  identifier: ServiceDefinitionIdentifier;
  name: Scalars['String']['output'];
  public?: Maybe<Scalars['Boolean']['output']>;
  service_capability?: Maybe<Array<Maybe<ServiceCapability>>>;
};

export enum ServiceDefinitionIdentifier {
  Link = 'link',
  OpenaevRegistration = 'openaev_registration',
  OpenaevScenarios = 'openaev_scenarios',
  OpenctiCustomDashboards = 'opencti_custom_dashboards',
  OpenctiCustomViews = 'opencti_custom_views',
  OpenctiIntegrations = 'opencti_integrations',
  OpenctiPlaybooks = 'opencti_playbooks',
  OpenctiRegistration = 'opencti_registration',
  Vault = 'vault',
  XtmPlatformBundle = 'xtm_platform_bundle',
  XtmPlatformRoadmap = 'xtm_platform_roadmap',
  XtmoneRegistration = 'xtmone_registration'
}

export type ServiceGroup = Node & {
  __typename?: 'ServiceGroup';
  id: Scalars['ID']['output'];
  name: ServiceGroupName;
  users?: Maybe<Array<User>>;
};

export enum ServiceGroupName {
  Admin = 'Admin',
  Analyst = 'Analyst',
  Manager = 'Manager',
  Observer = 'Observer',
  Reader = 'Reader',
  User = 'User'
}

export type ServiceInstance = Node & {
  __typename?: 'ServiceInstance';
  capabilities: Array<Maybe<Scalars['String']['output']>>;
  creation_status?: Maybe<ServiceInstanceCreationStatus>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  illustration_document_id?: Maybe<Scalars['DocumentId']['output']>;
  links?: Maybe<Array<Maybe<ServiceLink>>>;
  logo_document_id?: Maybe<Scalars['DocumentId']['output']>;
  name: Scalars['String']['output'];
  ordering: Scalars['Int']['output'];
  organization?: Maybe<Array<Maybe<Organization>>>;
  organization_subscribed?: Maybe<Scalars['Boolean']['output']>;
  public?: Maybe<Scalars['Boolean']['output']>;
  service_definition?: Maybe<ServiceDefinition>;
  slug?: Maybe<Scalars['String']['output']>;
  subscriptions?: Maybe<Array<Maybe<SubscriptionModel>>>;
  tags?: Maybe<Array<ServiceInstanceTag>>;
  user_joined?: Maybe<Scalars['Boolean']['output']>;
};

export enum ServiceInstanceCreationStatus {
  Created = 'CREATED',
  Disabled = 'DISABLED',
  Pending = 'PENDING',
  Ready = 'READY'
}

export type ServiceInstanceEdge = {
  __typename?: 'ServiceInstanceEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<ServiceInstance>;
};

export type ServiceInstanceFilter = {
  key?: InputMaybe<ServiceInstanceFilterKey>;
  value: Array<Scalars['String']['input']>;
};

export enum ServiceInstanceFilterKey {
  Id = 'id',
  Public = 'public',
  ServiceDefinitionIdentifier = 'service_definition_identifier',
  Tags = 'tags'
}

export enum ServiceInstanceOrdering {
  Description = 'description',
  Name = 'name',
  Ordering = 'ordering'
}

export type ServiceInstanceSubscription = {
  __typename?: 'ServiceInstanceSubscription';
  add?: Maybe<ServiceInstance>;
  delete?: Maybe<ServiceInstance>;
  edit?: Maybe<ServiceInstance>;
};

export enum ServiceInstanceTag {
  OpenAev = 'openAEV',
  OpenCti = 'openCTI',
  Others = 'others',
  Trial = 'trial',
  XtmOne = 'xtmOne'
}

export type ServiceLink = Node & {
  __typename?: 'ServiceLink';
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  service_instance_id?: Maybe<Scalars['ID']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export enum ServiceRestriction {
  Access = 'ACCESS',
  AccessUser = 'ACCESS_USER',
  Delete = 'DELETE',
  ManageAccess = 'MANAGE_ACCESS',
  Upload = 'UPLOAD',
  Upsert = 'UPSERT'
}

export type Settings = {
  __typename?: 'Settings';
  base_url_front: Scalars['String']['output'];
  environment: Scalars['String']['output'];
  platform_feature_flags: Array<FeatureFlag>;
  platform_providers: Array<PlatformProvider>;
};

export type ShareableResource = {
  __typename?: 'ShareableResource';
  active: Scalars['Boolean']['output'];
  created_at: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  file_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  image_type?: Maybe<DocumentImageType>;
  name?: Maybe<Scalars['String']['output']>;
  source_type: DocumentSourceType;
};

export type SolutionCategory = Node & {
  __typename?: 'SolutionCategory';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  product: Array<FiligranProduct>;
};

export type SolutionCategoryConnection = {
  __typename?: 'SolutionCategoryConnection';
  edges: Array<SolutionCategoryEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type SolutionCategoryEdge = {
  __typename?: 'SolutionCategoryEdge';
  cursor: Scalars['String']['output'];
  node: SolutionCategory;
};

export enum SolutionCategoryOrdering {
  Name = 'name'
}

export type Stream = Document & Integration & Node & {
  __typename?: 'Stream';
  active: Scalars['Boolean']['output'];
  blogpost_url?: Maybe<Scalars['String']['output']>;
  children_documents?: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url?: Maybe<Scalars['String']['output']>;
  demo_url?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  feed_url?: Maybe<Scalars['String']['output']>;
  file_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type?: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  remover_id?: Maybe<Scalars['ID']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories?: Maybe<Array<SolutionCategory>>;
  subscription?: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
};

export type SubscribedServiceInstanceConfiguration = {
  __typename?: 'SubscribedServiceInstanceConfiguration';
  platform_contract: PlatformContract;
  platform_id: Scalars['String']['output'];
  platform_title: Scalars['String']['output'];
  platform_url: Scalars['String']['output'];
  registerer_id: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  MeUser?: Maybe<MeUserSubscription>;
  ServiceInstance?: Maybe<ServiceInstanceSubscription>;
  User?: Maybe<UserSubscription>;
  UserPending?: Maybe<UserPendingSubscription>;
};


export type SubscriptionUserArgs = {
  organizationId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionUserPendingArgs = {
  organizationId: Scalars['ID']['input'];
};

export type SubscriptionCapability = Node & {
  __typename?: 'SubscriptionCapability';
  id: Scalars['ID']['output'];
  service_capability?: Maybe<ServiceCapability>;
};

export type SubscriptionConnection = {
  __typename?: 'SubscriptionConnection';
  edges: Array<SubscriptionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type SubscriptionEdge = {
  __typename?: 'SubscriptionEdge';
  cursor: Scalars['String']['output'];
  node: SubscriptionModel;
};

export type SubscriptionFilter = {
  key: SubscriptionFilterKey;
  value: Array<Scalars['String']['input']>;
};

export enum SubscriptionFilterKey {
  OrganizationId = 'organization_id',
  OrganizationName = 'organization_name',
  ServiceInstanceId = 'service_instance_id'
}

export type SubscriptionModel = Node & {
  __typename?: 'SubscriptionModel';
  end_date?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organization: Organization;
  organization_id: Scalars['OrganizationId']['output'];
  service_instance: ServiceInstance;
  service_instance_id: Scalars['ServiceInstanceId']['output'];
  service_url: Scalars['String']['output'];
  start_date?: Maybe<Scalars['Date']['output']>;
  subscription_capability?: Maybe<Array<Maybe<SubscriptionCapability>>>;
  user_service: Array<Maybe<UserService>>;
};

export enum SubscriptionOrdering {
  EndDate = 'end_date',
  OrganizationName = 'organization_name',
  ServiceDescription = 'service_description',
  ServiceName = 'service_name',
  ServiceProvider = 'service_provider',
  ServiceType = 'service_type',
  StartDate = 'start_date'
}

export type Success = {
  __typename?: 'Success';
  success: Scalars['Boolean']['output'];
};

export type TaxiiFeed = Document & Integration & Node & {
  __typename?: 'TaxiiFeed';
  active: Scalars['Boolean']['output'];
  blogpost_url?: Maybe<Scalars['String']['output']>;
  children_documents?: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url?: Maybe<Scalars['String']['output']>;
  demo_url?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  feed_url?: Maybe<Scalars['String']['output']>;
  file_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type?: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  remover_id?: Maybe<Scalars['ID']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories?: Maybe<Array<SolutionCategory>>;
  subscription?: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
};

export type TelemetryResponse = {
  __typename?: 'TelemetryResponse';
  message?: Maybe<Scalars['String']['output']>;
  result: Scalars['Boolean']['output'];
};

export type TenantDetails = {
  tenantId: Scalars['String']['input'];
  tenantName: Scalars['String']['input'];
  token: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type TenantStatus = {
  __typename?: 'TenantStatus';
  status: PlatformRegistrationConnectivityStatus;
  tenantId: Scalars['String']['output'];
};

export type ThirdPartyIntegration = Document & Integration & Node & {
  __typename?: 'ThirdPartyIntegration';
  active: Scalars['Boolean']['output'];
  blogpost_url?: Maybe<Scalars['String']['output']>;
  children_documents?: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url?: Maybe<Scalars['String']['output']>;
  demo_url?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  download_number?: Maybe<Scalars['Int']['output']>;
  file_name?: Maybe<Scalars['String']['output']>;
  github_url?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type?: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  product_version?: Maybe<Scalars['String']['output']>;
  remover_id?: Maybe<Scalars['ID']['output']>;
  service_instance?: Maybe<ServiceInstance>;
  service_instance_id?: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number?: Maybe<Scalars['Int']['output']>;
  short_description?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories?: Maybe<Array<SolutionCategory>>;
  subscription?: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  updater_id?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<User>;
  uploader_organization?: Maybe<Organization>;
  use_cases?: Maybe<Array<UseCase>>;
  vendor_url: Scalars['String']['output'];
};

export enum Timeline {
  Finished = 'finished',
  Next = 'next',
  Now = 'now',
  UnderConsideration = 'under_consideration'
}

export type TrialDeploymentsInput = {
  organizationId: Scalars['OrganizationId']['input'];
  platformIdentifiers?: InputMaybe<Array<PlatformIdentifier>>;
};

export type TrialsDeployments = {
  __typename?: 'TrialsDeployments';
  availableTrials: Array<PlatformIdentifier>;
  deployed: Array<DeployedPlatform>;
  isBlacklisted: Scalars['Boolean']['output'];
};

export type UnregisterPlatformInput = {
  identifier: PlatformIdentifier;
  platformId: Scalars['String']['input'];
  tenantId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateBundleUserGroupsInput = {
  roles: Array<UpdateBundleUserGroupsRoleInput>;
  userIds: Array<Scalars['UserId']['input']>;
};

export type UpdateBundleUserGroupsRoleInput = {
  product: PlatformIdentifier;
  role?: InputMaybe<ServiceGroupName>;
};

export type UpdateCompetitorInput = {
  domain?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['CompetitorId']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  tier?: InputMaybe<CompetitorTier>;
};

export type UpdateDeploymentQuotaCapacityInput = {
  newCapacity: Scalars['Int']['input'];
  platformIdentifier?: InputMaybe<PlatformIdentifier>;
  region: DeploymentRequestPlatformRegion;
};

export type UpdateDeploymentRequestInput = {
  actual_state?: InputMaybe<DeploymentRequestPlatformState>;
  end_date?: InputMaybe<Scalars['Date']['input']>;
  failure_reason?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['DeploymentRequestId']['input'];
  ordering?: InputMaybe<Scalars['Int']['input']>;
  platform_id?: InputMaybe<Scalars['String']['input']>;
  start_date?: InputMaybe<Scalars['Date']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateDocumentInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  entity_types?: InputMaybe<Array<Scalars['String']['input']>>;
  license_type?: InputMaybe<LicenseType>;
  name?: InputMaybe<Scalars['String']['input']>;
  short_description?: InputMaybe<Scalars['String']['input']>;
  solution_categories?: InputMaybe<Array<Scalars['SolutionCategoryId']['input']>>;
  uploader_id?: InputMaybe<Scalars['UserId']['input']>;
  uploader_organization_id?: InputMaybe<Scalars['OrganizationId']['input']>;
  use_cases?: InputMaybe<Array<Scalars['UseCaseId']['input']>>;
};

export type UpdateEpicInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  edition_type: EditionType;
  illustration_document?: InputMaybe<Scalars['Upload']['input']>;
  is_integration?: InputMaybe<Scalars['Boolean']['input']>;
  product?: InputMaybe<FiligranProduct>;
  short_description?: InputMaybe<Scalars['String']['input']>;
  timeline?: InputMaybe<Timeline>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePlatformServiceMetadataInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};

export type UpdateServiceGroupsInput = {
  groups: Array<UpdateServiceGroupsInputGroup>;
};

export type UpdateServiceGroupsInputGroup = {
  id: Scalars['ServiceGroupId']['input'];
  userIds: Array<Scalars['UserId']['input']>;
};

export type UpdateSubscriptionInput = {
  capability_ids?: InputMaybe<Array<Scalars['ServiceCapabilityId']['input']>>;
  end_date?: InputMaybe<Scalars['Date']['input']>;
  start_date?: InputMaybe<Scalars['Date']['input']>;
};

export type UpdateVotableFeatureInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** Send null to remove the current illustration. */
  illustration_document_id?: InputMaybe<Scalars['DocumentId']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  product?: InputMaybe<FiligranProduct>;
  short_description?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  use_case_ids?: InputMaybe<Array<Scalars['UseCaseId']['input']>>;
};

export type UpdateVotingRoundInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  theme?: InputMaybe<VotingRoundTheme>;
};

export type UseCase = Node & {
  __typename?: 'UseCase';
  color: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  product: Array<FiligranProduct>;
};

export type UseCaseConnection = {
  __typename?: 'UseCaseConnection';
  edges: Array<UseCaseEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type UseCaseEdge = {
  __typename?: 'UseCaseEdge';
  cursor: Scalars['String']['output'];
  node: UseCase;
};

export enum UseCaseOrdering {
  Color = 'color',
  Name = 'name'
}

export type User = Node & {
  __typename?: 'User';
  capabilities?: Maybe<Array<Capability>>;
  country?: Maybe<Scalars['String']['output']>;
  disabled?: Maybe<Scalars['Boolean']['output']>;
  email: Scalars['String']['output'];
  first_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  last_login?: Maybe<Scalars['Date']['output']>;
  last_name?: Maybe<Scalars['String']['output']>;
  organization_capabilities?: Maybe<Array<OrganizationCapabilities>>;
  organizations?: Maybe<Array<Organization>>;
  pending_organization_id?: Maybe<Scalars['OrganizationId']['output']>;
  picture?: Maybe<Scalars['String']['output']>;
  roles_portal?: Maybe<Array<RolePortal>>;
  selected_language?: Maybe<Scalars['String']['output']>;
  selected_org_capabilities?: Maybe<Array<OrganizationCapability>>;
  selected_organization_id?: Maybe<Scalars['OrganizationId']['output']>;
};

export type UserConnection = {
  __typename?: 'UserConnection';
  edges: Array<UserEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type UserEdge = {
  __typename?: 'UserEdge';
  cursor: Scalars['String']['output'];
  node: User;
};

export enum UserOrdering {
  Country = 'country',
  Disabled = 'disabled',
  Email = 'email',
  FirstName = 'first_name',
  LastLogin = 'last_login',
  LastName = 'last_name'
}

export type UserPendingSubscription = {
  __typename?: 'UserPendingSubscription';
  delete?: Maybe<User>;
  invalidate?: Maybe<OrganizationRef>;
};

export type UserPlatformGroup = {
  __typename?: 'UserPlatformGroup';
  name: ServiceGroupName;
  platformIdentifier: PlatformIdentifier;
};

export type UserService = Node & {
  __typename?: 'UserService';
  id: Scalars['ID']['output'];
  ordering?: Maybe<Scalars['Int']['output']>;
  subscription?: Maybe<SubscriptionModel>;
  subscription_id: Scalars['ID']['output'];
  user?: Maybe<User>;
  user_id: Scalars['ID']['output'];
  user_service_capability?: Maybe<Array<Maybe<UserServiceCapability>>>;
};

export type UserServiceAddInput = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>;
  email: Array<Scalars['String']['input']>;
  subscription_id: Scalars['SubscriptionId']['input'];
};

export type UserServiceAddYourselfInput = {
  email: Array<Scalars['String']['input']>;
  serviceInstanceId?: InputMaybe<Scalars['ServiceInstanceId']['input']>;
};

export type UserServiceCapabilitiesResponse = {
  __typename?: 'UserServiceCapabilitiesResponse';
  subscription_id?: Maybe<Scalars['SubscriptionId']['output']>;
  userServiceCapabilities: Array<UserServiceCapability>;
};

export type UserServiceCapability = Node & {
  __typename?: 'UserServiceCapability';
  generic_service_capability?: Maybe<GenericServiceCapability>;
  id: Scalars['ID']['output'];
  subscription_capability?: Maybe<SubscriptionCapability>;
  user_service_id: Scalars['ID']['output'];
};

export type UserServiceConnection = {
  __typename?: 'UserServiceConnection';
  edges: Array<UserServiceEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type UserServiceDeleted = Node & {
  __typename?: 'UserServiceDeleted';
  id: Scalars['ID']['output'];
  subscription_id: Scalars['ID']['output'];
  user_id: Scalars['ID']['output'];
};

export type UserServiceEdge = {
  __typename?: 'UserServiceEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<UserService>;
};

export type UserServiceEditInput = {
  capabilities: Array<Scalars['String']['input']>;
  userServiceId: Scalars['UserServiceId']['input'];
};

export enum UserServiceOrdering {
  Email = 'email',
  FirstName = 'first_name',
  LastName = 'last_name',
  Ordering = 'ordering',
  ServiceDescription = 'service_description',
  ServiceName = 'service_name',
  ServiceProvider = 'service_provider',
  ServiceType = 'service_type',
  SubscriptionStatus = 'subscription_status'
}

export type UserServicesAddCapabilitiesInput = {
  capabilities: Array<Scalars['String']['input']>;
  userServiceIds: Array<Scalars['UserServiceId']['input']>;
};

export type UserServicesDeleteInput = {
  userServiceIds: Array<Scalars['UserServiceId']['input']>;
};

export type UserSubscription = {
  __typename?: 'UserSubscription';
  add?: Maybe<User>;
  delete?: Maybe<User>;
  edit?: Maybe<User>;
  merge?: Maybe<MergeEvent>;
};

export type UsersWithCapabilitiesInOrganizationInput = {
  capabilities: Array<OrganizationCapability>;
  organizationId: Scalars['OrganizationId']['input'];
};

export type VotableFeature = Node & {
  __typename?: 'VotableFeature';
  active: Scalars['Boolean']['output'];
  created_at: Scalars['Date']['output'];
  description: Scalars['String']['output'];
  has_my_vote: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  illustration_document?: Maybe<Document>;
  illustration_document_id?: Maybe<Scalars['DocumentId']['output']>;
  position: Scalars['Int']['output'];
  product: FiligranProduct;
  short_description: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['Date']['output']>;
  use_cases: Array<UseCase>;
  voting_round_id: Scalars['VotingRoundId']['output'];
};

export type VotableFeatureResult = {
  __typename?: 'VotableFeatureResult';
  feature: VotableFeature;
  vote_count: Scalars['Int']['output'];
};

export type VotingRound = Node & {
  __typename?: 'VotingRound';
  closed_at?: Maybe<Scalars['Date']['output']>;
  created_at: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  feature_count: Scalars['Int']['output'];
  features: Array<VotableFeature>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  opened_at?: Maybe<Scalars['Date']['output']>;
  service_instance_id: Scalars['ServiceInstanceId']['output'];
  status: VotingRoundStatus;
  theme: VotingRoundTheme;
  updated_at?: Maybe<Scalars['Date']['output']>;
};

export type VotingRoundResults = {
  __typename?: 'VotingRoundResults';
  results: Array<VotableFeatureResult>;
  round: VotingRound;
  total_voters: Scalars['Int']['output'];
};

export enum VotingRoundStatus {
  Closed = 'closed',
  Draft = 'draft',
  Open = 'open'
}

/** Visual identity applied to the public banner and voting page of a round. */
export enum VotingRoundTheme {
  Default = 'default',
  Thread = 'thread'
}

export type XtmoneIntegrationStatus = {
  __typename?: 'XtmoneIntegrationStatus';
  last_checked_at?: Maybe<Scalars['String']['output']>;
  linked: Scalars['Boolean']['output'];
  openaev: XtmoneIntegrationStatusEntry;
  opencti: XtmoneIntegrationStatusEntry;
};

export type XtmoneIntegrationStatusEntry = {
  __typename?: 'XtmoneIntegrationStatusEntry';
  connected: Scalars['Boolean']['output'];
  last_checked_at?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;


/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Document: ( Connector ) | ( CsvFeed ) | ( CustomDashboard ) | ( CustomView ) | ( DefaultDocument ) | ( IntegrationHack ) | ( OpenAevScenario ) | ( OpenCtiPlaybook ) | ( RssFeed ) | ( Stream ) | ( TaxiiFeed ) | ( ThirdPartyIntegration );
  Integration: ( Connector ) | ( CsvFeed ) | ( IntegrationHack ) | ( RssFeed ) | ( Stream ) | ( TaxiiFeed ) | ( ThirdPartyIntegration );
  Node: ( Capability ) | ( Competitor ) | ( Connector ) | ( CsvFeed ) | ( CustomDashboard ) | ( CustomView ) | ( DefaultDocument ) | ( DeploymentRequest ) | ( Omit<Epic, 'document'> & { document?: Maybe<_RefType['Document']> } ) | ( GenericServiceCapability ) | ( IntegrationHack ) | ( IsPlatformRegisteredOrganization ) | ( MergeEvent ) | ( NewsFeedItem ) | ( OpenAevScenario ) | ( OpenCtiPlaybook ) | ( Organization ) | ( OrganizationCapabilities ) | ( OrganizationRef ) | ( ProvisionedNewsFeedItem ) | ( RegisteredPlatform ) | ( RolePortal ) | ( RssFeed ) | ( SeoServiceInstance ) | ( ServiceCapability ) | ( ServiceDefinition ) | ( ServiceGroup ) | ( ServiceInstance ) | ( ServiceLink ) | ( SolutionCategory ) | ( Stream ) | ( SubscriptionCapability ) | ( SubscriptionModel ) | ( TaxiiFeed ) | ( ThirdPartyIntegration ) | ( UseCase ) | ( User ) | ( UserService ) | ( UserServiceCapability ) | ( UserServiceDeleted ) | ( VotableFeatureModel ) | ( VotingRoundModel );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AddServiceInput: AddServiceInput;
  AddSolutionCategoryInput: AddSolutionCategoryInput;
  AddSubscriptionCapabilityInput: AddSubscriptionCapabilityInput;
  AddUseCaseInput: AddUseCaseInput;
  AddUserInput: AddUserInput;
  AddUsersToBundleGroupsInput: AddUsersToBundleGroupsInput;
  AdminAddUserInput: AdminAddUserInput;
  AdminEditUserInput: AdminEditUserInput;
  AutoRegisterPlatformInput: AutoRegisterPlatformInput;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BulkPendingUserFromOrganizationInput: BulkPendingUserFromOrganizationInput;
  BundleUserRoleAssignmentInput: BundleUserRoleAssignmentInput;
  BundleUserServiceGroup: ResolverTypeWrapper<BundleUserServiceGroup>;
  CanUnregisterPlatformInput: CanUnregisterPlatformInput;
  CanUnregisterResponse: ResolverTypeWrapper<CanUnregisterResponse>;
  Capability: ResolverTypeWrapper<Capability>;
  Competitor: ResolverTypeWrapper<Competitor>;
  CompetitorConnection: ResolverTypeWrapper<CompetitorConnection>;
  CompetitorEdge: ResolverTypeWrapper<CompetitorEdge>;
  CompetitorId: ResolverTypeWrapper<Scalars['CompetitorId']['output']>;
  CompetitorOrdering: CompetitorOrdering;
  CompetitorTier: CompetitorTier;
  Connector: ResolverTypeWrapper<Connector>;
  ConsumeProvisionedNewsFeedItemsResponse: ResolverTypeWrapper<ConsumeProvisionedNewsFeedItemsResponse>;
  CreateCompetitorInput: CreateCompetitorInput;
  CreateDeploymentRequestInput: CreateDeploymentRequestInput;
  CreateDocumentInput: CreateDocumentInput;
  CreateEpicInput: CreateEpicInput;
  CreateSubscriptionsInput: CreateSubscriptionsInput;
  CreateVotableFeatureInput: CreateVotableFeatureInput;
  CreateVotingRoundInput: CreateVotingRoundInput;
  CsvFeed: ResolverTypeWrapper<CsvFeed>;
  CustomDashboard: ResolverTypeWrapper<CustomDashboard>;
  CustomView: ResolverTypeWrapper<CustomView>;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DefaultDocument: ResolverTypeWrapper<DefaultDocument>;
  DeployedPlatform: ResolverTypeWrapper<DeployedPlatform>;
  DeployedResource: ResolverTypeWrapper<Omit<DeployedResource, 'document'> & { document: ResolversTypes['Document'] }>;
  DeploymentAvailability: ResolverTypeWrapper<DeploymentAvailability>;
  DeploymentRequest: ResolverTypeWrapper<DeploymentRequest>;
  DeploymentRequestActivitySector: DeploymentRequestActivitySector;
  DeploymentRequestConnection: ResolverTypeWrapper<DeploymentRequestConnection>;
  DeploymentRequestDeploymentType: DeploymentRequestDeploymentType;
  DeploymentRequestEdge: ResolverTypeWrapper<DeploymentRequestEdge>;
  DeploymentRequestFilter: DeploymentRequestFilter;
  DeploymentRequestFilterKey: DeploymentRequestFilterKey;
  DeploymentRequestHubStatus: DeploymentRequestHubStatus;
  DeploymentRequestId: ResolverTypeWrapper<Scalars['DeploymentRequestId']['output']>;
  DeploymentRequestJobTitle: DeploymentRequestJobTitle;
  DeploymentRequestOrdering: DeploymentRequestOrdering;
  DeploymentRequestPlatformRegion: DeploymentRequestPlatformRegion;
  DeploymentRequestPlatformState: DeploymentRequestPlatformState;
  DeploymentRequestSource: DeploymentRequestSource;
  DeploymentRequestUseCase: DeploymentRequestUseCase;
  Document: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Document']>;
  DocumentConnection: ResolverTypeWrapper<Omit<DocumentConnection, 'edges'> & { edges: Array<ResolversTypes['DocumentEdge']> }>;
  DocumentEdge: ResolverTypeWrapper<Omit<DocumentEdge, 'node'> & { node: ResolversTypes['Document'] }>;
  DocumentId: ResolverTypeWrapper<Scalars['DocumentId']['output']>;
  DocumentImageType: DocumentImageType;
  DocumentMetadata: DocumentMetadata;
  DocumentMetadataKeyCode: DocumentMetadataKeyCode;
  DocumentOrdering: DocumentOrdering;
  DocumentSourceType: DocumentSourceType;
  EditMeUserInput: EditMeUserInput;
  EditSeoServiceInstanceInput: EditSeoServiceInstanceInput;
  EditSolutionCategoryInput: EditSolutionCategoryInput;
  EditUseCaseInput: EditUseCaseInput;
  EditUserCapabilitiesInput: EditUserCapabilitiesInput;
  EditionType: EditionType;
  Epic: ResolverTypeWrapper<Omit<Epic, 'document'> & { document?: Maybe<ResolversTypes['Document']> }>;
  EpicConnection: ResolverTypeWrapper<Omit<EpicConnection, 'edges'> & { edges: Array<ResolversTypes['EpicEdge']> }>;
  EpicCountPerTimeline: ResolverTypeWrapper<EpicCountPerTimeline>;
  EpicEdge: ResolverTypeWrapper<Omit<EpicEdge, 'node'> & { node: ResolversTypes['Epic'] }>;
  EpicOrdering: EpicOrdering;
  EpicType: EpicType;
  FeatureFlag: FeatureFlag;
  FiligranProduct: FiligranProduct;
  Filter: Filter;
  FilterKey: FilterKey;
  GenericServiceCapability: ResolverTypeWrapper<GenericServiceCapability>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Integration: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Integration']>;
  IntegrationHack: ResolverTypeWrapper<IntegrationHack>;
  IntegrationType: IntegrationType;
  IsPlatformRegisteredInput: IsPlatformRegisteredInput;
  IsPlatformRegisteredOrganization: ResolverTypeWrapper<IsPlatformRegisteredOrganization>;
  IsPlatformRegisteredResponse: ResolverTypeWrapper<IsPlatformRegisteredResponse>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LastDeployedOverview: ResolverTypeWrapper<Omit<LastDeployedOverview, 'resources'> & { resources: Array<ResolversTypes['DeployedResource']> }>;
  LicenseType: LicenseType;
  LogicalFilterInput: LogicalFilterInput;
  LogicalOperator: LogicalOperator;
  ManifestFragmentInput: ManifestFragmentInput;
  ManifestType: ManifestType;
  MeUserSubscription: ResolverTypeWrapper<MeUserSubscription>;
  MergeEvent: ResolverTypeWrapper<MergeEvent>;
  Mutation: ResolverTypeWrapper<{}>;
  NewsFeedItem: ResolverTypeWrapper<NewsFeedItem>;
  NewsFeedItemConnection: ResolverTypeWrapper<NewsFeedItemConnection>;
  NewsFeedItemEdge: ResolverTypeWrapper<NewsFeedItemEdge>;
  NewsFeedItemId: ResolverTypeWrapper<Scalars['NewsFeedItemId']['output']>;
  NewsFeedItemMetadata: ResolverTypeWrapper<NewsFeedItemMetadata>;
  NewsFeedItemMetadataKey: NewsFeedItemMetadataKey;
  NewsFeedItemType: NewsFeedItemType;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  OneClickDeployInput: OneClickDeployInput;
  OpenAEVScenario: ResolverTypeWrapper<OpenAevScenario>;
  OpenCTIPlatformRegistrationStatusInput: OpenCtiPlatformRegistrationStatusInput;
  OpenCTIPlatformRegistrationStatusResponse: ResolverTypeWrapper<OpenCtiPlatformRegistrationStatusResponse>;
  OpenCTIPlaybook: ResolverTypeWrapper<OpenCtiPlaybook>;
  OrderingMode: OrderingMode;
  Organization: ResolverTypeWrapper<Organization>;
  OrganizationCapabilities: ResolverTypeWrapper<OrganizationCapabilities>;
  OrganizationCapabilitiesInput: OrganizationCapabilitiesInput;
  OrganizationCapability: OrganizationCapability;
  OrganizationConnection: ResolverTypeWrapper<OrganizationConnection>;
  OrganizationEdge: ResolverTypeWrapper<OrganizationEdge>;
  OrganizationId: ResolverTypeWrapper<Scalars['OrganizationId']['output']>;
  OrganizationInput: OrganizationInput;
  OrganizationOrdering: OrganizationOrdering;
  OrganizationRef: ResolverTypeWrapper<OrganizationRef>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PlatformConfigurationStatus: PlatformConfigurationStatus;
  PlatformContract: PlatformContract;
  PlatformDeploymentRequest: ResolverTypeWrapper<PlatformDeploymentRequest>;
  PlatformDeploymentRequestConnection: ResolverTypeWrapper<PlatformDeploymentRequestConnection>;
  PlatformDeploymentRequestEdge: ResolverTypeWrapper<PlatformDeploymentRequestEdge>;
  PlatformIdentifier: PlatformIdentifier;
  PlatformInput: PlatformInput;
  PlatformProvider: ResolverTypeWrapper<PlatformProvider>;
  PlatformRegistrationConnectivityStatus: PlatformRegistrationConnectivityStatus;
  PlatformRegistrationStatus: PlatformRegistrationStatus;
  PlatformTrialStatus: ResolverTypeWrapper<PlatformTrialStatus>;
  PortalCapability: PortalCapability;
  ProductUseCaseInput: ProductUseCaseInput;
  ProvisionedNewsFeedItem: ResolverTypeWrapper<ProvisionedNewsFeedItem>;
  Query: ResolverTypeWrapper<{}>;
  RefreshPlatformRegistrationConnectivityStatusAllTenantsInput: RefreshPlatformRegistrationConnectivityStatusAllTenantsInput;
  RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse: ResolverTypeWrapper<RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse>;
  RefreshPlatformRegistrationConnectivityStatusInput: RefreshPlatformRegistrationConnectivityStatusInput;
  RefreshPlatformRegistrationConnectivityStatusResponse: ResolverTypeWrapper<RefreshPlatformRegistrationConnectivityStatusResponse>;
  RefreshPlatformRegistrationConnectivityStatusSingleTenantInput: RefreshPlatformRegistrationConnectivityStatusSingleTenantInput;
  RefreshUserPlatformTokenResponse: ResolverTypeWrapper<RefreshUserPlatformTokenResponse>;
  RegisterPlatformInput: RegisterPlatformInput;
  RegisteredPlatform: ResolverTypeWrapper<RegisteredPlatform>;
  RegisteredPlatformInput: RegisteredPlatformInput;
  RegisteredPlatformsInput: RegisteredPlatformsInput;
  RegisteredProductVersion: ResolverTypeWrapper<RegisteredProductVersion>;
  RegistrationResponse: ResolverTypeWrapper<RegistrationResponse>;
  ReorderDeploymentRequestInQueueDirection: ReorderDeploymentRequestInQueueDirection;
  ReorderDeploymentRequestInQueueInput: ReorderDeploymentRequestInQueueInput;
  RolePortal: ResolverTypeWrapper<RolePortal>;
  RssFeed: ResolverTypeWrapper<RssFeed>;
  SendTelemetryMutation: ResolverTypeWrapper<SendTelemetryMutation>;
  SeoServiceInstance: ResolverTypeWrapper<SeoServiceInstance>;
  SeoServiceInstanceLanguage: SeoServiceInstanceLanguage;
  SeoServiceInstanceMetadata: ResolverTypeWrapper<SeoServiceInstanceMetadata>;
  ServiceCapability: ResolverTypeWrapper<ServiceCapability>;
  ServiceCapabilityId: ResolverTypeWrapper<Scalars['ServiceCapabilityId']['output']>;
  ServiceConnection: ResolverTypeWrapper<ServiceConnection>;
  ServiceDefinition: ResolverTypeWrapper<ServiceDefinition>;
  ServiceDefinitionIdentifier: ServiceDefinitionIdentifier;
  ServiceGroup: ResolverTypeWrapper<ServiceGroup>;
  ServiceGroupId: ResolverTypeWrapper<Scalars['ServiceGroupId']['output']>;
  ServiceGroupName: ServiceGroupName;
  ServiceInstance: ResolverTypeWrapper<ServiceInstance>;
  ServiceInstanceCreationStatus: ServiceInstanceCreationStatus;
  ServiceInstanceEdge: ResolverTypeWrapper<ServiceInstanceEdge>;
  ServiceInstanceFilter: ServiceInstanceFilter;
  ServiceInstanceFilterKey: ServiceInstanceFilterKey;
  ServiceInstanceId: ResolverTypeWrapper<Scalars['ServiceInstanceId']['output']>;
  ServiceInstanceOrdering: ServiceInstanceOrdering;
  ServiceInstanceSubscription: ResolverTypeWrapper<ServiceInstanceSubscription>;
  ServiceInstanceTag: ServiceInstanceTag;
  ServiceLink: ResolverTypeWrapper<ServiceLink>;
  ServiceRestriction: ServiceRestriction;
  Settings: ResolverTypeWrapper<Settings>;
  ShareableResource: ResolverTypeWrapper<ShareableResource>;
  SolutionCategory: ResolverTypeWrapper<SolutionCategory>;
  SolutionCategoryConnection: ResolverTypeWrapper<SolutionCategoryConnection>;
  SolutionCategoryEdge: ResolverTypeWrapper<SolutionCategoryEdge>;
  SolutionCategoryId: ResolverTypeWrapper<Scalars['SolutionCategoryId']['output']>;
  SolutionCategoryOrdering: SolutionCategoryOrdering;
  Stream: ResolverTypeWrapper<Stream>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  SubscribedServiceInstanceConfiguration: ResolverTypeWrapper<SubscribedServiceInstanceConfiguration>;
  Subscription: ResolverTypeWrapper<{}>;
  SubscriptionCapability: ResolverTypeWrapper<SubscriptionCapability>;
  SubscriptionConnection: ResolverTypeWrapper<SubscriptionConnection>;
  SubscriptionEdge: ResolverTypeWrapper<SubscriptionEdge>;
  SubscriptionFilter: SubscriptionFilter;
  SubscriptionFilterKey: SubscriptionFilterKey;
  SubscriptionId: ResolverTypeWrapper<Scalars['SubscriptionId']['output']>;
  SubscriptionModel: ResolverTypeWrapper<SubscriptionModel>;
  SubscriptionOrdering: SubscriptionOrdering;
  Success: ResolverTypeWrapper<Success>;
  TaxiiFeed: ResolverTypeWrapper<TaxiiFeed>;
  TelemetryResponse: ResolverTypeWrapper<TelemetryResponse>;
  TenantDetails: TenantDetails;
  TenantStatus: ResolverTypeWrapper<TenantStatus>;
  ThirdPartyIntegration: ResolverTypeWrapper<ThirdPartyIntegration>;
  Timeline: Timeline;
  TrialDeploymentsInput: TrialDeploymentsInput;
  TrialsDeployments: ResolverTypeWrapper<TrialsDeployments>;
  UnregisterPlatformInput: UnregisterPlatformInput;
  UpdateBundleUserGroupsInput: UpdateBundleUserGroupsInput;
  UpdateBundleUserGroupsRoleInput: UpdateBundleUserGroupsRoleInput;
  UpdateCompetitorInput: UpdateCompetitorInput;
  UpdateDeploymentQuotaCapacityInput: UpdateDeploymentQuotaCapacityInput;
  UpdateDeploymentRequestInput: UpdateDeploymentRequestInput;
  UpdateDocumentInput: UpdateDocumentInput;
  UpdateEpicInput: UpdateEpicInput;
  UpdatePlatformServiceMetadataInput: UpdatePlatformServiceMetadataInput;
  UpdateServiceGroupsInput: UpdateServiceGroupsInput;
  UpdateServiceGroupsInputGroup: UpdateServiceGroupsInputGroup;
  UpdateSubscriptionInput: UpdateSubscriptionInput;
  UpdateVotableFeatureInput: UpdateVotableFeatureInput;
  UpdateVotingRoundInput: UpdateVotingRoundInput;
  Upload: ResolverTypeWrapper<Scalars['Upload']['output']>;
  UseCase: ResolverTypeWrapper<UseCase>;
  UseCaseConnection: ResolverTypeWrapper<UseCaseConnection>;
  UseCaseEdge: ResolverTypeWrapper<UseCaseEdge>;
  UseCaseId: ResolverTypeWrapper<Scalars['UseCaseId']['output']>;
  UseCaseOrdering: UseCaseOrdering;
  User: ResolverTypeWrapper<User>;
  UserConnection: ResolverTypeWrapper<UserConnection>;
  UserEdge: ResolverTypeWrapper<UserEdge>;
  UserId: ResolverTypeWrapper<Scalars['UserId']['output']>;
  UserOrdering: UserOrdering;
  UserPendingSubscription: ResolverTypeWrapper<UserPendingSubscription>;
  UserPlatformGroup: ResolverTypeWrapper<UserPlatformGroup>;
  UserService: ResolverTypeWrapper<UserService>;
  UserServiceAddInput: UserServiceAddInput;
  UserServiceAddYourselfInput: UserServiceAddYourselfInput;
  UserServiceCapabilitiesResponse: ResolverTypeWrapper<UserServiceCapabilitiesResponse>;
  UserServiceCapability: ResolverTypeWrapper<UserServiceCapability>;
  UserServiceConnection: ResolverTypeWrapper<UserServiceConnection>;
  UserServiceDeleted: ResolverTypeWrapper<UserServiceDeleted>;
  UserServiceEdge: ResolverTypeWrapper<UserServiceEdge>;
  UserServiceEditInput: UserServiceEditInput;
  UserServiceId: ResolverTypeWrapper<Scalars['UserServiceId']['output']>;
  UserServiceOrdering: UserServiceOrdering;
  UserServicesAddCapabilitiesInput: UserServicesAddCapabilitiesInput;
  UserServicesDeleteInput: UserServicesDeleteInput;
  UserSubscription: ResolverTypeWrapper<UserSubscription>;
  UsersWithCapabilitiesInOrganizationInput: UsersWithCapabilitiesInOrganizationInput;
  VotableFeature: ResolverTypeWrapper<VotableFeatureModel>;
  VotableFeatureId: ResolverTypeWrapper<Scalars['VotableFeatureId']['output']>;
  VotableFeatureResult: ResolverTypeWrapper<Omit<VotableFeatureResult, 'feature'> & { feature: ResolversTypes['VotableFeature'] }>;
  VotingRound: ResolverTypeWrapper<VotingRoundModel>;
  VotingRoundId: ResolverTypeWrapper<Scalars['VotingRoundId']['output']>;
  VotingRoundResults: ResolverTypeWrapper<Omit<VotingRoundResults, 'results' | 'round'> & { results: Array<ResolversTypes['VotableFeatureResult']>, round: ResolversTypes['VotingRound'] }>;
  VotingRoundStatus: VotingRoundStatus;
  VotingRoundTheme: VotingRoundTheme;
  XtmoneIntegrationStatus: ResolverTypeWrapper<XtmoneIntegrationStatus>;
  XtmoneIntegrationStatusEntry: ResolverTypeWrapper<XtmoneIntegrationStatusEntry>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AddServiceInput: AddServiceInput;
  AddSolutionCategoryInput: AddSolutionCategoryInput;
  AddSubscriptionCapabilityInput: AddSubscriptionCapabilityInput;
  AddUseCaseInput: AddUseCaseInput;
  AddUserInput: AddUserInput;
  AddUsersToBundleGroupsInput: AddUsersToBundleGroupsInput;
  AdminAddUserInput: AdminAddUserInput;
  AdminEditUserInput: AdminEditUserInput;
  AutoRegisterPlatformInput: AutoRegisterPlatformInput;
  Boolean: Scalars['Boolean']['output'];
  BulkPendingUserFromOrganizationInput: BulkPendingUserFromOrganizationInput;
  BundleUserRoleAssignmentInput: BundleUserRoleAssignmentInput;
  BundleUserServiceGroup: BundleUserServiceGroup;
  CanUnregisterPlatformInput: CanUnregisterPlatformInput;
  CanUnregisterResponse: CanUnregisterResponse;
  Capability: Capability;
  Competitor: Competitor;
  CompetitorConnection: CompetitorConnection;
  CompetitorEdge: CompetitorEdge;
  CompetitorId: Scalars['CompetitorId']['output'];
  Connector: Connector;
  ConsumeProvisionedNewsFeedItemsResponse: ConsumeProvisionedNewsFeedItemsResponse;
  CreateCompetitorInput: CreateCompetitorInput;
  CreateDeploymentRequestInput: CreateDeploymentRequestInput;
  CreateDocumentInput: CreateDocumentInput;
  CreateEpicInput: CreateEpicInput;
  CreateSubscriptionsInput: CreateSubscriptionsInput;
  CreateVotableFeatureInput: CreateVotableFeatureInput;
  CreateVotingRoundInput: CreateVotingRoundInput;
  CsvFeed: CsvFeed;
  CustomDashboard: CustomDashboard;
  CustomView: CustomView;
  Date: Scalars['Date']['output'];
  DefaultDocument: DefaultDocument;
  DeployedPlatform: DeployedPlatform;
  DeployedResource: Omit<DeployedResource, 'document'> & { document: ResolversParentTypes['Document'] };
  DeploymentAvailability: DeploymentAvailability;
  DeploymentRequest: DeploymentRequest;
  DeploymentRequestConnection: DeploymentRequestConnection;
  DeploymentRequestEdge: DeploymentRequestEdge;
  DeploymentRequestFilter: DeploymentRequestFilter;
  DeploymentRequestId: Scalars['DeploymentRequestId']['output'];
  Document: ResolversInterfaceTypes<ResolversParentTypes>['Document'];
  DocumentConnection: Omit<DocumentConnection, 'edges'> & { edges: Array<ResolversParentTypes['DocumentEdge']> };
  DocumentEdge: Omit<DocumentEdge, 'node'> & { node: ResolversParentTypes['Document'] };
  DocumentId: Scalars['DocumentId']['output'];
  DocumentMetadata: DocumentMetadata;
  EditMeUserInput: EditMeUserInput;
  EditSeoServiceInstanceInput: EditSeoServiceInstanceInput;
  EditSolutionCategoryInput: EditSolutionCategoryInput;
  EditUseCaseInput: EditUseCaseInput;
  EditUserCapabilitiesInput: EditUserCapabilitiesInput;
  Epic: Omit<Epic, 'document'> & { document?: Maybe<ResolversParentTypes['Document']> };
  EpicConnection: Omit<EpicConnection, 'edges'> & { edges: Array<ResolversParentTypes['EpicEdge']> };
  EpicCountPerTimeline: EpicCountPerTimeline;
  EpicEdge: Omit<EpicEdge, 'node'> & { node: ResolversParentTypes['Epic'] };
  Filter: Filter;
  GenericServiceCapability: GenericServiceCapability;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Integration: ResolversInterfaceTypes<ResolversParentTypes>['Integration'];
  IntegrationHack: IntegrationHack;
  IsPlatformRegisteredInput: IsPlatformRegisteredInput;
  IsPlatformRegisteredOrganization: IsPlatformRegisteredOrganization;
  IsPlatformRegisteredResponse: IsPlatformRegisteredResponse;
  JSON: Scalars['JSON']['output'];
  LastDeployedOverview: Omit<LastDeployedOverview, 'resources'> & { resources: Array<ResolversParentTypes['DeployedResource']> };
  LogicalFilterInput: LogicalFilterInput;
  ManifestFragmentInput: ManifestFragmentInput;
  MeUserSubscription: MeUserSubscription;
  MergeEvent: MergeEvent;
  Mutation: {};
  NewsFeedItem: NewsFeedItem;
  NewsFeedItemConnection: NewsFeedItemConnection;
  NewsFeedItemEdge: NewsFeedItemEdge;
  NewsFeedItemId: Scalars['NewsFeedItemId']['output'];
  NewsFeedItemMetadata: NewsFeedItemMetadata;
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  OneClickDeployInput: OneClickDeployInput;
  OpenAEVScenario: OpenAevScenario;
  OpenCTIPlatformRegistrationStatusInput: OpenCtiPlatformRegistrationStatusInput;
  OpenCTIPlatformRegistrationStatusResponse: OpenCtiPlatformRegistrationStatusResponse;
  OpenCTIPlaybook: OpenCtiPlaybook;
  Organization: Organization;
  OrganizationCapabilities: OrganizationCapabilities;
  OrganizationCapabilitiesInput: OrganizationCapabilitiesInput;
  OrganizationConnection: OrganizationConnection;
  OrganizationEdge: OrganizationEdge;
  OrganizationId: Scalars['OrganizationId']['output'];
  OrganizationInput: OrganizationInput;
  OrganizationRef: OrganizationRef;
  PageInfo: PageInfo;
  PlatformDeploymentRequest: PlatformDeploymentRequest;
  PlatformDeploymentRequestConnection: PlatformDeploymentRequestConnection;
  PlatformDeploymentRequestEdge: PlatformDeploymentRequestEdge;
  PlatformInput: PlatformInput;
  PlatformProvider: PlatformProvider;
  PlatformTrialStatus: PlatformTrialStatus;
  ProductUseCaseInput: ProductUseCaseInput;
  ProvisionedNewsFeedItem: ProvisionedNewsFeedItem;
  Query: {};
  RefreshPlatformRegistrationConnectivityStatusAllTenantsInput: RefreshPlatformRegistrationConnectivityStatusAllTenantsInput;
  RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse: RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse;
  RefreshPlatformRegistrationConnectivityStatusInput: RefreshPlatformRegistrationConnectivityStatusInput;
  RefreshPlatformRegistrationConnectivityStatusResponse: RefreshPlatformRegistrationConnectivityStatusResponse;
  RefreshPlatformRegistrationConnectivityStatusSingleTenantInput: RefreshPlatformRegistrationConnectivityStatusSingleTenantInput;
  RefreshUserPlatformTokenResponse: RefreshUserPlatformTokenResponse;
  RegisterPlatformInput: RegisterPlatformInput;
  RegisteredPlatform: RegisteredPlatform;
  RegisteredPlatformInput: RegisteredPlatformInput;
  RegisteredPlatformsInput: RegisteredPlatformsInput;
  RegisteredProductVersion: RegisteredProductVersion;
  RegistrationResponse: RegistrationResponse;
  ReorderDeploymentRequestInQueueInput: ReorderDeploymentRequestInQueueInput;
  RolePortal: RolePortal;
  RssFeed: RssFeed;
  SendTelemetryMutation: SendTelemetryMutation;
  SeoServiceInstance: SeoServiceInstance;
  SeoServiceInstanceMetadata: SeoServiceInstanceMetadata;
  ServiceCapability: ServiceCapability;
  ServiceCapabilityId: Scalars['ServiceCapabilityId']['output'];
  ServiceConnection: ServiceConnection;
  ServiceDefinition: ServiceDefinition;
  ServiceGroup: ServiceGroup;
  ServiceGroupId: Scalars['ServiceGroupId']['output'];
  ServiceInstance: ServiceInstance;
  ServiceInstanceEdge: ServiceInstanceEdge;
  ServiceInstanceFilter: ServiceInstanceFilter;
  ServiceInstanceId: Scalars['ServiceInstanceId']['output'];
  ServiceInstanceSubscription: ServiceInstanceSubscription;
  ServiceLink: ServiceLink;
  Settings: Settings;
  ShareableResource: ShareableResource;
  SolutionCategory: SolutionCategory;
  SolutionCategoryConnection: SolutionCategoryConnection;
  SolutionCategoryEdge: SolutionCategoryEdge;
  SolutionCategoryId: Scalars['SolutionCategoryId']['output'];
  Stream: Stream;
  String: Scalars['String']['output'];
  SubscribedServiceInstanceConfiguration: SubscribedServiceInstanceConfiguration;
  Subscription: {};
  SubscriptionCapability: SubscriptionCapability;
  SubscriptionConnection: SubscriptionConnection;
  SubscriptionEdge: SubscriptionEdge;
  SubscriptionFilter: SubscriptionFilter;
  SubscriptionId: Scalars['SubscriptionId']['output'];
  SubscriptionModel: SubscriptionModel;
  Success: Success;
  TaxiiFeed: TaxiiFeed;
  TelemetryResponse: TelemetryResponse;
  TenantDetails: TenantDetails;
  TenantStatus: TenantStatus;
  ThirdPartyIntegration: ThirdPartyIntegration;
  TrialDeploymentsInput: TrialDeploymentsInput;
  TrialsDeployments: TrialsDeployments;
  UnregisterPlatformInput: UnregisterPlatformInput;
  UpdateBundleUserGroupsInput: UpdateBundleUserGroupsInput;
  UpdateBundleUserGroupsRoleInput: UpdateBundleUserGroupsRoleInput;
  UpdateCompetitorInput: UpdateCompetitorInput;
  UpdateDeploymentQuotaCapacityInput: UpdateDeploymentQuotaCapacityInput;
  UpdateDeploymentRequestInput: UpdateDeploymentRequestInput;
  UpdateDocumentInput: UpdateDocumentInput;
  UpdateEpicInput: UpdateEpicInput;
  UpdatePlatformServiceMetadataInput: UpdatePlatformServiceMetadataInput;
  UpdateServiceGroupsInput: UpdateServiceGroupsInput;
  UpdateServiceGroupsInputGroup: UpdateServiceGroupsInputGroup;
  UpdateSubscriptionInput: UpdateSubscriptionInput;
  UpdateVotableFeatureInput: UpdateVotableFeatureInput;
  UpdateVotingRoundInput: UpdateVotingRoundInput;
  Upload: Scalars['Upload']['output'];
  UseCase: UseCase;
  UseCaseConnection: UseCaseConnection;
  UseCaseEdge: UseCaseEdge;
  UseCaseId: Scalars['UseCaseId']['output'];
  User: User;
  UserConnection: UserConnection;
  UserEdge: UserEdge;
  UserId: Scalars['UserId']['output'];
  UserPendingSubscription: UserPendingSubscription;
  UserPlatformGroup: UserPlatformGroup;
  UserService: UserService;
  UserServiceAddInput: UserServiceAddInput;
  UserServiceAddYourselfInput: UserServiceAddYourselfInput;
  UserServiceCapabilitiesResponse: UserServiceCapabilitiesResponse;
  UserServiceCapability: UserServiceCapability;
  UserServiceConnection: UserServiceConnection;
  UserServiceDeleted: UserServiceDeleted;
  UserServiceEdge: UserServiceEdge;
  UserServiceEditInput: UserServiceEditInput;
  UserServiceId: Scalars['UserServiceId']['output'];
  UserServicesAddCapabilitiesInput: UserServicesAddCapabilitiesInput;
  UserServicesDeleteInput: UserServicesDeleteInput;
  UserSubscription: UserSubscription;
  UsersWithCapabilitiesInOrganizationInput: UsersWithCapabilitiesInOrganizationInput;
  VotableFeature: VotableFeatureModel;
  VotableFeatureId: Scalars['VotableFeatureId']['output'];
  VotableFeatureResult: Omit<VotableFeatureResult, 'feature'> & { feature: ResolversParentTypes['VotableFeature'] };
  VotingRound: VotingRoundModel;
  VotingRoundId: Scalars['VotingRoundId']['output'];
  VotingRoundResults: Omit<VotingRoundResults, 'results' | 'round'> & { results: Array<ResolversParentTypes['VotableFeatureResult']>, round: ResolversParentTypes['VotingRound'] };
  XtmoneIntegrationStatus: XtmoneIntegrationStatus;
  XtmoneIntegrationStatusEntry: XtmoneIntegrationStatusEntry;
}>;

export type AuthDirectiveArgs = {
  orgaCapa?: Maybe<Array<Maybe<OrganizationCapability>>>;
  portalCapa?: Maybe<Array<Maybe<PortalCapability>>>;
};

export type AuthDirectiveResolver<Result, Parent, ContextType = PortalContext, Args = AuthDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Platform_TokenDirectiveArgs = { };

export type Platform_TokenDirectiveResolver<Result, Parent, ContextType = PortalContext, Args = Platform_TokenDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Service_CapaDirectiveArgs = {
  requires?: Maybe<Array<Maybe<ServiceRestriction>>>;
};

export type Service_CapaDirectiveResolver<Result, Parent, ContextType = PortalContext, Args = Service_CapaDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type System_TokenDirectiveArgs = {
  portalCapa?: Maybe<Array<PortalCapability>>;
};

export type System_TokenDirectiveResolver<Result, Parent, ContextType = PortalContext, Args = System_TokenDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type BundleUserServiceGroupResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['BundleUserServiceGroup'] = ResolversParentTypes['BundleUserServiceGroup']> = ResolversObject<{
  groups?: Resolver<Array<ResolversTypes['UserPlatformGroup']>, ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CanUnregisterResponseResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['CanUnregisterResponse'] = ResolversParentTypes['CanUnregisterResponse']> = ResolversObject<{
  isAllowed?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  isInOrganization?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  isPlatformRegistered?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  organizationId?: Resolver<Maybe<ResolversTypes['OrganizationId']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CapabilityResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Capability'] = ResolversParentTypes['Capability']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['PortalCapability'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CompetitorResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Competitor'] = ResolversParentTypes['Competitor']> = ResolversObject<{
  domain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tier?: Resolver<ResolversTypes['CompetitorTier'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CompetitorConnectionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['CompetitorConnection'] = ResolversParentTypes['CompetitorConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CompetitorEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CompetitorEdgeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['CompetitorEdge'] = ResolversParentTypes['CompetitorEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Competitor'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface CompetitorIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['CompetitorId'], any> {
  name: 'CompetitorId';
}

export type ConnectorResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Connector'] = ResolversParentTypes['Connector']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  blogpost_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  contact?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  container_image?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  datasheet_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  demo_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  file_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  integration_type?: Resolver<ResolversTypes['IntegrationType'], ParentType, ContextType>;
  license_type?: Resolver<Maybe<ResolversTypes['LicenseType']>, ParentType, ContextType>;
  manager_supported?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  minimum_deployable_version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  playbook_supported?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  product_version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  remover_id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  solution_categories?: Resolver<Maybe<Array<ResolversTypes['SolutionCategory']>>, ParentType, ContextType>;
  source_code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  subscription_link?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
  verified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ConsumeProvisionedNewsFeedItemsResponseResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['ConsumeProvisionedNewsFeedItemsResponse'] = ResolversParentTypes['ConsumeProvisionedNewsFeedItemsResponse']> = ResolversObject<{
  available_news_feed_types?: Resolver<Array<ResolversTypes['NewsFeedItemType']>, ParentType, ContextType>;
  news_feed_items?: Resolver<Array<ResolversTypes['ProvisionedNewsFeedItem']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CsvFeedResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['CsvFeed'] = ResolversParentTypes['CsvFeed']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  blogpost_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  datasheet_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  demo_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  feed_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  file_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  integration_type?: Resolver<ResolversTypes['IntegrationType'], ParentType, ContextType>;
  license_type?: Resolver<Maybe<ResolversTypes['LicenseType']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  remover_id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  solution_categories?: Resolver<Maybe<Array<ResolversTypes['SolutionCategory']>>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomDashboardResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['CustomDashboard'] = ResolversParentTypes['CustomDashboard']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  file_name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  product_version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomViewResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['CustomView'] = ResolversParentTypes['CustomView']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  entity_types?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  file_name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  product_version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export type DefaultDocumentResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['DefaultDocument'] = ResolversParentTypes['DefaultDocument']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  file_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DeployedPlatformResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['DeployedPlatform'] = ResolversParentTypes['DeployedPlatform']> = ResolversObject<{
  platformIdentifier?: Resolver<ResolversTypes['PlatformIdentifier'], ParentType, ContextType>;
  serviceInstanceId?: Resolver<ResolversTypes['ServiceInstanceId'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DeployedResourceResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['DeployedResource'] = ResolversParentTypes['DeployedResource']> = ResolversObject<{
  deployedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deployedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  document?: Resolver<ResolversTypes['Document'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DeploymentAvailabilityResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['DeploymentAvailability'] = ResolversParentTypes['DeploymentAvailability']> = ResolversObject<{
  availableCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  capacity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  platform_identifier?: Resolver<Maybe<ResolversTypes['PlatformIdentifier']>, ParentType, ContextType>;
  region?: Resolver<ResolversTypes['DeploymentRequestPlatformRegion'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DeploymentRequestResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['DeploymentRequest'] = ResolversParentTypes['DeploymentRequest']> = ResolversObject<{
  activity_sector?: Resolver<Maybe<ResolversTypes['DeploymentRequestActivitySector']>, ParentType, ContextType>;
  cancellation_date?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  cancellation_reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  cancellation_user_email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  children?: Resolver<Maybe<Array<ResolversTypes['DeploymentRequest']>>, ParentType, ContextType>;
  counts_in_orga_quota?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  end_date?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  hub_status?: Resolver<ResolversTypes['DeploymentRequestHubStatus'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  job_title?: Resolver<Maybe<ResolversTypes['DeploymentRequestJobTitle']>, ParentType, ContextType>;
  ordering?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  organization_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  organization_requester_id?: Resolver<ResolversTypes['OrganizationId'], ParentType, ContextType>;
  parent_id?: Resolver<Maybe<ResolversTypes['DeploymentRequestId']>, ParentType, ContextType>;
  platform_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  platform_identifier?: Resolver<Maybe<ResolversTypes['PlatformIdentifier']>, ParentType, ContextType>;
  platform_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  region?: Resolver<ResolversTypes['DeploymentRequestPlatformRegion'], ParentType, ContextType>;
  registered_platform?: Resolver<Maybe<ResolversTypes['RegisteredPlatform']>, ParentType, ContextType>;
  request_date?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  requester_email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<ResolversTypes['ServiceInstanceId'], ParentType, ContextType>;
  start_date?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['DeploymentRequestDeploymentType'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  use_case?: Resolver<Maybe<ResolversTypes['DeploymentRequestUseCase']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DeploymentRequestConnectionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['DeploymentRequestConnection'] = ResolversParentTypes['DeploymentRequestConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['DeploymentRequestEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DeploymentRequestEdgeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['DeploymentRequestEdge'] = ResolversParentTypes['DeploymentRequestEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['DeploymentRequest'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DeploymentRequestIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DeploymentRequestId'], any> {
  name: 'DeploymentRequestId';
}

export type DocumentResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Document'] = ResolversParentTypes['Document']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Connector' | 'CsvFeed' | 'CustomDashboard' | 'CustomView' | 'DefaultDocument' | 'IntegrationHack' | 'OpenAEVScenario' | 'OpenCTIPlaybook' | 'RssFeed' | 'Stream' | 'TaxiiFeed' | 'ThirdPartyIntegration', ParentType, ContextType>;
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  file_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
}>;

export type DocumentConnectionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['DocumentConnection'] = ResolversParentTypes['DocumentConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['DocumentEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DocumentEdgeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['DocumentEdge'] = ResolversParentTypes['DocumentEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Document'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DocumentIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DocumentId'], any> {
  name: 'DocumentId';
}

export type EpicResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Epic'] = ResolversParentTypes['Epic']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  document?: Resolver<Maybe<ResolversTypes['Document']>, ParentType, ContextType>;
  document_id?: Resolver<Maybe<ResolversTypes['DocumentId']>, ParentType, ContextType>;
  edition_type?: Resolver<ResolversTypes['EditionType'], ParentType, ContextType>;
  epic_type?: Resolver<ResolversTypes['EpicType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['FiligranProduct'], ParentType, ContextType>;
  short_description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timeline?: Resolver<ResolversTypes['Timeline'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type EpicConnectionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['EpicConnection'] = ResolversParentTypes['EpicConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['EpicEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type EpicCountPerTimelineResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['EpicCountPerTimeline'] = ResolversParentTypes['EpicCountPerTimeline']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  timeline?: Resolver<ResolversTypes['Timeline'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type EpicEdgeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['EpicEdge'] = ResolversParentTypes['EpicEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Epic'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GenericServiceCapabilityResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['GenericServiceCapability'] = ResolversParentTypes['GenericServiceCapability']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IntegrationResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Integration'] = ResolversParentTypes['Integration']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Connector' | 'CsvFeed' | 'IntegrationHack' | 'RssFeed' | 'Stream' | 'TaxiiFeed' | 'ThirdPartyIntegration', ParentType, ContextType>;
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  blogpost_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  datasheet_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  demo_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  file_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  integration_type?: Resolver<ResolversTypes['IntegrationType'], ParentType, ContextType>;
  license_type?: Resolver<Maybe<ResolversTypes['LicenseType']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  remover_id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  solution_categories?: Resolver<Maybe<Array<ResolversTypes['SolutionCategory']>>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
}>;

export type IntegrationHackResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['IntegrationHack'] = ResolversParentTypes['IntegrationHack']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  blogpost_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  datasheet_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  demo_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  file_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  integration_type?: Resolver<ResolversTypes['IntegrationType'], ParentType, ContextType>;
  license_type?: Resolver<Maybe<ResolversTypes['LicenseType']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  remover_id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  solution_categories?: Resolver<Maybe<Array<ResolversTypes['SolutionCategory']>>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IsPlatformRegisteredOrganizationResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['IsPlatformRegisteredOrganization'] = ResolversParentTypes['IsPlatformRegisteredOrganization']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IsPlatformRegisteredResponseResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['IsPlatformRegisteredResponse'] = ResolversParentTypes['IsPlatformRegisteredResponse']> = ResolversObject<{
  organization?: Resolver<Maybe<ResolversTypes['IsPlatformRegisteredOrganization']>, ParentType, ContextType>;
  platformTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['PlatformRegistrationStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type LastDeployedOverviewResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['LastDeployedOverview'] = ResolversParentTypes['LastDeployedOverview']> = ResolversObject<{
  resources?: Resolver<Array<ResolversTypes['DeployedResource']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MeUserSubscriptionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['MeUserSubscription'] = ResolversParentTypes['MeUserSubscription']> = ResolversObject<{
  delete?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  edit?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MergeEventResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['MergeEvent'] = ResolversParentTypes['MergeEvent']> = ResolversObject<{
  from?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  target?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  acceptPendingUserInOrganization?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationAcceptPendingUserInOrganizationArgs, 'organization_id' | 'user_id'>>;
  addCapabilitiesToUserServices?: Resolver<Maybe<Array<Maybe<ResolversTypes['UserService']>>>, ParentType, ContextType, RequireFields<MutationAddCapabilitiesToUserServicesArgs, 'input' | 'service_instance_id'>>;
  addOrganization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType, RequireFields<MutationAddOrganizationArgs, 'input'>>;
  addServicePicture?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType, RequireFields<MutationAddServicePictureArgs, 'isLogo' | 'serviceInstanceId'>>;
  addSolutionCategory?: Resolver<ResolversTypes['SolutionCategory'], ParentType, ContextType, RequireFields<MutationAddSolutionCategoryArgs, 'input'>>;
  addSubscription?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType, Partial<MutationAddSubscriptionArgs>>;
  addSubscriptionCapability?: Resolver<Array<ResolversTypes['SubscriptionModel']>, ParentType, ContextType, RequireFields<MutationAddSubscriptionCapabilityArgs, 'input'>>;
  addUseCase?: Resolver<ResolversTypes['UseCase'], ParentType, ContextType, RequireFields<MutationAddUseCaseArgs, 'input'>>;
  addUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationAddUserArgs, 'input'>>;
  addUserService?: Resolver<Maybe<Array<Maybe<ResolversTypes['UserService']>>>, ParentType, ContextType, RequireFields<MutationAddUserServiceArgs, 'input' | 'service_instance_id'>>;
  addUsersToBundleGroups?: Resolver<Array<ResolversTypes['BundleUserServiceGroup']>, ParentType, ContextType, RequireFields<MutationAddUsersToBundleGroupsArgs, 'input' | 'serviceInstanceId'>>;
  adminAddUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationAdminAddUserArgs, 'input'>>;
  adminCancelDeploymentRequest?: Resolver<Maybe<ResolversTypes['DeploymentRequest']>, ParentType, ContextType, RequireFields<MutationAdminCancelDeploymentRequestArgs, 'deploymentRequestId'>>;
  adminEditUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationAdminEditUserArgs, 'id' | 'input'>>;
  autoRegisterPlatform?: Resolver<ResolversTypes['Success'], ParentType, ContextType, Partial<MutationAutoRegisterPlatformArgs>>;
  bulkAcceptPendingUserInOrganization?: Resolver<Maybe<ResolversTypes['Success']>, ParentType, ContextType, RequireFields<MutationBulkAcceptPendingUserInOrganizationArgs, 'input'>>;
  bulkRemovePendingUserFromOrganization?: Resolver<Maybe<ResolversTypes['Success']>, ParentType, ContextType, RequireFields<MutationBulkRemovePendingUserFromOrganizationArgs, 'input'>>;
  cancelDeploymentRequest?: Resolver<Maybe<ResolversTypes['DeploymentRequest']>, ParentType, ContextType, RequireFields<MutationCancelDeploymentRequestArgs, 'deploymentRequestId'>>;
  changeSelectedOrganization?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationChangeSelectedOrganizationArgs, 'organization_id'>>;
  consumeProvisionedNewsFeedItems?: Resolver<ResolversTypes['ConsumeProvisionedNewsFeedItemsResponse'], ParentType, ContextType>;
  contactUs?: Resolver<ResolversTypes['Success'], ParentType, ContextType, Partial<MutationContactUsArgs>>;
  createCompetitor?: Resolver<ResolversTypes['Competitor'], ParentType, ContextType, RequireFields<MutationCreateCompetitorArgs, 'input'>>;
  createDeploymentRequest?: Resolver<ResolversTypes['DeploymentRequest'], ParentType, ContextType, RequireFields<MutationCreateDeploymentRequestArgs, 'input'>>;
  createDocument?: Resolver<ResolversTypes['Document'], ParentType, ContextType, RequireFields<MutationCreateDocumentArgs, 'input' | 'metadata' | 'serviceInstanceId'>>;
  createEpic?: Resolver<ResolversTypes['Epic'], ParentType, ContextType, RequireFields<MutationCreateEpicArgs, 'input'>>;
  createSubscriptions?: Resolver<Array<ResolversTypes['SubscriptionModel']>, ParentType, ContextType, RequireFields<MutationCreateSubscriptionsArgs, 'input'>>;
  createVotableFeature?: Resolver<ResolversTypes['VotableFeature'], ParentType, ContextType, RequireFields<MutationCreateVotableFeatureArgs, 'input'>>;
  createVotingRound?: Resolver<ResolversTypes['VotingRound'], ParentType, ContextType, RequireFields<MutationCreateVotingRoundArgs, 'input'>>;
  deleteCompetitor?: Resolver<ResolversTypes['Competitor'], ParentType, ContextType, RequireFields<MutationDeleteCompetitorArgs, 'id'>>;
  deleteDocument?: Resolver<ResolversTypes['Document'], ParentType, ContextType, RequireFields<MutationDeleteDocumentArgs, 'documentId' | 'service_instance_id'>>;
  deleteEpic?: Resolver<Maybe<ResolversTypes['Epic']>, ParentType, ContextType, RequireFields<MutationDeleteEpicArgs, 'id'>>;
  deleteNewsFeedItem?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteNewsFeedItemArgs, 'id'>>;
  deleteOrganization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType, RequireFields<MutationDeleteOrganizationArgs, 'id'>>;
  deleteSolutionCategory?: Resolver<ResolversTypes['SolutionCategory'], ParentType, ContextType, RequireFields<MutationDeleteSolutionCategoryArgs, 'id'>>;
  deleteSubscriptions?: Resolver<Array<ResolversTypes['SubscriptionModel']>, ParentType, ContextType, RequireFields<MutationDeleteSubscriptionsArgs, 'subscription_ids'>>;
  deleteUseCase?: Resolver<ResolversTypes['UseCase'], ParentType, ContextType, RequireFields<MutationDeleteUseCaseArgs, 'id'>>;
  deleteUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationDeleteUserArgs, 'id'>>;
  deleteUserServices?: Resolver<Maybe<Array<Maybe<ResolversTypes['UserService']>>>, ParentType, ContextType, RequireFields<MutationDeleteUserServicesArgs, 'input' | 'service_instance_id'>>;
  deleteVotableFeature?: Resolver<ResolversTypes['VotableFeature'], ParentType, ContextType, RequireFields<MutationDeleteVotableFeatureArgs, 'id'>>;
  deleteVotingRound?: Resolver<ResolversTypes['VotingRound'], ParentType, ContextType, RequireFields<MutationDeleteVotingRoundArgs, 'id'>>;
  editMeUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationEditMeUserArgs, 'input'>>;
  editOrganization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType, RequireFields<MutationEditOrganizationArgs, 'id' | 'input'>>;
  editSeoServiceInstance?: Resolver<ResolversTypes['SeoServiceInstanceMetadata'], ParentType, ContextType, RequireFields<MutationEditSeoServiceInstanceArgs, 'input' | 'language' | 'service_instance_id'>>;
  editSolutionCategory?: Resolver<ResolversTypes['SolutionCategory'], ParentType, ContextType, RequireFields<MutationEditSolutionCategoryArgs, 'id' | 'input'>>;
  editUseCase?: Resolver<ResolversTypes['UseCase'], ParentType, ContextType, RequireFields<MutationEditUseCaseArgs, 'id' | 'input'>>;
  editUserCapabilities?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationEditUserCapabilitiesArgs, 'id' | 'input'>>;
  editUserService?: Resolver<Maybe<ResolversTypes['UserService']>, ParentType, ContextType, RequireFields<MutationEditUserServiceArgs, 'input' | 'service_instance_id'>>;
  frontendErrorLog?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationFrontendErrorLogArgs, 'message'>>;
  generateManifest?: Resolver<ResolversTypes['Success'], ParentType, ContextType, RequireFields<MutationGenerateManifestArgs, 'product' | 'type' | 'version'>>;
  incrementShareNumberDocument?: Resolver<ResolversTypes['Document'], ParentType, ContextType, RequireFields<MutationIncrementShareNumberDocumentArgs, 'documentId'>>;
  ingestManifestFragments?: Resolver<ResolversTypes['Success'], ParentType, ContextType, RequireFields<MutationIngestManifestFragmentsArgs, 'manifestFragments'>>;
  login?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationLoginArgs, 'email'>>;
  logout?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  newProductVersion?: Resolver<ResolversTypes['Success'], ParentType, ContextType, RequireFields<MutationNewProductVersionArgs, 'product' | 'version'>>;
  refreshPlatformRegistrationConnectivityStatus?: Resolver<ResolversTypes['RefreshPlatformRegistrationConnectivityStatusResponse'], ParentType, ContextType, RequireFields<MutationRefreshPlatformRegistrationConnectivityStatusArgs, 'input'>>;
  refreshPlatformRegistrationConnectivityStatusAllTenants?: Resolver<ResolversTypes['RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse'], ParentType, ContextType, RequireFields<MutationRefreshPlatformRegistrationConnectivityStatusAllTenantsArgs, 'input'>>;
  refreshPlatformRegistrationConnectivityStatusSingleTenant?: Resolver<ResolversTypes['RefreshPlatformRegistrationConnectivityStatusResponse'], ParentType, ContextType, RequireFields<MutationRefreshPlatformRegistrationConnectivityStatusSingleTenantArgs, 'input'>>;
  refreshUserPlatformToken?: Resolver<ResolversTypes['RefreshUserPlatformTokenResponse'], ParentType, ContextType>;
  registerPlatform?: Resolver<ResolversTypes['RegistrationResponse'], ParentType, ContextType, RequireFields<MutationRegisterPlatformArgs, 'input'>>;
  removePendingUserFromOrganization?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationRemovePendingUserFromOrganizationArgs, 'organization_id' | 'user_id'>>;
  removeUserFromOrganization?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationRemoveUserFromOrganizationArgs, 'organization_id' | 'user_id'>>;
  removeUsersFromBundleGroups?: Resolver<Array<ResolversTypes['UserId']>, ParentType, ContextType, RequireFields<MutationRemoveUsersFromBundleGroupsArgs, 'serviceInstanceId' | 'userIds'>>;
  reorderDeploymentRequestInQueue?: Resolver<ResolversTypes['Success'], ParentType, ContextType, RequireFields<MutationReorderDeploymentRequestInQueueArgs, 'input'>>;
  requestTransferPersonalSpace?: Resolver<ResolversTypes['Success'], ParentType, ContextType, RequireFields<MutationRequestTransferPersonalSpaceArgs, 'new_email'>>;
  resetPassword?: Resolver<ResolversTypes['Success'], ParentType, ContextType>;
  sendTelemetryEvent?: Resolver<Maybe<ResolversTypes['SendTelemetryMutation']>, ParentType, ContextType>;
  setVotingRoundStatus?: Resolver<Array<ResolversTypes['VotingRound']>, ParentType, ContextType, RequireFields<MutationSetVotingRoundStatusArgs, 'id' | 'status'>>;
  transferPersonalSpace?: Resolver<ResolversTypes['Success'], ParentType, ContextType, RequireFields<MutationTransferPersonalSpaceArgs, 'requestId'>>;
  unregisterPlatform?: Resolver<ResolversTypes['Success'], ParentType, ContextType, RequireFields<MutationUnregisterPlatformArgs, 'input'>>;
  updateBundleUserGroups?: Resolver<Array<ResolversTypes['BundleUserServiceGroup']>, ParentType, ContextType, RequireFields<MutationUpdateBundleUserGroupsArgs, 'input' | 'serviceInstanceId'>>;
  updateCompetitor?: Resolver<ResolversTypes['Competitor'], ParentType, ContextType, RequireFields<MutationUpdateCompetitorArgs, 'input'>>;
  updateDeploymentQuotaCapacity?: Resolver<ResolversTypes['Success'], ParentType, ContextType, RequireFields<MutationUpdateDeploymentQuotaCapacityArgs, 'input'>>;
  updateDeploymentRequest?: Resolver<ResolversTypes['PlatformDeploymentRequest'], ParentType, ContextType, RequireFields<MutationUpdateDeploymentRequestArgs, 'input'>>;
  updateDocument?: Resolver<ResolversTypes['Document'], ParentType, ContextType, RequireFields<MutationUpdateDocumentArgs, 'documentId' | 'input' | 'metadata' | 'serviceInstanceId'>>;
  updateEpic?: Resolver<ResolversTypes['Epic'], ParentType, ContextType, RequireFields<MutationUpdateEpicArgs, 'id' | 'input'>>;
  updatePlatformServiceMetadata?: Resolver<Maybe<ResolversTypes['RegisteredPlatform']>, ParentType, ContextType, RequireFields<MutationUpdatePlatformServiceMetadataArgs, 'input'>>;
  updateServiceGroups?: Resolver<Array<ResolversTypes['ServiceGroup']>, ParentType, ContextType, RequireFields<MutationUpdateServiceGroupsArgs, 'input'>>;
  updateSubscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType, RequireFields<MutationUpdateSubscriptionArgs, 'input' | 'subscription_id'>>;
  updateVotableFeature?: Resolver<ResolversTypes['VotableFeature'], ParentType, ContextType, RequireFields<MutationUpdateVotableFeatureArgs, 'id' | 'input'>>;
  updateVotingRound?: Resolver<ResolversTypes['VotingRound'], ParentType, ContextType, RequireFields<MutationUpdateVotingRoundArgs, 'id' | 'input'>>;
  uploadUserPicture?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUploadUserPictureArgs, 'document'>>;
  voteForFeature?: Resolver<Array<ResolversTypes['VotableFeature']>, ParentType, ContextType, RequireFields<MutationVoteForFeatureArgs, 'feature_id'>>;
}>;

export type NewsFeedItemResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['NewsFeedItem'] = ResolversParentTypes['NewsFeedItem']> = ResolversObject<{
  creation_date?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  is_deleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  metadata?: Resolver<Array<ResolversTypes['NewsFeedItemMetadata']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['NewsFeedItemType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NewsFeedItemConnectionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['NewsFeedItemConnection'] = ResolversParentTypes['NewsFeedItemConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['NewsFeedItemEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NewsFeedItemEdgeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['NewsFeedItemEdge'] = ResolversParentTypes['NewsFeedItemEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['NewsFeedItem'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface NewsFeedItemIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['NewsFeedItemId'], any> {
  name: 'NewsFeedItemId';
}

export type NewsFeedItemMetadataResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['NewsFeedItemMetadata'] = ResolversParentTypes['NewsFeedItemMetadata']> = ResolversObject<{
  key?: Resolver<ResolversTypes['NewsFeedItemMetadataKey'], ParentType, ContextType>;
  value?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Capability' | 'Competitor' | 'Connector' | 'CsvFeed' | 'CustomDashboard' | 'CustomView' | 'DefaultDocument' | 'DeploymentRequest' | 'Epic' | 'GenericServiceCapability' | 'IntegrationHack' | 'IsPlatformRegisteredOrganization' | 'MergeEvent' | 'NewsFeedItem' | 'OpenAEVScenario' | 'OpenCTIPlaybook' | 'Organization' | 'OrganizationCapabilities' | 'OrganizationRef' | 'ProvisionedNewsFeedItem' | 'RegisteredPlatform' | 'RolePortal' | 'RssFeed' | 'SeoServiceInstance' | 'ServiceCapability' | 'ServiceDefinition' | 'ServiceGroup' | 'ServiceInstance' | 'ServiceLink' | 'SolutionCategory' | 'Stream' | 'SubscriptionCapability' | 'SubscriptionModel' | 'TaxiiFeed' | 'ThirdPartyIntegration' | 'UseCase' | 'User' | 'UserService' | 'UserServiceCapability' | 'UserServiceDeleted' | 'VotableFeature' | 'VotingRound', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type OpenAevScenarioResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['OpenAEVScenario'] = ResolversParentTypes['OpenAEVScenario']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  file_name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  product_version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OpenCtiPlatformRegistrationStatusResponseResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['OpenCTIPlatformRegistrationStatusResponse'] = ResolversParentTypes['OpenCTIPlatformRegistrationStatusResponse']> = ResolversObject<{
  status?: Resolver<ResolversTypes['PlatformRegistrationConnectivityStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OpenCtiPlaybookResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['OpenCTIPlaybook'] = ResolversParentTypes['OpenCTIPlaybook']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  file_name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  product_version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization']> = ResolversObject<{
  capabilityUser?: Resolver<Maybe<Array<Maybe<ResolversTypes['Capability']>>>, ParentType, ContextType>;
  domains?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  personal_space?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationCapabilitiesResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['OrganizationCapabilities'] = ResolversParentTypes['OrganizationCapabilities']> = ResolversObject<{
  capabilities?: Resolver<Maybe<Array<ResolversTypes['OrganizationCapability']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationConnectionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['OrganizationConnection'] = ResolversParentTypes['OrganizationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['OrganizationEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationEdgeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['OrganizationEdge'] = ResolversParentTypes['OrganizationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface OrganizationIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['OrganizationId'], any> {
  name: 'OrganizationId';
}

export type OrganizationRefResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['OrganizationRef'] = ResolversParentTypes['OrganizationRef']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PlatformDeploymentRequestResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['PlatformDeploymentRequest'] = ResolversParentTypes['PlatformDeploymentRequest']> = ResolversObject<{
  activity_sector?: Resolver<Maybe<ResolversTypes['DeploymentRequestActivitySector']>, ParentType, ContextType>;
  actual_state?: Resolver<Maybe<ResolversTypes['DeploymentRequestPlatformState']>, ParentType, ContextType>;
  end_date?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  failure_reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hub_status?: Resolver<ResolversTypes['DeploymentRequestHubStatus'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  job_title?: Resolver<Maybe<ResolversTypes['DeploymentRequestJobTitle']>, ParentType, ContextType>;
  ordering?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  organization_domains?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  organization_name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  platform_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  platform_identifier?: Resolver<Maybe<ResolversTypes['PlatformIdentifier']>, ParentType, ContextType>;
  platform_token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  platform_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  region?: Resolver<ResolversTypes['DeploymentRequestPlatformRegion'], ParentType, ContextType>;
  requester_email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  requester_first_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requester_last_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  start_date?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  target_state?: Resolver<Maybe<ResolversTypes['DeploymentRequestPlatformState']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['DeploymentRequestDeploymentType'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  use_case?: Resolver<Maybe<ResolversTypes['DeploymentRequestUseCase']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PlatformDeploymentRequestConnectionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['PlatformDeploymentRequestConnection'] = ResolversParentTypes['PlatformDeploymentRequestConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['PlatformDeploymentRequestEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PlatformDeploymentRequestEdgeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['PlatformDeploymentRequestEdge'] = ResolversParentTypes['PlatformDeploymentRequestEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['PlatformDeploymentRequest'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PlatformProviderResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['PlatformProvider'] = ResolversParentTypes['PlatformProvider']> = ResolversObject<{
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PlatformTrialStatusResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['PlatformTrialStatus'] = ResolversParentTypes['PlatformTrialStatus']> = ResolversObject<{
  end_date?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  hub_status?: Resolver<Maybe<ResolversTypes['DeploymentRequestHubStatus']>, ParentType, ContextType>;
  isBlacklisted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  ongoingStandaloneTrials?: Resolver<Array<ResolversTypes['PlatformIdentifier']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProvisionedNewsFeedItemResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['ProvisionedNewsFeedItem'] = ResolversParentTypes['ProvisionedNewsFeedItem']> = ResolversObject<{
  creation_date?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  is_deleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  metadata?: Resolver<Array<ResolversTypes['NewsFeedItemMetadata']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['NewsFeedItemType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  bundleProducts?: Resolver<Array<ResolversTypes['PlatformIdentifier']>, ParentType, ContextType, RequireFields<QueryBundleProductsArgs, 'serviceInstanceId'>>;
  bundleUserServiceGroups?: Resolver<Array<ResolversTypes['BundleUserServiceGroup']>, ParentType, ContextType, RequireFields<QueryBundleUserServiceGroupsArgs, 'serviceInstanceId'>>;
  canUnregisterPlatform?: Resolver<ResolversTypes['CanUnregisterResponse'], ParentType, ContextType, RequireFields<QueryCanUnregisterPlatformArgs, 'input'>>;
  competitors?: Resolver<ResolversTypes['CompetitorConnection'], ParentType, ContextType, RequireFields<QueryCompetitorsArgs, 'first' | 'orderBy' | 'orderMode'>>;
  countEpicsPerTimeline?: Resolver<Array<ResolversTypes['EpicCountPerTimeline']>, ParentType, ContextType>;
  currentVotingRound?: Resolver<Maybe<ResolversTypes['VotingRound']>, ParentType, ContextType, RequireFields<QueryCurrentVotingRoundArgs, 'service_instance_id'>>;
  deploymentRequests?: Resolver<ResolversTypes['PlatformDeploymentRequestConnection'], ParentType, ContextType, RequireFields<QueryDeploymentRequestsArgs, 'first'>>;
  deploymentRequestsAvailable?: Resolver<Array<ResolversTypes['DeploymentAvailability']>, ParentType, ContextType, Partial<QueryDeploymentRequestsAvailableArgs>>;
  deploymentRequestsList?: Resolver<ResolversTypes['DeploymentRequestConnection'], ParentType, ContextType, RequireFields<QueryDeploymentRequestsListArgs, 'first' | 'orderBy' | 'orderMode'>>;
  document?: Resolver<Maybe<ResolversTypes['Document']>, ParentType, ContextType, RequireFields<QueryDocumentArgs, 'documentId' | 'serviceInstanceId'>>;
  documentExists?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<QueryDocumentExistsArgs, 'service_instance_id'>>;
  documents?: Resolver<ResolversTypes['DocumentConnection'], ParentType, ContextType, RequireFields<QueryDocumentsArgs, 'first' | 'orderBy' | 'orderMode' | 'serviceInstanceId'>>;
  epics?: Resolver<Maybe<ResolversTypes['EpicConnection']>, ParentType, ContextType, RequireFields<QueryEpicsArgs, 'first' | 'orderBy' | 'orderMode'>>;
  isPlatformRegistered?: Resolver<ResolversTypes['IsPlatformRegisteredResponse'], ParentType, ContextType, RequireFields<QueryIsPlatformRegisteredArgs, 'input'>>;
  lastDeployedOverview?: Resolver<ResolversTypes['LastDeployedOverview'], ParentType, ContextType, RequireFields<QueryLastDeployedOverviewArgs, 'limit' | 'serviceInstanceId'>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  mostDeployedDocuments?: Resolver<Array<ResolversTypes['Document']>, ParentType, ContextType, RequireFields<QueryMostDeployedDocumentsArgs, 'limit'>>;
  newestDocuments?: Resolver<Array<ResolversTypes['Document']>, ParentType, ContextType, RequireFields<QueryNewestDocumentsArgs, 'limit'>>;
  newsFeedItems?: Resolver<ResolversTypes['NewsFeedItemConnection'], ParentType, ContextType, RequireFields<QueryNewsFeedItemsArgs, 'first'>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<QueryNodeArgs, 'id'>>;
  openCTIPlatformRegistrationStatus?: Resolver<ResolversTypes['OpenCTIPlatformRegistrationStatusResponse'], ParentType, ContextType, RequireFields<QueryOpenCtiPlatformRegistrationStatusArgs, 'input'>>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType, RequireFields<QueryOrganizationArgs, 'id'>>;
  organizations?: Resolver<ResolversTypes['OrganizationConnection'], ParentType, ContextType, RequireFields<QueryOrganizationsArgs, 'first' | 'orderBy' | 'orderMode'>>;
  pendingUsers?: Resolver<ResolversTypes['UserConnection'], ParentType, ContextType, RequireFields<QueryPendingUsersArgs, 'first' | 'orderBy' | 'orderMode'>>;
  platformAssociatedOrganization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType, RequireFields<QueryPlatformAssociatedOrganizationArgs, 'platformId'>>;
  platformTrialStatus?: Resolver<ResolversTypes['PlatformTrialStatus'], ParentType, ContextType, RequireFields<QueryPlatformTrialStatusArgs, 'organizationId'>>;
  publicDocumentBySlug?: Resolver<Maybe<ResolversTypes['Document']>, ParentType, ContextType, RequireFields<QueryPublicDocumentBySlugArgs, 'serviceInstanceId' | 'slug'>>;
  publicDocuments?: Resolver<ResolversTypes['DocumentConnection'], ParentType, ContextType, RequireFields<QueryPublicDocumentsArgs, 'first' | 'orderBy' | 'orderMode' | 'serviceInstanceId' | 'slug'>>;
  publicDocumentsByServiceSlug?: Resolver<Array<ResolversTypes['Document']>, ParentType, ContextType, RequireFields<QueryPublicDocumentsByServiceSlugArgs, 'serviceInstanceSlug'>>;
  registeredPlatform?: Resolver<Maybe<ResolversTypes['RegisteredPlatform']>, ParentType, ContextType, RequireFields<QueryRegisteredPlatformArgs, 'input'>>;
  registeredPlatforms?: Resolver<Array<ResolversTypes['RegisteredPlatform']>, ParentType, ContextType, RequireFields<QueryRegisteredPlatformsArgs, 'input'>>;
  registeredProductVersions?: Resolver<Array<ResolversTypes['RegisteredProductVersion']>, ParentType, ContextType, RequireFields<QueryRegisteredProductVersionsArgs, 'product'>>;
  seoServiceInstance?: Resolver<ResolversTypes['SeoServiceInstance'], ParentType, ContextType, RequireFields<QuerySeoServiceInstanceArgs, 'slug'>>;
  seoServiceInstanceMetadata?: Resolver<Array<ResolversTypes['SeoServiceInstanceMetadata']>, ParentType, ContextType, RequireFields<QuerySeoServiceInstanceMetadataArgs, 'service_instance_id'>>;
  seoServiceInstances?: Resolver<Array<ResolversTypes['SeoServiceInstance']>, ParentType, ContextType>;
  serviceGroups?: Resolver<Array<ResolversTypes['ServiceGroup']>, ParentType, ContextType, RequireFields<QueryServiceGroupsArgs, 'serviceInstanceId'>>;
  serviceInstanceById?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType, RequireFields<QueryServiceInstanceByIdArgs, 'service_instance_id'>>;
  serviceInstanceLinksByTags?: Resolver<Array<ResolversTypes['SeoServiceInstance']>, ParentType, ContextType, RequireFields<QueryServiceInstanceLinksByTagsArgs, 'tags'>>;
  serviceInstances?: Resolver<ResolversTypes['ServiceConnection'], ParentType, ContextType, RequireFields<QueryServiceInstancesArgs, 'first' | 'orderBy' | 'orderMode'>>;
  settings?: Resolver<ResolversTypes['Settings'], ParentType, ContextType>;
  solutionCategories?: Resolver<Maybe<ResolversTypes['SolutionCategoryConnection']>, ParentType, ContextType, RequireFields<QuerySolutionCategoriesArgs, 'first' | 'orderBy' | 'orderMode'>>;
  subscriptionById?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType, Partial<QuerySubscriptionByIdArgs>>;
  subscriptions?: Resolver<ResolversTypes['SubscriptionConnection'], ParentType, ContextType, RequireFields<QuerySubscriptionsArgs, 'first' | 'orderBy' | 'orderMode'>>;
  trialDeployments?: Resolver<ResolversTypes['TrialsDeployments'], ParentType, ContextType, RequireFields<QueryTrialDeploymentsArgs, 'input'>>;
  updateOpenCTIManifest?: Resolver<ResolversTypes['Success'], ParentType, ContextType, RequireFields<QueryUpdateOpenCtiManifestArgs, 'tag'>>;
  useCases?: Resolver<Maybe<ResolversTypes['UseCaseConnection']>, ParentType, ContextType, RequireFields<QueryUseCasesArgs, 'first' | 'orderBy' | 'orderMode'>>;
  userOrganizations?: Resolver<Array<ResolversTypes['Organization']>, ParentType, ContextType>;
  userServiceCapabilities?: Resolver<ResolversTypes['UserServiceCapabilitiesResponse'], ParentType, ContextType, RequireFields<QueryUserServiceCapabilitiesArgs, 'service_instance_id'>>;
  userServiceFromSubscription?: Resolver<Maybe<ResolversTypes['UserServiceConnection']>, ParentType, ContextType, RequireFields<QueryUserServiceFromSubscriptionArgs, 'first' | 'orderBy' | 'orderMode' | 'subscription_id'>>;
  users?: Resolver<ResolversTypes['UserConnection'], ParentType, ContextType, RequireFields<QueryUsersArgs, 'first' | 'orderBy' | 'orderMode'>>;
  usersWithCapabilitiesInOrganization?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryUsersWithCapabilitiesInOrganizationArgs, 'input'>>;
  votingRound?: Resolver<Maybe<ResolversTypes['VotingRound']>, ParentType, ContextType, RequireFields<QueryVotingRoundArgs, 'id'>>;
  votingRoundResults?: Resolver<ResolversTypes['VotingRoundResults'], ParentType, ContextType, RequireFields<QueryVotingRoundResultsArgs, 'id'>>;
  votingRounds?: Resolver<Array<ResolversTypes['VotingRound']>, ParentType, ContextType, Partial<QueryVotingRoundsArgs>>;
  xtmPlatformBundle?: Resolver<Maybe<ResolversTypes['DeploymentRequest']>, ParentType, ContextType>;
  xtmonePlatformIntegrationStatus?: Resolver<Maybe<ResolversTypes['XtmoneIntegrationStatus']>, ParentType, ContextType, RequireFields<QueryXtmonePlatformIntegrationStatusArgs, 'serviceInstanceId'>>;
}>;

export type RefreshPlatformRegistrationConnectivityStatusAllTenantsResponseResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse'] = ResolversParentTypes['RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse']> = ResolversObject<{
  statuses?: Resolver<Array<ResolversTypes['TenantStatus']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RefreshPlatformRegistrationConnectivityStatusResponseResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['RefreshPlatformRegistrationConnectivityStatusResponse'] = ResolversParentTypes['RefreshPlatformRegistrationConnectivityStatusResponse']> = ResolversObject<{
  status?: Resolver<ResolversTypes['PlatformRegistrationConnectivityStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RefreshUserPlatformTokenResponseResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['RefreshUserPlatformTokenResponse'] = ResolversParentTypes['RefreshUserPlatformTokenResponse']> = ResolversObject<{
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RegisteredPlatformResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['RegisteredPlatform'] = ResolversParentTypes['RegisteredPlatform']> = ResolversObject<{
  contract?: Resolver<ResolversTypes['PlatformContract'], ParentType, ContextType>;
  deployment_request?: Resolver<Maybe<ResolversTypes['DeploymentRequest']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  identifier?: Resolver<ResolversTypes['ServiceDefinitionIdentifier'], ParentType, ContextType>;
  illustration_document_id?: Resolver<Maybe<ResolversTypes['DocumentId']>, ParentType, ContextType>;
  last_connectivity_check?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  myGroups?: Resolver<Maybe<Array<ResolversTypes['ServiceGroup']>>, ParentType, ContextType>;
  platform_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['PlatformConfigurationStatus']>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  tenant_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tenant_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RegisteredProductVersionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['RegisteredProductVersion'] = ResolversParentTypes['RegisteredProductVersion']> = ResolversObject<{
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['PlatformIdentifier'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RegistrationResponseResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['RegistrationResponse'] = ResolversParentTypes['RegistrationResponse']> = ResolversObject<{
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RolePortalResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['RolePortal'] = ResolversParentTypes['RolePortal']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RssFeedResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['RssFeed'] = ResolversParentTypes['RssFeed']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  blogpost_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  datasheet_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  demo_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  feed_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  file_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  integration_type?: Resolver<ResolversTypes['IntegrationType'], ParentType, ContextType>;
  license_type?: Resolver<Maybe<ResolversTypes['LicenseType']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  remover_id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  solution_categories?: Resolver<Maybe<Array<ResolversTypes['SolutionCategory']>>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SendTelemetryMutationResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['SendTelemetryMutation'] = ResolversParentTypes['SendTelemetryMutation']> = ResolversObject<{
  oneClickDeploy?: Resolver<Maybe<ResolversTypes['TelemetryResponse']>, ParentType, ContextType, RequireFields<SendTelemetryMutationOneClickDeployArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SeoServiceInstanceResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['SeoServiceInstance'] = ResolversParentTypes['SeoServiceInstance']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  illustration_document_id?: Resolver<Maybe<ResolversTypes['DocumentId']>, ParentType, ContextType>;
  links?: Resolver<Maybe<Array<Maybe<ResolversTypes['ServiceLink']>>>, ParentType, ContextType>;
  logo_document_id?: Resolver<Maybe<ResolversTypes['DocumentId']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  service_definition?: Resolver<ResolversTypes['ServiceDefinition'], ParentType, ContextType>;
  slug?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['ServiceInstanceTag']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SeoServiceInstanceMetadataResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['SeoServiceInstanceMetadata'] = ResolversParentTypes['SeoServiceInstanceMetadata']> = ResolversObject<{
  language?: Resolver<ResolversTypes['SeoServiceInstanceLanguage'], ParentType, ContextType>;
  meta_description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  meta_title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  service_instance_id?: Resolver<ResolversTypes['ServiceInstanceId'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ServiceCapabilityResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['ServiceCapability'] = ResolversParentTypes['ServiceCapability']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  service_definition_id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface ServiceCapabilityIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ServiceCapabilityId'], any> {
  name: 'ServiceCapabilityId';
}

export type ServiceConnectionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['ServiceConnection'] = ResolversParentTypes['ServiceConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ServiceInstanceEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ServiceDefinitionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['ServiceDefinition'] = ResolversParentTypes['ServiceDefinition']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  identifier?: Resolver<ResolversTypes['ServiceDefinitionIdentifier'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  public?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  service_capability?: Resolver<Maybe<Array<Maybe<ResolversTypes['ServiceCapability']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ServiceGroupResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['ServiceGroup'] = ResolversParentTypes['ServiceGroup']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['ServiceGroupName'], ParentType, ContextType>;
  users?: Resolver<Maybe<Array<ResolversTypes['User']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface ServiceGroupIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ServiceGroupId'], any> {
  name: 'ServiceGroupId';
}

export type ServiceInstanceResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['ServiceInstance'] = ResolversParentTypes['ServiceInstance']> = ResolversObject<{
  capabilities?: Resolver<Array<Maybe<ResolversTypes['String']>>, ParentType, ContextType>;
  creation_status?: Resolver<Maybe<ResolversTypes['ServiceInstanceCreationStatus']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  illustration_document_id?: Resolver<Maybe<ResolversTypes['DocumentId']>, ParentType, ContextType>;
  links?: Resolver<Maybe<Array<Maybe<ResolversTypes['ServiceLink']>>>, ParentType, ContextType>;
  logo_document_id?: Resolver<Maybe<ResolversTypes['DocumentId']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  ordering?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  organization?: Resolver<Maybe<Array<Maybe<ResolversTypes['Organization']>>>, ParentType, ContextType>;
  organization_subscribed?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  public?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  service_definition?: Resolver<Maybe<ResolversTypes['ServiceDefinition']>, ParentType, ContextType>;
  slug?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  subscriptions?: Resolver<Maybe<Array<Maybe<ResolversTypes['SubscriptionModel']>>>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['ServiceInstanceTag']>>, ParentType, ContextType>;
  user_joined?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ServiceInstanceEdgeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['ServiceInstanceEdge'] = ResolversParentTypes['ServiceInstanceEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface ServiceInstanceIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ServiceInstanceId'], any> {
  name: 'ServiceInstanceId';
}

export type ServiceInstanceSubscriptionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['ServiceInstanceSubscription'] = ResolversParentTypes['ServiceInstanceSubscription']> = ResolversObject<{
  add?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  delete?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  edit?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ServiceLinkResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['ServiceLink'] = ResolversParentTypes['ServiceLink']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SettingsResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Settings'] = ResolversParentTypes['Settings']> = ResolversObject<{
  base_url_front?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  environment?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  platform_feature_flags?: Resolver<Array<ResolversTypes['FeatureFlag']>, ParentType, ContextType>;
  platform_providers?: Resolver<Array<ResolversTypes['PlatformProvider']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ShareableResourceResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['ShareableResource'] = ResolversParentTypes['ShareableResource']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  file_name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  image_type?: Resolver<Maybe<ResolversTypes['DocumentImageType']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source_type?: Resolver<ResolversTypes['DocumentSourceType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SolutionCategoryResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['SolutionCategory'] = ResolversParentTypes['SolutionCategory']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  product?: Resolver<Array<ResolversTypes['FiligranProduct']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SolutionCategoryConnectionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['SolutionCategoryConnection'] = ResolversParentTypes['SolutionCategoryConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['SolutionCategoryEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SolutionCategoryEdgeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['SolutionCategoryEdge'] = ResolversParentTypes['SolutionCategoryEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['SolutionCategory'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface SolutionCategoryIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['SolutionCategoryId'], any> {
  name: 'SolutionCategoryId';
}

export type StreamResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Stream'] = ResolversParentTypes['Stream']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  blogpost_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  datasheet_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  demo_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  feed_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  file_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  integration_type?: Resolver<ResolversTypes['IntegrationType'], ParentType, ContextType>;
  license_type?: Resolver<Maybe<ResolversTypes['LicenseType']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  remover_id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  solution_categories?: Resolver<Maybe<Array<ResolversTypes['SolutionCategory']>>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SubscribedServiceInstanceConfigurationResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['SubscribedServiceInstanceConfiguration'] = ResolversParentTypes['SubscribedServiceInstanceConfiguration']> = ResolversObject<{
  platform_contract?: Resolver<ResolversTypes['PlatformContract'], ParentType, ContextType>;
  platform_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  platform_title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  platform_url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  registerer_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SubscriptionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  MeUser?: SubscriptionResolver<Maybe<ResolversTypes['MeUserSubscription']>, "MeUser", ParentType, ContextType>;
  ServiceInstance?: SubscriptionResolver<Maybe<ResolversTypes['ServiceInstanceSubscription']>, "ServiceInstance", ParentType, ContextType>;
  User?: SubscriptionResolver<Maybe<ResolversTypes['UserSubscription']>, "User", ParentType, ContextType, Partial<SubscriptionUserArgs>>;
  UserPending?: SubscriptionResolver<Maybe<ResolversTypes['UserPendingSubscription']>, "UserPending", ParentType, ContextType, RequireFields<SubscriptionUserPendingArgs, 'organizationId'>>;
}>;

export type SubscriptionCapabilityResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['SubscriptionCapability'] = ResolversParentTypes['SubscriptionCapability']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  service_capability?: Resolver<Maybe<ResolversTypes['ServiceCapability']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SubscriptionConnectionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['SubscriptionConnection'] = ResolversParentTypes['SubscriptionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['SubscriptionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SubscriptionEdgeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['SubscriptionEdge'] = ResolversParentTypes['SubscriptionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['SubscriptionModel'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface SubscriptionIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['SubscriptionId'], any> {
  name: 'SubscriptionId';
}

export type SubscriptionModelResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['SubscriptionModel'] = ResolversParentTypes['SubscriptionModel']> = ResolversObject<{
  end_date?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
  organization_id?: Resolver<ResolversTypes['OrganizationId'], ParentType, ContextType>;
  service_instance?: Resolver<ResolversTypes['ServiceInstance'], ParentType, ContextType>;
  service_instance_id?: Resolver<ResolversTypes['ServiceInstanceId'], ParentType, ContextType>;
  service_url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  start_date?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  subscription_capability?: Resolver<Maybe<Array<Maybe<ResolversTypes['SubscriptionCapability']>>>, ParentType, ContextType>;
  user_service?: Resolver<Array<Maybe<ResolversTypes['UserService']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SuccessResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['Success'] = ResolversParentTypes['Success']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TaxiiFeedResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['TaxiiFeed'] = ResolversParentTypes['TaxiiFeed']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  blogpost_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  datasheet_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  demo_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  feed_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  file_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  integration_type?: Resolver<ResolversTypes['IntegrationType'], ParentType, ContextType>;
  license_type?: Resolver<Maybe<ResolversTypes['LicenseType']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  remover_id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  solution_categories?: Resolver<Maybe<Array<ResolversTypes['SolutionCategory']>>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TelemetryResponseResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['TelemetryResponse'] = ResolversParentTypes['TelemetryResponse']> = ResolversObject<{
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  result?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TenantStatusResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['TenantStatus'] = ResolversParentTypes['TenantStatus']> = ResolversObject<{
  status?: Resolver<ResolversTypes['PlatformRegistrationConnectivityStatus'], ParentType, ContextType>;
  tenantId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ThirdPartyIntegrationResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['ThirdPartyIntegration'] = ResolversParentTypes['ThirdPartyIntegration']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  blogpost_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  children_documents?: Resolver<Maybe<Array<ResolversTypes['ShareableResource']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  datasheet_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  demo_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  download_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  file_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  github_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  integration_type?: Resolver<ResolversTypes['IntegrationType'], ParentType, ContextType>;
  license_type?: Resolver<Maybe<ResolversTypes['LicenseType']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  product_version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  remover_id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  service_instance?: Resolver<Maybe<ResolversTypes['ServiceInstance']>, ParentType, ContextType>;
  service_instance_id?: Resolver<Maybe<ResolversTypes['ServiceInstanceId']>, ParentType, ContextType>;
  share_number?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  short_description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  solution_categories?: Resolver<Maybe<Array<ResolversTypes['SolutionCategory']>>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updater_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  uploader_organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  use_cases?: Resolver<Maybe<Array<ResolversTypes['UseCase']>>, ParentType, ContextType>;
  vendor_url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TrialsDeploymentsResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['TrialsDeployments'] = ResolversParentTypes['TrialsDeployments']> = ResolversObject<{
  availableTrials?: Resolver<Array<ResolversTypes['PlatformIdentifier']>, ParentType, ContextType>;
  deployed?: Resolver<Array<ResolversTypes['DeployedPlatform']>, ParentType, ContextType>;
  isBlacklisted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface UploadScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Upload'], any> {
  name: 'Upload';
}

export type UseCaseResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UseCase'] = ResolversParentTypes['UseCase']> = ResolversObject<{
  color?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  product?: Resolver<Array<ResolversTypes['FiligranProduct']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UseCaseConnectionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UseCaseConnection'] = ResolversParentTypes['UseCaseConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['UseCaseEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UseCaseEdgeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UseCaseEdge'] = ResolversParentTypes['UseCaseEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['UseCase'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface UseCaseIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['UseCaseId'], any> {
  name: 'UseCaseId';
}

export type UserResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  capabilities?: Resolver<Maybe<Array<ResolversTypes['Capability']>>, ParentType, ContextType>;
  country?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  disabled?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  first_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  last_login?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  last_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  organization_capabilities?: Resolver<Maybe<Array<ResolversTypes['OrganizationCapabilities']>>, ParentType, ContextType>;
  organizations?: Resolver<Maybe<Array<ResolversTypes['Organization']>>, ParentType, ContextType>;
  pending_organization_id?: Resolver<Maybe<ResolversTypes['OrganizationId']>, ParentType, ContextType>;
  picture?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  roles_portal?: Resolver<Maybe<Array<ResolversTypes['RolePortal']>>, ParentType, ContextType>;
  selected_language?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  selected_org_capabilities?: Resolver<Maybe<Array<ResolversTypes['OrganizationCapability']>>, ParentType, ContextType>;
  selected_organization_id?: Resolver<Maybe<ResolversTypes['OrganizationId']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserConnectionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UserConnection'] = ResolversParentTypes['UserConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['UserEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserEdgeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UserEdge'] = ResolversParentTypes['UserEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface UserIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['UserId'], any> {
  name: 'UserId';
}

export type UserPendingSubscriptionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UserPendingSubscription'] = ResolversParentTypes['UserPendingSubscription']> = ResolversObject<{
  delete?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  invalidate?: Resolver<Maybe<ResolversTypes['OrganizationRef']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserPlatformGroupResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UserPlatformGroup'] = ResolversParentTypes['UserPlatformGroup']> = ResolversObject<{
  name?: Resolver<ResolversTypes['ServiceGroupName'], ParentType, ContextType>;
  platformIdentifier?: Resolver<ResolversTypes['PlatformIdentifier'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserServiceResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UserService'] = ResolversParentTypes['UserService']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  ordering?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['SubscriptionModel']>, ParentType, ContextType>;
  subscription_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  user_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  user_service_capability?: Resolver<Maybe<Array<Maybe<ResolversTypes['UserServiceCapability']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserServiceCapabilitiesResponseResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UserServiceCapabilitiesResponse'] = ResolversParentTypes['UserServiceCapabilitiesResponse']> = ResolversObject<{
  subscription_id?: Resolver<Maybe<ResolversTypes['SubscriptionId']>, ParentType, ContextType>;
  userServiceCapabilities?: Resolver<Array<ResolversTypes['UserServiceCapability']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserServiceCapabilityResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UserServiceCapability'] = ResolversParentTypes['UserServiceCapability']> = ResolversObject<{
  generic_service_capability?: Resolver<Maybe<ResolversTypes['GenericServiceCapability']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  subscription_capability?: Resolver<Maybe<ResolversTypes['SubscriptionCapability']>, ParentType, ContextType>;
  user_service_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserServiceConnectionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UserServiceConnection'] = ResolversParentTypes['UserServiceConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['UserServiceEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserServiceDeletedResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UserServiceDeleted'] = ResolversParentTypes['UserServiceDeleted']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  subscription_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  user_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserServiceEdgeResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UserServiceEdge'] = ResolversParentTypes['UserServiceEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<Maybe<ResolversTypes['UserService']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface UserServiceIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['UserServiceId'], any> {
  name: 'UserServiceId';
}

export type UserSubscriptionResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['UserSubscription'] = ResolversParentTypes['UserSubscription']> = ResolversObject<{
  add?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  delete?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  edit?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  merge?: Resolver<Maybe<ResolversTypes['MergeEvent']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VotableFeatureResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['VotableFeature'] = ResolversParentTypes['VotableFeature']> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  has_my_vote?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  illustration_document?: Resolver<Maybe<ResolversTypes['Document']>, ParentType, ContextType>;
  illustration_document_id?: Resolver<Maybe<ResolversTypes['DocumentId']>, ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['FiligranProduct'], ParentType, ContextType>;
  short_description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  use_cases?: Resolver<Array<ResolversTypes['UseCase']>, ParentType, ContextType>;
  voting_round_id?: Resolver<ResolversTypes['VotingRoundId'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface VotableFeatureIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['VotableFeatureId'], any> {
  name: 'VotableFeatureId';
}

export type VotableFeatureResultResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['VotableFeatureResult'] = ResolversParentTypes['VotableFeatureResult']> = ResolversObject<{
  feature?: Resolver<ResolversTypes['VotableFeature'], ParentType, ContextType>;
  vote_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VotingRoundResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['VotingRound'] = ResolversParentTypes['VotingRound']> = ResolversObject<{
  closed_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  feature_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  features?: Resolver<Array<ResolversTypes['VotableFeature']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  opened_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  service_instance_id?: Resolver<ResolversTypes['ServiceInstanceId'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['VotingRoundStatus'], ParentType, ContextType>;
  theme?: Resolver<ResolversTypes['VotingRoundTheme'], ParentType, ContextType>;
  updated_at?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface VotingRoundIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['VotingRoundId'], any> {
  name: 'VotingRoundId';
}

export type VotingRoundResultsResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['VotingRoundResults'] = ResolversParentTypes['VotingRoundResults']> = ResolversObject<{
  results?: Resolver<Array<ResolversTypes['VotableFeatureResult']>, ParentType, ContextType>;
  round?: Resolver<ResolversTypes['VotingRound'], ParentType, ContextType>;
  total_voters?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type XtmoneIntegrationStatusResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['XtmoneIntegrationStatus'] = ResolversParentTypes['XtmoneIntegrationStatus']> = ResolversObject<{
  last_checked_at?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  linked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  openaev?: Resolver<ResolversTypes['XtmoneIntegrationStatusEntry'], ParentType, ContextType>;
  opencti?: Resolver<ResolversTypes['XtmoneIntegrationStatusEntry'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type XtmoneIntegrationStatusEntryResolvers<ContextType = PortalContext, ParentType extends ResolversParentTypes['XtmoneIntegrationStatusEntry'] = ResolversParentTypes['XtmoneIntegrationStatusEntry']> = ResolversObject<{
  connected?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  last_checked_at?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = PortalContext> = ResolversObject<{
  BundleUserServiceGroup?: BundleUserServiceGroupResolvers<ContextType>;
  CanUnregisterResponse?: CanUnregisterResponseResolvers<ContextType>;
  Capability?: CapabilityResolvers<ContextType>;
  Competitor?: CompetitorResolvers<ContextType>;
  CompetitorConnection?: CompetitorConnectionResolvers<ContextType>;
  CompetitorEdge?: CompetitorEdgeResolvers<ContextType>;
  CompetitorId?: GraphQLScalarType;
  Connector?: ConnectorResolvers<ContextType>;
  ConsumeProvisionedNewsFeedItemsResponse?: ConsumeProvisionedNewsFeedItemsResponseResolvers<ContextType>;
  CsvFeed?: CsvFeedResolvers<ContextType>;
  CustomDashboard?: CustomDashboardResolvers<ContextType>;
  CustomView?: CustomViewResolvers<ContextType>;
  Date?: GraphQLScalarType;
  DefaultDocument?: DefaultDocumentResolvers<ContextType>;
  DeployedPlatform?: DeployedPlatformResolvers<ContextType>;
  DeployedResource?: DeployedResourceResolvers<ContextType>;
  DeploymentAvailability?: DeploymentAvailabilityResolvers<ContextType>;
  DeploymentRequest?: DeploymentRequestResolvers<ContextType>;
  DeploymentRequestConnection?: DeploymentRequestConnectionResolvers<ContextType>;
  DeploymentRequestEdge?: DeploymentRequestEdgeResolvers<ContextType>;
  DeploymentRequestId?: GraphQLScalarType;
  Document?: DocumentResolvers<ContextType>;
  DocumentConnection?: DocumentConnectionResolvers<ContextType>;
  DocumentEdge?: DocumentEdgeResolvers<ContextType>;
  DocumentId?: GraphQLScalarType;
  Epic?: EpicResolvers<ContextType>;
  EpicConnection?: EpicConnectionResolvers<ContextType>;
  EpicCountPerTimeline?: EpicCountPerTimelineResolvers<ContextType>;
  EpicEdge?: EpicEdgeResolvers<ContextType>;
  GenericServiceCapability?: GenericServiceCapabilityResolvers<ContextType>;
  Integration?: IntegrationResolvers<ContextType>;
  IntegrationHack?: IntegrationHackResolvers<ContextType>;
  IsPlatformRegisteredOrganization?: IsPlatformRegisteredOrganizationResolvers<ContextType>;
  IsPlatformRegisteredResponse?: IsPlatformRegisteredResponseResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  LastDeployedOverview?: LastDeployedOverviewResolvers<ContextType>;
  MeUserSubscription?: MeUserSubscriptionResolvers<ContextType>;
  MergeEvent?: MergeEventResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  NewsFeedItem?: NewsFeedItemResolvers<ContextType>;
  NewsFeedItemConnection?: NewsFeedItemConnectionResolvers<ContextType>;
  NewsFeedItemEdge?: NewsFeedItemEdgeResolvers<ContextType>;
  NewsFeedItemId?: GraphQLScalarType;
  NewsFeedItemMetadata?: NewsFeedItemMetadataResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  OpenAEVScenario?: OpenAevScenarioResolvers<ContextType>;
  OpenCTIPlatformRegistrationStatusResponse?: OpenCtiPlatformRegistrationStatusResponseResolvers<ContextType>;
  OpenCTIPlaybook?: OpenCtiPlaybookResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  OrganizationCapabilities?: OrganizationCapabilitiesResolvers<ContextType>;
  OrganizationConnection?: OrganizationConnectionResolvers<ContextType>;
  OrganizationEdge?: OrganizationEdgeResolvers<ContextType>;
  OrganizationId?: GraphQLScalarType;
  OrganizationRef?: OrganizationRefResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  PlatformDeploymentRequest?: PlatformDeploymentRequestResolvers<ContextType>;
  PlatformDeploymentRequestConnection?: PlatformDeploymentRequestConnectionResolvers<ContextType>;
  PlatformDeploymentRequestEdge?: PlatformDeploymentRequestEdgeResolvers<ContextType>;
  PlatformProvider?: PlatformProviderResolvers<ContextType>;
  PlatformTrialStatus?: PlatformTrialStatusResolvers<ContextType>;
  ProvisionedNewsFeedItem?: ProvisionedNewsFeedItemResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse?: RefreshPlatformRegistrationConnectivityStatusAllTenantsResponseResolvers<ContextType>;
  RefreshPlatformRegistrationConnectivityStatusResponse?: RefreshPlatformRegistrationConnectivityStatusResponseResolvers<ContextType>;
  RefreshUserPlatformTokenResponse?: RefreshUserPlatformTokenResponseResolvers<ContextType>;
  RegisteredPlatform?: RegisteredPlatformResolvers<ContextType>;
  RegisteredProductVersion?: RegisteredProductVersionResolvers<ContextType>;
  RegistrationResponse?: RegistrationResponseResolvers<ContextType>;
  RolePortal?: RolePortalResolvers<ContextType>;
  RssFeed?: RssFeedResolvers<ContextType>;
  SendTelemetryMutation?: SendTelemetryMutationResolvers<ContextType>;
  SeoServiceInstance?: SeoServiceInstanceResolvers<ContextType>;
  SeoServiceInstanceMetadata?: SeoServiceInstanceMetadataResolvers<ContextType>;
  ServiceCapability?: ServiceCapabilityResolvers<ContextType>;
  ServiceCapabilityId?: GraphQLScalarType;
  ServiceConnection?: ServiceConnectionResolvers<ContextType>;
  ServiceDefinition?: ServiceDefinitionResolvers<ContextType>;
  ServiceGroup?: ServiceGroupResolvers<ContextType>;
  ServiceGroupId?: GraphQLScalarType;
  ServiceInstance?: ServiceInstanceResolvers<ContextType>;
  ServiceInstanceEdge?: ServiceInstanceEdgeResolvers<ContextType>;
  ServiceInstanceId?: GraphQLScalarType;
  ServiceInstanceSubscription?: ServiceInstanceSubscriptionResolvers<ContextType>;
  ServiceLink?: ServiceLinkResolvers<ContextType>;
  Settings?: SettingsResolvers<ContextType>;
  ShareableResource?: ShareableResourceResolvers<ContextType>;
  SolutionCategory?: SolutionCategoryResolvers<ContextType>;
  SolutionCategoryConnection?: SolutionCategoryConnectionResolvers<ContextType>;
  SolutionCategoryEdge?: SolutionCategoryEdgeResolvers<ContextType>;
  SolutionCategoryId?: GraphQLScalarType;
  Stream?: StreamResolvers<ContextType>;
  SubscribedServiceInstanceConfiguration?: SubscribedServiceInstanceConfigurationResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  SubscriptionCapability?: SubscriptionCapabilityResolvers<ContextType>;
  SubscriptionConnection?: SubscriptionConnectionResolvers<ContextType>;
  SubscriptionEdge?: SubscriptionEdgeResolvers<ContextType>;
  SubscriptionId?: GraphQLScalarType;
  SubscriptionModel?: SubscriptionModelResolvers<ContextType>;
  Success?: SuccessResolvers<ContextType>;
  TaxiiFeed?: TaxiiFeedResolvers<ContextType>;
  TelemetryResponse?: TelemetryResponseResolvers<ContextType>;
  TenantStatus?: TenantStatusResolvers<ContextType>;
  ThirdPartyIntegration?: ThirdPartyIntegrationResolvers<ContextType>;
  TrialsDeployments?: TrialsDeploymentsResolvers<ContextType>;
  Upload?: GraphQLScalarType;
  UseCase?: UseCaseResolvers<ContextType>;
  UseCaseConnection?: UseCaseConnectionResolvers<ContextType>;
  UseCaseEdge?: UseCaseEdgeResolvers<ContextType>;
  UseCaseId?: GraphQLScalarType;
  User?: UserResolvers<ContextType>;
  UserConnection?: UserConnectionResolvers<ContextType>;
  UserEdge?: UserEdgeResolvers<ContextType>;
  UserId?: GraphQLScalarType;
  UserPendingSubscription?: UserPendingSubscriptionResolvers<ContextType>;
  UserPlatformGroup?: UserPlatformGroupResolvers<ContextType>;
  UserService?: UserServiceResolvers<ContextType>;
  UserServiceCapabilitiesResponse?: UserServiceCapabilitiesResponseResolvers<ContextType>;
  UserServiceCapability?: UserServiceCapabilityResolvers<ContextType>;
  UserServiceConnection?: UserServiceConnectionResolvers<ContextType>;
  UserServiceDeleted?: UserServiceDeletedResolvers<ContextType>;
  UserServiceEdge?: UserServiceEdgeResolvers<ContextType>;
  UserServiceId?: GraphQLScalarType;
  UserSubscription?: UserSubscriptionResolvers<ContextType>;
  VotableFeature?: VotableFeatureResolvers<ContextType>;
  VotableFeatureId?: GraphQLScalarType;
  VotableFeatureResult?: VotableFeatureResultResolvers<ContextType>;
  VotingRound?: VotingRoundResolvers<ContextType>;
  VotingRoundId?: GraphQLScalarType;
  VotingRoundResults?: VotingRoundResultsResolvers<ContextType>;
  XtmoneIntegrationStatus?: XtmoneIntegrationStatusResolvers<ContextType>;
  XtmoneIntegrationStatusEntry?: XtmoneIntegrationStatusEntryResolvers<ContextType>;
}>;

export type DirectiveResolvers<ContextType = PortalContext> = ResolversObject<{
  auth?: AuthDirectiveResolver<any, any, ContextType>;
  platform_token?: Platform_TokenDirectiveResolver<any, any, ContextType>;
  service_capa?: Service_CapaDirectiveResolver<any, any, ContextType>;
  system_token?: System_TokenDirectiveResolver<any, any, ContextType>;
}>;
