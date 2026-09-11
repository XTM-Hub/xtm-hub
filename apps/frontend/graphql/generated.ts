import type { GraphQLClient, RequestOptions } from "graphql-request";
type GraphQLClientRequestHeaders = RequestOptions["requestHeaders"];
import { useMutation, useQuery, useInfiniteQuery, UseMutationOptions, UseQueryOptions, UseInfiniteQueryOptions, InfiniteData } from '@tanstack/react-query';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };

function fetcher<TData, TVariables extends { [key: string]: any }>(client: GraphQLClient, query: string, variables?: TVariables, requestHeaders?: RequestInit['headers']) {
  return async (): Promise<TData> => client.request({
    document: query,
    variables,
    requestHeaders
  });
}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A Relay global ID for Competitor, extracted to a branded CompetitorId string */
  CompetitorId: { input: any; output: any; }
  Date: { input: any; output: any; }
  /** A Relay global ID for DeploymentRequest, extracted to a branded DeploymentRequestId string */
  DeploymentRequestId: { input: any; output: any; }
  /** A Relay global ID for Document, extracted to a branded DocumentId string */
  DocumentId: { input: any; output: any; }
  JSON: { input: any; output: any; }
  /** A Relay global ID for NewsFeedItem, extracted to a branded NewsFeedItemId string */
  NewsFeedItemId: { input: any; output: any; }
  /** A Relay global ID for Organization, extracted to a branded OrganizationId string */
  OrganizationId: { input: any; output: any; }
  /** A Relay global ID for ServiceGroup, extracted to a branded ServiceGroupId string */
  ServiceGroupId: { input: any; output: any; }
  /** A Relay global ID for ServiceInstance, extracted to a branded ServiceInstanceId string */
  ServiceInstanceId: { input: any; output: any; }
  /** A Relay global ID for Service_Capability, extracted to a branded Service_CapabilityId string */
  Service_CapabilityId: { input: any; output: any; }
  /** A Relay global ID for SolutionCategory, extracted to a branded SolutionCategoryId string */
  SolutionCategoryId: { input: any; output: any; }
  /** A Relay global ID for Subscription, extracted to a branded SubscriptionId string */
  SubscriptionId: { input: any; output: any; }
  Upload: { input: any; output: any; }
  /** A Relay global ID for UseCase, extracted to a branded UseCaseId string */
  UseCaseId: { input: any; output: any; }
  /** A Relay global ID for User, extracted to a branded UserId string */
  UserId: { input: any; output: any; }
  /** A Relay global ID for User_Service, extracted to a branded User_ServiceId string */
  User_ServiceId: { input: any; output: any; }
  /** A Relay global ID for VotableFeature, extracted to a branded VotableFeatureId string */
  VotableFeatureId: { input: any; output: any; }
  /** A Relay global ID for VotingRound, extracted to a branded VotingRoundId string */
  VotingRoundId: { input: any; output: any; }
};

export type AddServiceInput = {
  fee_type: InputMaybe<Scalars['String']['input']>;
  organization_id: InputMaybe<Scalars['String']['input']>;
  price: InputMaybe<Scalars['Int']['input']>;
  service_instance_description: InputMaybe<Scalars['String']['input']>;
  service_instance_name: InputMaybe<Scalars['String']['input']>;
  url: InputMaybe<Scalars['String']['input']>;
};

export type AddSolutionCategoryInput = {
  name: Scalars['String']['input'];
  product: InputMaybe<Array<FiligranProduct>>;
};

export type AddSubscriptionCapabilityInput = {
  capabilitiesId: Array<Scalars['Service_CapabilityId']['input']>;
  subscriptionsId: Array<Scalars['SubscriptionId']['input']>;
};

export type AddUseCaseInput = {
  color: Scalars['String']['input'];
  name: Scalars['String']['input'];
  product: InputMaybe<Array<FiligranProduct>>;
};

export type AddUserInput = {
  capabilities: InputMaybe<Array<Scalars['String']['input']>>;
  email: Scalars['String']['input'];
  password: InputMaybe<Scalars['String']['input']>;
};

export type AddUsersToBundleGroupsInput = {
  roles: Array<BundleUserRoleAssignmentInput>;
  userIds: Array<Scalars['UserId']['input']>;
};

export type AdminAddUserInput = {
  email: Scalars['String']['input'];
  first_name: InputMaybe<Scalars['String']['input']>;
  last_name: InputMaybe<Scalars['String']['input']>;
  organization_capabilities: InputMaybe<Array<OrganizationCapabilitiesInput>>;
  password: InputMaybe<Scalars['String']['input']>;
};

export type AdminEditUserInput = {
  disabled: InputMaybe<Scalars['Boolean']['input']>;
  email: InputMaybe<Scalars['String']['input']>;
  first_name: InputMaybe<Scalars['String']['input']>;
  last_name: InputMaybe<Scalars['String']['input']>;
  organization_capabilities: InputMaybe<Array<OrganizationCapabilitiesInput>>;
};

export type AutoRegisterPlatformInput = {
  existing_users_count: InputMaybe<Scalars['Int']['input']>;
  platform: PlatformInput;
};

export type BulkPendingUserFromOrganizationInput = {
  excludedIds: InputMaybe<Array<Scalars['UserId']['input']>>;
  filters: InputMaybe<Array<Filter>>;
  ids: InputMaybe<Array<Scalars['UserId']['input']>>;
  searchTerm: InputMaybe<Scalars['String']['input']>;
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
  tenantId: InputMaybe<Scalars['String']['input']>;
};

export type CanUnregisterResponse = {
  __typename?: 'CanUnregisterResponse';
  isAllowed: Maybe<Scalars['Boolean']['output']>;
  isInOrganization: Maybe<Scalars['Boolean']['output']>;
  isPlatformRegistered: Scalars['Boolean']['output'];
  organizationId: Maybe<Scalars['OrganizationId']['output']>;
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
  blogpost_url: Maybe<Scalars['String']['output']>;
  children_documents: Maybe<Array<ShareableResource>>;
  contact: Maybe<Scalars['String']['output']>;
  container_image: Maybe<Scalars['String']['output']>;
  created_at: Scalars['Date']['output'];
  datasheet_url: Maybe<Scalars['String']['output']>;
  demo_url: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  file_name: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type: Maybe<LicenseType>;
  manager_supported: Scalars['Boolean']['output'];
  minimum_deployable_version: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  playbook_supported: Scalars['Boolean']['output'];
  product_version: Maybe<Scalars['String']['output']>;
  remover_id: Maybe<Scalars['ID']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories: Maybe<Array<SolutionCategory>>;
  source_code: Maybe<Scalars['String']['output']>;
  subscription: Maybe<SubscriptionModel>;
  subscription_link: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
  verified: Scalars['Boolean']['output'];
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
  activity_sector: InputMaybe<DeploymentRequestActivitySector>;
  job_title: InputMaybe<DeploymentRequestJobTitle>;
  products: Array<PlatformIdentifier>;
  region: DeploymentRequestPlatformRegion;
  source: DeploymentRequestSource;
  type: DeploymentRequestDeploymentType;
  use_cases_by_product: InputMaybe<Array<ProductUseCaseInput>>;
};

export type CreateDocumentInput = {
  active: Scalars['Boolean']['input'];
  description: Scalars['String']['input'];
  entity_types: InputMaybe<Array<Scalars['String']['input']>>;
  license_type: InputMaybe<LicenseType>;
  name: Scalars['String']['input'];
  short_description: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  solution_categories: Array<Scalars['SolutionCategoryId']['input']>;
  uploader_id: Scalars['UserId']['input'];
  use_cases: Array<Scalars['UseCaseId']['input']>;
};

export type CreateEpicInput = {
  active: InputMaybe<Scalars['Boolean']['input']>;
  description: Scalars['String']['input'];
  edition_type: EditionType;
  illustration_document: InputMaybe<Scalars['Upload']['input']>;
  is_integration: InputMaybe<Scalars['Boolean']['input']>;
  product: Array<FiligranProduct>;
  short_description: Scalars['String']['input'];
  slack_link: InputMaybe<Scalars['String']['input']>;
  timeline: Timeline;
  title: Scalars['String']['input'];
};

export type CreateSubscriptionsInput = {
  capability_ids: InputMaybe<Array<Scalars['Service_CapabilityId']['input']>>;
  end_date: InputMaybe<Scalars['Date']['input']>;
  organization_id: Array<Scalars['OrganizationId']['input']>;
  service_instance_id: Scalars['ServiceInstanceId']['input'];
  start_date: Scalars['Date']['input'];
};

export type CreateVotableFeatureInput = {
  active: InputMaybe<Scalars['Boolean']['input']>;
  description: Scalars['String']['input'];
  position: InputMaybe<Scalars['Int']['input']>;
  product: FiligranProduct;
  short_description: Scalars['String']['input'];
  title: Scalars['String']['input'];
  use_case_ids: InputMaybe<Array<Scalars['UseCaseId']['input']>>;
  voting_round_id: Scalars['VotingRoundId']['input'];
};

export type CreateVotingRoundInput = {
  copy_features_from_round_id: InputMaybe<Scalars['VotingRoundId']['input']>;
  description: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  service_instance_id: Scalars['ServiceInstanceId']['input'];
  theme: InputMaybe<VotingRoundTheme>;
};

export type CsvFeed = Document & Integration & Node & {
  __typename?: 'CsvFeed';
  active: Scalars['Boolean']['output'];
  blogpost_url: Maybe<Scalars['String']['output']>;
  children_documents: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url: Maybe<Scalars['String']['output']>;
  demo_url: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  feed_url: Maybe<Scalars['String']['output']>;
  file_name: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  remover_id: Maybe<Scalars['ID']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories: Maybe<Array<SolutionCategory>>;
  subscription: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
};

export type CustomDashboard = Document & Node & {
  __typename?: 'CustomDashboard';
  active: Scalars['Boolean']['output'];
  children_documents: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  file_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  product_version: Maybe<Scalars['String']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  subscription: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
};

export type CustomView = Document & Node & {
  __typename?: 'CustomView';
  active: Scalars['Boolean']['output'];
  children_documents: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  entity_types: Maybe<Array<Scalars['String']['output']>>;
  file_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  product_version: Maybe<Scalars['String']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  subscription: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
};

/**
 * /!\ WARNING Do not use this type.
 * It exists only to cover cases where we failed to map to a specific Document.
 */
export type DefaultDocument = Document & Node & {
  __typename?: 'DefaultDocument';
  active: Scalars['Boolean']['output'];
  children_documents: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  file_name: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Maybe<Scalars['String']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Maybe<Scalars['String']['output']>;
  subscription: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
};

export type DeployedPlatform = {
  __typename?: 'DeployedPlatform';
  platformIdentifier: PlatformIdentifier;
  serviceInstanceId: Scalars['ServiceInstanceId']['output'];
};

export type DeployedResource = {
  __typename?: 'DeployedResource';
  deployedAt: Scalars['Date']['output'];
  deployedBy: Maybe<User>;
  document: Document;
};

export type DeploymentAvailability = {
  __typename?: 'DeploymentAvailability';
  availableCount: Scalars['Int']['output'];
  capacity: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  platform_identifier: Maybe<PlatformIdentifier>;
  region: DeploymentRequestPlatformRegion;
};

export type DeploymentRequest = Node & {
  __typename?: 'DeploymentRequest';
  activity_sector: Maybe<DeploymentRequestActivitySector>;
  cancellation_date: Maybe<Scalars['Date']['output']>;
  cancellation_reason: Maybe<Scalars['String']['output']>;
  cancellation_user_email: Maybe<Scalars['String']['output']>;
  children: Maybe<Array<DeploymentRequest>>;
  counts_in_orga_quota: Scalars['Boolean']['output'];
  end_date: Maybe<Scalars['Date']['output']>;
  hub_status: DeploymentRequestHubStatus;
  id: Scalars['ID']['output'];
  job_title: Maybe<DeploymentRequestJobTitle>;
  ordering: Scalars['Int']['output'];
  organization_name: Maybe<Scalars['String']['output']>;
  organization_requester_id: Scalars['OrganizationId']['output'];
  parent_id: Maybe<Scalars['DeploymentRequestId']['output']>;
  platform_id: Maybe<Scalars['String']['output']>;
  platform_identifier: Maybe<PlatformIdentifier>;
  platform_url: Maybe<Scalars['String']['output']>;
  region: DeploymentRequestPlatformRegion;
  registered_platform: Maybe<RegisteredPlatform>;
  request_date: Scalars['Date']['output'];
  requester_email: Maybe<Scalars['String']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Scalars['ServiceInstanceId']['output'];
  start_date: Maybe<Scalars['Date']['output']>;
  type: DeploymentRequestDeploymentType;
  url: Maybe<Scalars['String']['output']>;
  use_case: Maybe<DeploymentRequestUseCase>;
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
  key: InputMaybe<DeploymentRequestFilterKey>;
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
  children_documents: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  file_name: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Maybe<Scalars['String']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Maybe<Scalars['String']['output']>;
  subscription: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
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
  country: InputMaybe<Scalars['String']['input']>;
  first_name: InputMaybe<Scalars['String']['input']>;
  last_name: InputMaybe<Scalars['String']['input']>;
  selected_language: InputMaybe<Scalars['String']['input']>;
};

export type EditSeoServiceInstanceInput = {
  meta_description: Scalars['String']['input'];
  meta_title: Scalars['String']['input'];
};

export type EditSolutionCategoryInput = {
  name: InputMaybe<Scalars['String']['input']>;
  product: InputMaybe<Array<FiligranProduct>>;
};

export type EditUseCaseInput = {
  color: InputMaybe<Scalars['String']['input']>;
  name: InputMaybe<Scalars['String']['input']>;
  product: InputMaybe<Array<FiligranProduct>>;
};

export type EditUserCapabilitiesInput = {
  capabilities: InputMaybe<Array<Scalars['String']['input']>>;
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
  document: Maybe<Document>;
  document_id: Maybe<Scalars['DocumentId']['output']>;
  edition_type: EditionType;
  epic_type: EpicType;
  id: Scalars['ID']['output'];
  product: Array<FiligranProduct>;
  short_description: Scalars['String']['output'];
  slack_link: Maybe<Scalars['String']['output']>;
  timeline: Timeline;
  title: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
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
  name: Maybe<Scalars['String']['output']>;
};

export type Integration = {
  active: Scalars['Boolean']['output'];
  blogpost_url: Maybe<Scalars['String']['output']>;
  children_documents: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url: Maybe<Scalars['String']['output']>;
  demo_url: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  file_name: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  remover_id: Maybe<Scalars['ID']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories: Maybe<Array<SolutionCategory>>;
  subscription: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
};

export type IntegrationHack = Document & Integration & Node & {
  __typename?: 'IntegrationHack';
  active: Scalars['Boolean']['output'];
  blogpost_url: Maybe<Scalars['String']['output']>;
  children_documents: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url: Maybe<Scalars['String']['output']>;
  demo_url: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  file_name: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  remover_id: Maybe<Scalars['ID']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories: Maybe<Array<SolutionCategory>>;
  subscription: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
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
  tenantId: InputMaybe<Scalars['String']['input']>;
};

export type IsPlatformRegisteredOrganization = Node & {
  __typename?: 'IsPlatformRegisteredOrganization';
  id: Scalars['ID']['output'];
};

export type IsPlatformRegisteredResponse = {
  __typename?: 'IsPlatformRegisteredResponse';
  organization: Maybe<IsPlatformRegisteredOrganization>;
  platformTitle: Maybe<Scalars['String']['output']>;
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
  children: InputMaybe<Array<LogicalFilterInput>>;
  leaf: InputMaybe<Filter>;
  operator: InputMaybe<LogicalOperator>;
};

export enum LogicalOperator {
  And = 'AND',
  Or = 'OR'
}

export type ManifestFragmentInput = {
  additional_properties: Scalars['JSON']['input'];
  config_schema: Scalars['JSON']['input'];
  contact: InputMaybe<Scalars['String']['input']>;
  description: Scalars['String']['input'];
  id: Scalars['String']['input'];
  image_name: Scalars['String']['input'];
  image_type: Scalars['String']['input'];
  integration_type: Scalars['String']['input'];
  last_verified_date: InputMaybe<Scalars['String']['input']>;
  license_type: InputMaybe<LicenseType>;
  logo: Scalars['String']['input'];
  manager_supported: Scalars['Boolean']['input'];
  min_version: Scalars['String']['input'];
  platform: Scalars['String']['input'];
  short_description: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  solution_categories: Array<Scalars['String']['input']>;
  source_code: Scalars['String']['input'];
  subscription_link: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  use_cases: Array<Scalars['String']['input']>;
  verified: InputMaybe<Scalars['Boolean']['input']>;
  version: Scalars['String']['input'];
};

export enum ManifestType {
  Connector = 'connector'
}

export type MeUserSubscription = {
  __typename?: 'MeUserSubscription';
  delete: Maybe<User>;
  edit: Maybe<User>;
};

export type MergeEvent = Node & {
  __typename?: 'MergeEvent';
  from: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  target: Scalars['ID']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptPendingUserInOrganization: Maybe<User>;
  addCapabilitiesToUserServices: Maybe<Array<Maybe<UserService>>>;
  addOrganization: Maybe<Organization>;
  addServicePicture: Maybe<ServiceInstance>;
  addSolutionCategory: SolutionCategory;
  addSubscription: Maybe<ServiceInstance>;
  addSubscriptionCapability: Array<SubscriptionModel>;
  addUseCase: UseCase;
  addUser: Maybe<User>;
  addUserService: Maybe<Array<Maybe<UserService>>>;
  addUsersToBundleGroups: Array<BundleUserServiceGroup>;
  adminAddUser: Maybe<User>;
  adminCancelDeploymentRequest: Maybe<DeploymentRequest>;
  adminEditUser: User;
  autoRegisterPlatform: Success;
  bulkAcceptPendingUserInOrganization: Maybe<Success>;
  bulkRemovePendingUserFromOrganization: Maybe<Success>;
  cancelDeploymentRequest: Maybe<DeploymentRequest>;
  changeSelectedOrganization: Maybe<User>;
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
  deleteEpic: Maybe<Epic>;
  deleteNewsFeedItem: Scalars['Boolean']['output'];
  deleteOrganization: Maybe<Organization>;
  deleteSolutionCategory: SolutionCategory;
  deleteSubscriptions: Array<SubscriptionModel>;
  deleteUseCase: UseCase;
  deleteUser: User;
  deleteUserServices: Maybe<Array<Maybe<UserService>>>;
  deleteVotableFeature: VotableFeature;
  deleteVotingRound: VotingRound;
  editMeUser: User;
  editOrganization: Maybe<Organization>;
  editSeoServiceInstance: SeoServiceInstanceMetadata;
  editSolutionCategory: SolutionCategory;
  editUseCase: UseCase;
  editUserCapabilities: User;
  editUserService: Maybe<UserService>;
  frontendErrorLog: Maybe<Scalars['Boolean']['output']>;
  generateManifest: Success;
  incrementShareNumberDocument: Document;
  ingestManifestFragments: Success;
  login: Maybe<User>;
  logout: Scalars['ID']['output'];
  newProductVersion: Success;
  refreshPlatformRegistrationConnectivityStatus: RefreshPlatformRegistrationConnectivityStatusResponse;
  refreshPlatformRegistrationConnectivityStatusAllTenants: RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse;
  refreshPlatformRegistrationConnectivityStatusSingleTenant: RefreshPlatformRegistrationConnectivityStatusResponse;
  refreshUserPlatformToken: RefreshUserPlatformTokenResponse;
  registerPlatform: RegistrationResponse;
  removePendingUserFromOrganization: Maybe<User>;
  removeUserFromOrganization: Maybe<User>;
  removeUsersFromBundleGroups: Array<Scalars['UserId']['output']>;
  reorderDeploymentRequestInQueue: Success;
  requestTransferPersonalSpace: Success;
  resetPassword: Success;
  sendTelemetryEvent: Maybe<SendTelemetryMutation>;
  setVotingRoundStatus: Array<VotingRound>;
  transferPersonalSpace: Success;
  unregisterPlatform: Success;
  updateBundleUserGroups: Array<BundleUserServiceGroup>;
  updateCompetitor: Competitor;
  updateDeploymentQuotaCapacity: Success;
  updateDeploymentRequest: PlatformDeploymentRequest;
  updateDocument: Document;
  updateEpic: Epic;
  updatePlatformServiceMetadata: Maybe<RegisteredPlatform>;
  updateServiceGroups: Array<ServiceGroup>;
  updateSubscription: Maybe<SubscriptionModel>;
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
  document: InputMaybe<Scalars['Upload']['input']>;
  isLogo: Scalars['Boolean']['input'];
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};


export type MutationAddSolutionCategoryArgs = {
  input: AddSolutionCategoryInput;
};


export type MutationAddSubscriptionArgs = {
  service_instance_id: InputMaybe<Scalars['ServiceInstanceId']['input']>;
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
  input: InputMaybe<AutoRegisterPlatformInput>;
  platform: InputMaybe<PlatformInput>;
};


export type MutationBulkAcceptPendingUserInOrganizationArgs = {
  input: BulkPendingUserFromOrganizationInput;
};


export type MutationBulkRemovePendingUserFromOrganizationArgs = {
  input: BulkPendingUserFromOrganizationInput;
};


export type MutationCancelDeploymentRequestArgs = {
  cancellationReason: InputMaybe<Scalars['String']['input']>;
  deploymentRequestId: Scalars['DeploymentRequestId']['input'];
};


export type MutationChangeSelectedOrganizationArgs = {
  organization_id: Scalars['OrganizationId']['input'];
};


export type MutationContactUsArgs = {
  deploymentRequestType: InputMaybe<DeploymentRequestDeploymentType>;
  message: InputMaybe<Scalars['String']['input']>;
  platformId: InputMaybe<Scalars['ID']['input']>;
  platformIdentifier: InputMaybe<PlatformIdentifier>;
};


export type MutationCreateCompetitorArgs = {
  input: CreateCompetitorInput;
};


export type MutationCreateDeploymentRequestArgs = {
  input: CreateDeploymentRequestInput;
};


export type MutationCreateDocumentArgs = {
  images: InputMaybe<Array<Scalars['Upload']['input']>>;
  input: CreateDocumentInput;
  logo: InputMaybe<Scalars['Upload']['input']>;
  metadata: Array<DocumentMetadata>;
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
  sourceDocument: InputMaybe<Scalars['Upload']['input']>;
};


export type MutationCreateEpicArgs = {
  document: InputMaybe<Array<Scalars['Upload']['input']>>;
  input: CreateEpicInput;
};


export type MutationCreateSubscriptionsArgs = {
  input: CreateSubscriptionsInput;
};


export type MutationCreateVotableFeatureArgs = {
  document: InputMaybe<Array<Scalars['Upload']['input']>>;
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
  forceDelete: InputMaybe<Scalars['Boolean']['input']>;
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
  codeStack: InputMaybe<Scalars['String']['input']>;
  componentStack: InputMaybe<Scalars['String']['input']>;
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
  password: InputMaybe<Scalars['String']['input']>;
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
  existingImageIds: InputMaybe<Array<Scalars['DocumentId']['input']>>;
  images: InputMaybe<Array<Scalars['Upload']['input']>>;
  input: UpdateDocumentInput;
  logo: InputMaybe<Scalars['Upload']['input']>;
  metadata: Array<DocumentMetadata>;
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
  sourceDocument: InputMaybe<Scalars['Upload']['input']>;
};


export type MutationUpdateEpicArgs = {
  document: InputMaybe<Array<Scalars['Upload']['input']>>;
  id: Scalars['ID']['input'];
  input: UpdateEpicInput;
};


export type MutationUpdatePlatformServiceMetadataArgs = {
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
  document: InputMaybe<Array<Scalars['Upload']['input']>>;
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
  value: Maybe<Scalars['String']['output']>;
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
  children_documents: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  file_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  product_version: Maybe<Scalars['String']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  subscription: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
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
  children_documents: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  file_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  product_version: Maybe<Scalars['String']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  subscription: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
};

export enum OrderingMode {
  Asc = 'asc',
  Desc = 'desc'
}

export type Organization = Node & {
  __typename?: 'Organization';
  capabilityUser: Maybe<Array<Maybe<Capability>>>;
  domains: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  personal_space: Scalars['Boolean']['output'];
};

export type OrganizationCapabilities = Node & {
  __typename?: 'OrganizationCapabilities';
  capabilities: Maybe<Array<OrganizationCapability>>;
  id: Scalars['ID']['output'];
  organization: Organization;
};

export type OrganizationCapabilitiesInput = {
  capabilities: InputMaybe<Array<Scalars['String']['input']>>;
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
  domains: InputMaybe<Array<Scalars['String']['input']>>;
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
  endCursor: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor: Maybe<Scalars['String']['output']>;
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
  activity_sector: Maybe<DeploymentRequestActivitySector>;
  actual_state: Maybe<DeploymentRequestPlatformState>;
  end_date: Maybe<Scalars['Date']['output']>;
  failure_reason: Maybe<Scalars['String']['output']>;
  hub_status: DeploymentRequestHubStatus;
  id: Scalars['ID']['output'];
  job_title: Maybe<DeploymentRequestJobTitle>;
  ordering: Scalars['Int']['output'];
  organization_domains: Maybe<Array<Scalars['String']['output']>>;
  organization_name: Scalars['String']['output'];
  parent_id: Maybe<Scalars['String']['output']>;
  platform_id: Maybe<Scalars['String']['output']>;
  platform_identifier: Maybe<PlatformIdentifier>;
  platform_token: Scalars['String']['output'];
  platform_url: Maybe<Scalars['String']['output']>;
  region: DeploymentRequestPlatformRegion;
  requester_email: Scalars['String']['output'];
  requester_first_name: Maybe<Scalars['String']['output']>;
  requester_last_name: Maybe<Scalars['String']['output']>;
  start_date: Maybe<Scalars['Date']['output']>;
  target_state: Maybe<DeploymentRequestPlatformState>;
  type: DeploymentRequestDeploymentType;
  url: Maybe<Scalars['String']['output']>;
  use_case: Maybe<DeploymentRequestUseCase>;
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
  tenantId: InputMaybe<Scalars['String']['input']>;
  tenantName: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  url: Scalars['String']['input'];
  version: InputMaybe<Scalars['String']['input']>;
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
  end_date: Maybe<Scalars['Date']['output']>;
  hub_status: Maybe<DeploymentRequestHubStatus>;
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
  currentVotingRound: Maybe<VotingRound>;
  deploymentRequests: PlatformDeploymentRequestConnection;
  deploymentRequestsAvailable: Array<DeploymentAvailability>;
  deploymentRequestsList: DeploymentRequestConnection;
  document: Maybe<Document>;
  documentExists: Maybe<Scalars['Boolean']['output']>;
  documents: DocumentConnection;
  epics: Maybe<EpicConnection>;
  isPlatformRegistered: IsPlatformRegisteredResponse;
  lastDeployedOverview: LastDeployedOverview;
  me: Maybe<User>;
  mostDeployedDocuments: Array<Document>;
  newestDocuments: Array<Document>;
  newsFeedItems: NewsFeedItemConnection;
  node: Maybe<Node>;
  /** @deprecated Use `refreshPlatformRegistrationConnectivityStatus` instead. This field is no longer used in the OpenCTI platform due to refactoring and the addition of a version value in the endpoint. */
  openCTIPlatformRegistrationStatus: OpenCtiPlatformRegistrationStatusResponse;
  organization: Maybe<Organization>;
  organizations: OrganizationConnection;
  pendingUsers: UserConnection;
  platformAssociatedOrganization: Maybe<Organization>;
  platformTrialStatus: PlatformTrialStatus;
  publicDocumentBySlug: Maybe<Document>;
  publicDocuments: DocumentConnection;
  publicDocumentsByServiceSlug: Array<Document>;
  registeredPlatform: Maybe<RegisteredPlatform>;
  registeredPlatforms: Array<RegisteredPlatform>;
  registeredProductVersions: Array<RegisteredProductVersion>;
  seoServiceInstance: SeoServiceInstance;
  seoServiceInstanceMetadata: Array<SeoServiceInstanceMetadata>;
  seoServiceInstances: Array<SeoServiceInstance>;
  serviceGroups: Array<ServiceGroup>;
  serviceInstanceById: Maybe<ServiceInstance>;
  serviceInstanceLinksByTags: Array<SeoServiceInstance>;
  serviceInstances: ServiceConnection;
  settings: Settings;
  solutionCategories: Maybe<SolutionCategoryConnection>;
  subscriptionById: Maybe<SubscriptionModel>;
  subscriptions: SubscriptionConnection;
  trialDeployments: TrialsDeployments;
  updateOpenCTIManifest: Success;
  useCases: Maybe<UseCaseConnection>;
  userOrganizations: Array<Organization>;
  userServiceCapabilities: UserServiceCapabilitiesResponse;
  userServiceFromSubscription: Maybe<UserServiceConnection>;
  users: UserConnection;
  usersWithCapabilitiesInOrganization: Array<User>;
  votingRound: Maybe<VotingRound>;
  votingRoundResults: VotingRoundResults;
  votingRounds: Array<VotingRound>;
  xtmPlatformBundle: Maybe<DeploymentRequest>;
  xtmonePlatformIntegrationStatus: Maybe<XtmoneIntegrationStatus>;
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
  after: InputMaybe<Scalars['ID']['input']>;
  first: Scalars['Int']['input'];
  orderBy: CompetitorOrdering;
  orderMode: OrderingMode;
};


export type QueryCurrentVotingRoundArgs = {
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type QueryDeploymentRequestsArgs = {
  after: InputMaybe<Scalars['ID']['input']>;
  filters: InputMaybe<Array<DeploymentRequestFilter>>;
  first: Scalars['Int']['input'];
};


export type QueryDeploymentRequestsAvailableArgs = {
  platformIdentifier: InputMaybe<PlatformIdentifier>;
};


export type QueryDeploymentRequestsListArgs = {
  after: InputMaybe<Scalars['ID']['input']>;
  filters: InputMaybe<Array<DeploymentRequestFilter>>;
  first: Scalars['Int']['input'];
  orderBy: DeploymentRequestOrdering;
  orderMode: OrderingMode;
  searchTerm: InputMaybe<Scalars['String']['input']>;
};


export type QueryDocumentArgs = {
  documentId: Scalars['DocumentId']['input'];
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};


export type QueryDocumentExistsArgs = {
  documentName: InputMaybe<Scalars['String']['input']>;
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type QueryDocumentsArgs = {
  after: InputMaybe<Scalars['ID']['input']>;
  first: Scalars['Int']['input'];
  logicalFilters: InputMaybe<LogicalFilterInput>;
  orderBy: DocumentOrdering;
  orderMode: OrderingMode;
  parentsOnly: InputMaybe<Scalars['Boolean']['input']>;
  searchTerm: InputMaybe<Scalars['String']['input']>;
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
};


export type QueryEpicsArgs = {
  after: InputMaybe<Scalars['ID']['input']>;
  first: Scalars['Int']['input'];
  orderBy: EpicOrdering;
  orderMode: OrderingMode;
  searchTerm: InputMaybe<Scalars['String']['input']>;
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
  platformIdentifiers: InputMaybe<Array<PlatformIdentifier>>;
};


export type QueryNewestDocumentsArgs = {
  limit: Scalars['Int']['input'];
  platformIdentifiers: InputMaybe<Array<PlatformIdentifier>>;
};


export type QueryNewsFeedItemsArgs = {
  after: InputMaybe<Scalars['ID']['input']>;
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
  after: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy: OrganizationOrdering;
  orderMode: OrderingMode;
  searchTerm: InputMaybe<Scalars['String']['input']>;
};


export type QueryPendingUsersArgs = {
  after: InputMaybe<Scalars['ID']['input']>;
  filters: InputMaybe<Array<Filter>>;
  first: Scalars['Int']['input'];
  orderBy: UserOrdering;
  orderMode: OrderingMode;
  searchTerm: InputMaybe<Scalars['String']['input']>;
};


export type QueryPlatformAssociatedOrganizationArgs = {
  platformId: Scalars['String']['input'];
  tenantId: InputMaybe<Scalars['String']['input']>;
};


export type QueryPlatformTrialStatusArgs = {
  organizationId: Scalars['OrganizationId']['input'];
};


export type QueryPublicDocumentBySlugArgs = {
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
  slug: Scalars['String']['input'];
};


export type QueryPublicDocumentsArgs = {
  after: InputMaybe<Scalars['ID']['input']>;
  first: Scalars['Int']['input'];
  logicalFilters: InputMaybe<LogicalFilterInput>;
  orderBy: DocumentOrdering;
  orderMode: OrderingMode;
  searchTerm: InputMaybe<Scalars['String']['input']>;
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
  language: InputMaybe<SeoServiceInstanceLanguage>;
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
  after: InputMaybe<Scalars['ID']['input']>;
  filters: InputMaybe<Array<ServiceInstanceFilter>>;
  first: Scalars['Int']['input'];
  includeInaccessible: InputMaybe<Scalars['Boolean']['input']>;
  orderBy: ServiceInstanceOrdering;
  orderMode: OrderingMode;
  searchTerm: InputMaybe<Scalars['String']['input']>;
};


export type QuerySolutionCategoriesArgs = {
  after: InputMaybe<Scalars['ID']['input']>;
  first: Scalars['Int']['input'];
  orderBy: SolutionCategoryOrdering;
  orderMode: OrderingMode;
  product: InputMaybe<FiligranProduct>;
  searchTerm: InputMaybe<Scalars['String']['input']>;
};


export type QuerySubscriptionByIdArgs = {
  subscription_id: InputMaybe<Scalars['SubscriptionId']['input']>;
};


export type QuerySubscriptionsArgs = {
  after: InputMaybe<Scalars['ID']['input']>;
  filters: InputMaybe<Array<SubscriptionFilter>>;
  first: Scalars['Int']['input'];
  orderBy: SubscriptionOrdering;
  orderMode: OrderingMode;
  searchTerm: InputMaybe<Scalars['String']['input']>;
};


export type QueryTrialDeploymentsArgs = {
  input: TrialDeploymentsInput;
};


export type QueryUpdateOpenCtiManifestArgs = {
  tag: Scalars['String']['input'];
};


export type QueryUseCasesArgs = {
  after: InputMaybe<Scalars['ID']['input']>;
  documentType: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
  orderBy: UseCaseOrdering;
  orderMode: OrderingMode;
  product: InputMaybe<FiligranProduct>;
  searchTerm: InputMaybe<Scalars['String']['input']>;
};


export type QueryUserServiceCapabilitiesArgs = {
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};


export type QueryUserServiceFromSubscriptionArgs = {
  after: InputMaybe<Scalars['ID']['input']>;
  first: Scalars['Int']['input'];
  orderBy: UserServiceOrdering;
  orderMode: OrderingMode;
  subscription_id: Scalars['SubscriptionId']['input'];
};


export type QueryUsersArgs = {
  after: InputMaybe<Scalars['ID']['input']>;
  filters: InputMaybe<Array<Filter>>;
  first: Scalars['Int']['input'];
  orderBy: UserOrdering;
  orderMode: OrderingMode;
  searchTerm: InputMaybe<Scalars['String']['input']>;
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
  service_instance_id: InputMaybe<Scalars['ServiceInstanceId']['input']>;
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
  platformIdentifier: InputMaybe<PlatformIdentifier>;
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
  deployment_request: Maybe<DeploymentRequest>;
  id: Scalars['ID']['output'];
  identifier: ServiceDefinitionIdentifier;
  illustration_document_id: Maybe<Scalars['DocumentId']['output']>;
  last_connectivity_check: Maybe<Scalars['Date']['output']>;
  myGroups: Maybe<Array<ServiceGroup>>;
  platform_id: Scalars['String']['output'];
  status: Maybe<PlatformConfigurationStatus>;
  subscription: Maybe<SubscriptionModel>;
  tenant_id: Maybe<Scalars['String']['output']>;
  tenant_name: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  url: Scalars['String']['output'];
  version: Maybe<Scalars['String']['output']>;
};

export type RegisteredPlatformInput = {
  service_instance_id: Scalars['ServiceInstanceId']['input'];
};

export type RegisteredPlatformsInput = {
  hasDeployedResources: InputMaybe<Scalars['Boolean']['input']>;
  identifier: InputMaybe<PlatformIdentifier>;
  onlyActive: InputMaybe<Scalars['Boolean']['input']>;
  onlyTrial: InputMaybe<Scalars['Boolean']['input']>;
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
  blogpost_url: Maybe<Scalars['String']['output']>;
  children_documents: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url: Maybe<Scalars['String']['output']>;
  demo_url: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  feed_url: Maybe<Scalars['String']['output']>;
  file_name: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  remover_id: Maybe<Scalars['ID']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories: Maybe<Array<SolutionCategory>>;
  subscription: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
};

export type SendTelemetryMutation = {
  __typename?: 'SendTelemetryMutation';
  oneClickDeploy: Maybe<TelemetryResponse>;
};


export type SendTelemetryMutationOneClickDeployArgs = {
  input: OneClickDeployInput;
};

export type SeoServiceInstance = Node & {
  __typename?: 'SeoServiceInstance';
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  illustration_document_id: Maybe<Scalars['DocumentId']['output']>;
  links: Maybe<Array<Maybe<ServiceLink>>>;
  logo_document_id: Maybe<Scalars['DocumentId']['output']>;
  name: Scalars['String']['output'];
  service_definition: ServiceDefinition;
  slug: Maybe<Scalars['String']['output']>;
  tags: Maybe<Array<ServiceInstanceTag>>;
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
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Maybe<Scalars['String']['output']>;
  service_definition_id: Maybe<Scalars['ID']['output']>;
};

export type ServiceConnection = {
  __typename?: 'ServiceConnection';
  edges: Array<ServiceInstanceEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ServiceDefinition = Node & {
  __typename?: 'ServiceDefinition';
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  identifier: ServiceDefinitionIdentifier;
  name: Scalars['String']['output'];
  public: Maybe<Scalars['Boolean']['output']>;
  service_capability: Maybe<Array<Maybe<ServiceCapability>>>;
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
  users: Maybe<Array<User>>;
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
  creation_status: Maybe<ServiceInstanceCreationStatus>;
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  illustration_document_id: Maybe<Scalars['DocumentId']['output']>;
  links: Maybe<Array<Maybe<ServiceLink>>>;
  logo_document_id: Maybe<Scalars['DocumentId']['output']>;
  name: Scalars['String']['output'];
  ordering: Scalars['Int']['output'];
  organization: Maybe<Array<Maybe<Organization>>>;
  organization_subscribed: Maybe<Scalars['Boolean']['output']>;
  public: Maybe<Scalars['Boolean']['output']>;
  service_definition: Maybe<ServiceDefinition>;
  slug: Maybe<Scalars['String']['output']>;
  subscriptions: Maybe<Array<Maybe<SubscriptionModel>>>;
  tags: Maybe<Array<ServiceInstanceTag>>;
  user_joined: Maybe<Scalars['Boolean']['output']>;
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
  node: Maybe<ServiceInstance>;
};

export type ServiceInstanceFilter = {
  key: InputMaybe<ServiceInstanceFilterKey>;
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
  add: Maybe<ServiceInstance>;
  delete: Maybe<ServiceInstance>;
  edit: Maybe<ServiceInstance>;
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
  name: Maybe<Scalars['String']['output']>;
  service_instance_id: Maybe<Scalars['ID']['output']>;
  url: Maybe<Scalars['String']['output']>;
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
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  file_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  image_type: Maybe<DocumentImageType>;
  name: Maybe<Scalars['String']['output']>;
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
  blogpost_url: Maybe<Scalars['String']['output']>;
  children_documents: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url: Maybe<Scalars['String']['output']>;
  demo_url: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  feed_url: Maybe<Scalars['String']['output']>;
  file_name: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  remover_id: Maybe<Scalars['ID']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories: Maybe<Array<SolutionCategory>>;
  subscription: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
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
  MeUser: Maybe<MeUserSubscription>;
  ServiceInstance: Maybe<ServiceInstanceSubscription>;
  User: Maybe<UserSubscription>;
  UserPending: Maybe<UserPendingSubscription>;
};


export type SubscriptionUserArgs = {
  organizationId: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionUserPendingArgs = {
  organizationId: Scalars['ID']['input'];
};

export type SubscriptionCapability = Node & {
  __typename?: 'SubscriptionCapability';
  id: Scalars['ID']['output'];
  service_capability: Maybe<ServiceCapability>;
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
  end_date: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organization: Organization;
  organization_id: Scalars['OrganizationId']['output'];
  service_instance: ServiceInstance;
  service_instance_id: Scalars['ServiceInstanceId']['output'];
  service_url: Scalars['String']['output'];
  start_date: Maybe<Scalars['Date']['output']>;
  subscription_capability: Maybe<Array<Maybe<SubscriptionCapability>>>;
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
  blogpost_url: Maybe<Scalars['String']['output']>;
  children_documents: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url: Maybe<Scalars['String']['output']>;
  demo_url: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  feed_url: Maybe<Scalars['String']['output']>;
  file_name: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  remover_id: Maybe<Scalars['ID']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories: Maybe<Array<SolutionCategory>>;
  subscription: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
};

export type TelemetryResponse = {
  __typename?: 'TelemetryResponse';
  message: Maybe<Scalars['String']['output']>;
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
  blogpost_url: Maybe<Scalars['String']['output']>;
  children_documents: Maybe<Array<ShareableResource>>;
  created_at: Scalars['Date']['output'];
  datasheet_url: Maybe<Scalars['String']['output']>;
  demo_url: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  download_number: Maybe<Scalars['Int']['output']>;
  file_name: Maybe<Scalars['String']['output']>;
  github_url: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  integration_type: IntegrationType;
  license_type: Maybe<LicenseType>;
  name: Scalars['String']['output'];
  product_version: Maybe<Scalars['String']['output']>;
  remover_id: Maybe<Scalars['ID']['output']>;
  service_instance: Maybe<ServiceInstance>;
  service_instance_id: Maybe<Scalars['ServiceInstanceId']['output']>;
  share_number: Maybe<Scalars['Int']['output']>;
  short_description: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  solution_categories: Maybe<Array<SolutionCategory>>;
  subscription: Maybe<SubscriptionModel>;
  type: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
  updater_id: Maybe<Scalars['String']['output']>;
  uploader: Maybe<User>;
  uploader_organization: Maybe<Organization>;
  use_cases: Maybe<Array<UseCase>>;
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
  platformIdentifiers: InputMaybe<Array<PlatformIdentifier>>;
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
  tenantId: InputMaybe<Scalars['String']['input']>;
};

export type UpdateBundleUserGroupsInput = {
  roles: Array<UpdateBundleUserGroupsRoleInput>;
  userIds: Array<Scalars['UserId']['input']>;
};

export type UpdateBundleUserGroupsRoleInput = {
  product: PlatformIdentifier;
  role: InputMaybe<ServiceGroupName>;
};

export type UpdateCompetitorInput = {
  domain: InputMaybe<Scalars['String']['input']>;
  id: Scalars['CompetitorId']['input'];
  name: InputMaybe<Scalars['String']['input']>;
  tier: InputMaybe<CompetitorTier>;
};

export type UpdateDeploymentQuotaCapacityInput = {
  newCapacity: Scalars['Int']['input'];
  platformIdentifier: InputMaybe<PlatformIdentifier>;
  region: DeploymentRequestPlatformRegion;
};

export type UpdateDeploymentRequestInput = {
  actual_state: InputMaybe<DeploymentRequestPlatformState>;
  end_date: InputMaybe<Scalars['Date']['input']>;
  failure_reason: InputMaybe<Scalars['String']['input']>;
  id: Scalars['DeploymentRequestId']['input'];
  ordering: InputMaybe<Scalars['Int']['input']>;
  platform_id: InputMaybe<Scalars['String']['input']>;
  start_date: InputMaybe<Scalars['Date']['input']>;
  url: InputMaybe<Scalars['String']['input']>;
};

export type UpdateDocumentInput = {
  active: InputMaybe<Scalars['Boolean']['input']>;
  description: InputMaybe<Scalars['String']['input']>;
  entity_types: InputMaybe<Array<Scalars['String']['input']>>;
  license_type: InputMaybe<LicenseType>;
  name: InputMaybe<Scalars['String']['input']>;
  short_description: InputMaybe<Scalars['String']['input']>;
  solution_categories: InputMaybe<Array<Scalars['SolutionCategoryId']['input']>>;
  uploader_id: InputMaybe<Scalars['UserId']['input']>;
  uploader_organization_id: InputMaybe<Scalars['OrganizationId']['input']>;
  use_cases: InputMaybe<Array<Scalars['UseCaseId']['input']>>;
};

export type UpdateEpicInput = {
  active: InputMaybe<Scalars['Boolean']['input']>;
  description: InputMaybe<Scalars['String']['input']>;
  edition_type: EditionType;
  illustration_document: InputMaybe<Scalars['Upload']['input']>;
  is_integration: InputMaybe<Scalars['Boolean']['input']>;
  product: InputMaybe<Array<FiligranProduct>>;
  short_description: InputMaybe<Scalars['String']['input']>;
  slack_link: InputMaybe<Scalars['String']['input']>;
  timeline: InputMaybe<Timeline>;
  title: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePlatformServiceMetadataInput = {
  name: InputMaybe<Scalars['String']['input']>;
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
  capability_ids: InputMaybe<Array<Scalars['Service_CapabilityId']['input']>>;
  end_date: InputMaybe<Scalars['Date']['input']>;
  start_date: InputMaybe<Scalars['Date']['input']>;
};

export type UpdateVotableFeatureInput = {
  active: InputMaybe<Scalars['Boolean']['input']>;
  description: InputMaybe<Scalars['String']['input']>;
  /** Send null to remove the current illustration. */
  illustration_document_id: InputMaybe<Scalars['DocumentId']['input']>;
  position: InputMaybe<Scalars['Int']['input']>;
  product: InputMaybe<FiligranProduct>;
  short_description: InputMaybe<Scalars['String']['input']>;
  title: InputMaybe<Scalars['String']['input']>;
  use_case_ids: InputMaybe<Array<Scalars['UseCaseId']['input']>>;
};

export type UpdateVotingRoundInput = {
  description: InputMaybe<Scalars['String']['input']>;
  name: InputMaybe<Scalars['String']['input']>;
  theme: InputMaybe<VotingRoundTheme>;
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
  capabilities: Maybe<Array<Capability>>;
  country: Maybe<Scalars['String']['output']>;
  disabled: Maybe<Scalars['Boolean']['output']>;
  email: Scalars['String']['output'];
  first_name: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  last_login: Maybe<Scalars['Date']['output']>;
  last_name: Maybe<Scalars['String']['output']>;
  organization_capabilities: Maybe<Array<OrganizationCapabilities>>;
  organizations: Maybe<Array<Organization>>;
  pending_organization_id: Maybe<Scalars['OrganizationId']['output']>;
  picture: Maybe<Scalars['String']['output']>;
  roles_portal: Maybe<Array<RolePortal>>;
  selected_language: Maybe<Scalars['String']['output']>;
  selected_org_capabilities: Maybe<Array<OrganizationCapability>>;
  selected_organization_id: Maybe<Scalars['OrganizationId']['output']>;
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
  delete: Maybe<User>;
  invalidate: Maybe<OrganizationRef>;
};

export type UserPlatformGroup = {
  __typename?: 'UserPlatformGroup';
  name: ServiceGroupName;
  platformIdentifier: PlatformIdentifier;
};

export type UserService = Node & {
  __typename?: 'UserService';
  id: Scalars['ID']['output'];
  ordering: Maybe<Scalars['Int']['output']>;
  subscription: Maybe<SubscriptionModel>;
  subscription_id: Scalars['ID']['output'];
  user: Maybe<User>;
  user_id: Scalars['ID']['output'];
  user_service_capability: Maybe<Array<Maybe<UserServiceCapability>>>;
};

export type UserServiceAddInput = {
  capabilities: InputMaybe<Array<Scalars['String']['input']>>;
  email: Array<Scalars['String']['input']>;
  subscription_id: Scalars['SubscriptionId']['input'];
};

export type UserServiceAddYourselfInput = {
  email: Array<Scalars['String']['input']>;
  serviceInstanceId: InputMaybe<Scalars['ServiceInstanceId']['input']>;
};

export type UserServiceCapabilitiesResponse = {
  __typename?: 'UserServiceCapabilitiesResponse';
  subscription_id: Maybe<Scalars['SubscriptionId']['output']>;
  userServiceCapabilities: Array<UserServiceCapability>;
};

export type UserServiceCapability = Node & {
  __typename?: 'UserServiceCapability';
  generic_service_capability: Maybe<GenericServiceCapability>;
  id: Scalars['ID']['output'];
  subscription_capability: Maybe<SubscriptionCapability>;
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
  node: Maybe<UserService>;
};

export type UserServiceEditInput = {
  capabilities: Array<Scalars['String']['input']>;
  userServiceId: Scalars['User_ServiceId']['input'];
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
  userServiceIds: Array<Scalars['User_ServiceId']['input']>;
};

export type UserServicesDeleteInput = {
  userServiceIds: Array<Scalars['User_ServiceId']['input']>;
};

export type UserSubscription = {
  __typename?: 'UserSubscription';
  add: Maybe<User>;
  delete: Maybe<User>;
  edit: Maybe<User>;
  merge: Maybe<MergeEvent>;
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
  illustration_document: Maybe<Document>;
  illustration_document_id: Maybe<Scalars['DocumentId']['output']>;
  position: Scalars['Int']['output'];
  product: FiligranProduct;
  short_description: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updated_at: Maybe<Scalars['Date']['output']>;
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
  closed_at: Maybe<Scalars['Date']['output']>;
  created_at: Scalars['Date']['output'];
  description: Maybe<Scalars['String']['output']>;
  feature_count: Scalars['Int']['output'];
  features: Array<VotableFeature>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  opened_at: Maybe<Scalars['Date']['output']>;
  service_instance_id: Scalars['ServiceInstanceId']['output'];
  status: VotingRoundStatus;
  theme: VotingRoundTheme;
  updated_at: Maybe<Scalars['Date']['output']>;
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
  last_checked_at: Maybe<Scalars['String']['output']>;
  linked: Scalars['Boolean']['output'];
  openaev: XtmoneIntegrationStatusEntry;
  opencti: XtmoneIntegrationStatusEntry;
};

export type XtmoneIntegrationStatusEntry = {
  __typename?: 'XtmoneIntegrationStatusEntry';
  connected: Scalars['Boolean']['output'];
  last_checked_at: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

export type TrialsAdminCancelDeploymentRequestMutationVariables = Exact<{
  deploymentRequestId: Scalars['DeploymentRequestId']['input'];
}>;


export type TrialsAdminCancelDeploymentRequestMutation = { __typename?: 'Mutation', adminCancelDeploymentRequest: { __typename?: 'DeploymentRequest', id: string } | null };

export type TrialsReorderDeploymentRequestInQueueMutationVariables = Exact<{
  input: ReorderDeploymentRequestInQueueInput;
}>;


export type TrialsReorderDeploymentRequestInQueueMutation = { __typename?: 'Mutation', reorderDeploymentRequestInQueue: { __typename?: 'Success', success: boolean } };

export type TrialsUpdateDeploymentQuotaCapacityMutationVariables = Exact<{
  input: UpdateDeploymentQuotaCapacityInput;
}>;


export type TrialsUpdateDeploymentQuotaCapacityMutation = { __typename?: 'Mutation', updateDeploymentQuotaCapacity: { __typename?: 'Success', success: boolean } };

export type TrialsProductFragment = { __typename?: 'DeploymentRequest', id: string, platform_identifier: PlatformIdentifier | null, hub_status: DeploymentRequestHubStatus, platform_id: string | null, platform_url: string | null };

export type TrialsRowFragment = { __typename?: 'DeploymentRequest', id: string, service_instance_id: any, ordering: number, hub_status: DeploymentRequestHubStatus, requester_email: string | null, organization_name: string | null, organization_requester_id: any, region: DeploymentRequestPlatformRegion, request_date: any, start_date: any | null, end_date: any | null, cancellation_date: any | null, cancellation_user_email: string | null, cancellation_reason: string | null, platform_identifier: PlatformIdentifier | null, platform_id: string | null, platform_url: string | null, children: Array<{ __typename?: 'DeploymentRequest', id: string, platform_identifier: PlatformIdentifier | null, hub_status: DeploymentRequestHubStatus, platform_id: string | null, platform_url: string | null }> | null };

export type TrialsQuotaFragment = { __typename?: 'DeploymentAvailability', id: string, region: DeploymentRequestPlatformRegion, availableCount: number, capacity: number, platform_identifier: PlatformIdentifier | null };

export type TrialsListQueryVariables = Exact<{
  count: Scalars['Int']['input'];
  cursor: InputMaybe<Scalars['ID']['input']>;
  orderBy: DeploymentRequestOrdering;
  orderMode: OrderingMode;
  filters: InputMaybe<Array<DeploymentRequestFilter> | DeploymentRequestFilter>;
  searchTerm: InputMaybe<Scalars['String']['input']>;
}>;


export type TrialsListQuery = { __typename?: 'Query', deploymentRequestsList: { __typename?: 'DeploymentRequestConnection', totalCount: number, edges: Array<{ __typename?: 'DeploymentRequestEdge', node: { __typename?: 'DeploymentRequest', id: string, service_instance_id: any, ordering: number, hub_status: DeploymentRequestHubStatus, requester_email: string | null, organization_name: string | null, organization_requester_id: any, region: DeploymentRequestPlatformRegion, request_date: any, start_date: any | null, end_date: any | null, cancellation_date: any | null, cancellation_user_email: string | null, cancellation_reason: string | null, platform_identifier: PlatformIdentifier | null, platform_id: string | null, platform_url: string | null, children: Array<{ __typename?: 'DeploymentRequest', id: string, platform_identifier: PlatformIdentifier | null, hub_status: DeploymentRequestHubStatus, platform_id: string | null, platform_url: string | null }> | null } }> } };

export type TrialsQuotasQueryVariables = Exact<{
  platformIdentifier: InputMaybe<PlatformIdentifier>;
}>;


export type TrialsQuotasQuery = { __typename?: 'Query', deploymentRequestsAvailable: Array<{ __typename?: 'DeploymentAvailability', id: string, region: DeploymentRequestPlatformRegion, availableCount: number, capacity: number, platform_identifier: PlatformIdentifier | null }> };

export type XtmPlatformBundleProductFragment = { __typename?: 'DeploymentRequest', platform_identifier: PlatformIdentifier | null, service_instance_id: any, url: string | null, service_instance: { __typename?: 'ServiceInstance', name: string } | null, registered_platform: { __typename?: 'RegisteredPlatform', status: PlatformConfigurationStatus | null, last_connectivity_check: any | null, url: string, myGroups: Array<{ __typename?: 'ServiceGroup', id: string, name: ServiceGroupName }> | null } | null };

export type XtmPlatformBundleDetailsFragment = { __typename?: 'DeploymentRequest', id: string, service_instance_id: any, organization_name: string | null, start_date: any | null, end_date: any | null, hub_status: DeploymentRequestHubStatus, requester_email: string | null, request_date: any, cancellation_date: any | null, children: Array<{ __typename?: 'DeploymentRequest', platform_identifier: PlatformIdentifier | null, service_instance_id: any, url: string | null, service_instance: { __typename?: 'ServiceInstance', name: string } | null, registered_platform: { __typename?: 'RegisteredPlatform', status: PlatformConfigurationStatus | null, last_connectivity_check: any | null, url: string, myGroups: Array<{ __typename?: 'ServiceGroup', id: string, name: ServiceGroupName }> | null } | null }> | null };

export type XtmPlatformBundleQueryVariables = Exact<{ [key: string]: never; }>;


export type XtmPlatformBundleQuery = { __typename?: 'Query', xtmPlatformBundle: { __typename?: 'DeploymentRequest', id: string, service_instance_id: any, organization_name: string | null, start_date: any | null, end_date: any | null, hub_status: DeploymentRequestHubStatus, requester_email: string | null, request_date: any, cancellation_date: any | null, children: Array<{ __typename?: 'DeploymentRequest', platform_identifier: PlatformIdentifier | null, service_instance_id: any, url: string | null, service_instance: { __typename?: 'ServiceInstance', name: string } | null, registered_platform: { __typename?: 'RegisteredPlatform', status: PlatformConfigurationStatus | null, last_connectivity_check: any | null, url: string, myGroups: Array<{ __typename?: 'ServiceGroup', id: string, name: ServiceGroupName }> | null } | null }> | null } | null };

export type XtmoneIntegrationStatusEntryFragment = { __typename?: 'XtmoneIntegrationStatusEntry', status: string, connected: boolean, last_checked_at: string | null };

export type XtmoneIntegrationStatusFragment = { __typename?: 'XtmoneIntegrationStatus', linked: boolean, last_checked_at: string | null, opencti: { __typename?: 'XtmoneIntegrationStatusEntry', status: string, connected: boolean, last_checked_at: string | null }, openaev: { __typename?: 'XtmoneIntegrationStatusEntry', status: string, connected: boolean, last_checked_at: string | null } };

export type XtmonePlatformIntegrationStatusQueryVariables = Exact<{
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
}>;


export type XtmonePlatformIntegrationStatusQuery = { __typename?: 'Query', xtmonePlatformIntegrationStatus: { __typename?: 'XtmoneIntegrationStatus', linked: boolean, last_checked_at: string | null, opencti: { __typename?: 'XtmoneIntegrationStatusEntry', status: string, connected: boolean, last_checked_at: string | null }, openaev: { __typename?: 'XtmoneIntegrationStatusEntry', status: string, connected: boolean, last_checked_at: string | null } } | null };

type HomepageDocument_Connector_Fragment = { __typename?: 'Connector', verified: boolean, manager_supported: boolean, id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null };

type HomepageDocument_CsvFeed_Fragment = { __typename?: 'CsvFeed', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null };

type HomepageDocument_CustomDashboard_Fragment = { __typename?: 'CustomDashboard', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null };

type HomepageDocument_CustomView_Fragment = { __typename?: 'CustomView', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null };

type HomepageDocument_DefaultDocument_Fragment = { __typename?: 'DefaultDocument', id: string, name: string | null, short_description: string | null, type: string, active: boolean, slug: string | null, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null };

type HomepageDocument_IntegrationHack_Fragment = { __typename?: 'IntegrationHack', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null };

type HomepageDocument_OpenAevScenario_Fragment = { __typename?: 'OpenAEVScenario', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null };

type HomepageDocument_OpenCtiPlaybook_Fragment = { __typename?: 'OpenCTIPlaybook', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null };

type HomepageDocument_RssFeed_Fragment = { __typename?: 'RssFeed', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null };

type HomepageDocument_Stream_Fragment = { __typename?: 'Stream', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null };

type HomepageDocument_TaxiiFeed_Fragment = { __typename?: 'TaxiiFeed', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null };

type HomepageDocument_ThirdPartyIntegration_Fragment = { __typename?: 'ThirdPartyIntegration', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null };

export type HomepageDocumentFragment = HomepageDocument_Connector_Fragment | HomepageDocument_CsvFeed_Fragment | HomepageDocument_CustomDashboard_Fragment | HomepageDocument_CustomView_Fragment | HomepageDocument_DefaultDocument_Fragment | HomepageDocument_IntegrationHack_Fragment | HomepageDocument_OpenAevScenario_Fragment | HomepageDocument_OpenCtiPlaybook_Fragment | HomepageDocument_RssFeed_Fragment | HomepageDocument_Stream_Fragment | HomepageDocument_TaxiiFeed_Fragment | HomepageDocument_ThirdPartyIntegration_Fragment;

export type MostDeployedDocumentsQueryQueryVariables = Exact<{
  limit: Scalars['Int']['input'];
  platformIdentifiers: InputMaybe<Array<PlatformIdentifier> | PlatformIdentifier>;
}>;


export type MostDeployedDocumentsQueryQuery = { __typename?: 'Query', mostDeployedDocuments: Array<{ __typename?: 'Connector', verified: boolean, manager_supported: boolean, id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'CsvFeed', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'CustomDashboard', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'CustomView', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'DefaultDocument', id: string, name: string | null, short_description: string | null, type: string, active: boolean, slug: string | null, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'IntegrationHack', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'OpenAEVScenario', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'OpenCTIPlaybook', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'RssFeed', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'Stream', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'TaxiiFeed', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'ThirdPartyIntegration', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null }> };

export type NewestDocumentsQueryQueryVariables = Exact<{
  limit: Scalars['Int']['input'];
  platformIdentifiers: InputMaybe<Array<PlatformIdentifier> | PlatformIdentifier>;
}>;


export type NewestDocumentsQueryQuery = { __typename?: 'Query', newestDocuments: Array<{ __typename?: 'Connector', verified: boolean, manager_supported: boolean, id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'CsvFeed', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'CustomDashboard', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'CustomView', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'DefaultDocument', id: string, name: string | null, short_description: string | null, type: string, active: boolean, slug: string | null, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'IntegrationHack', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'OpenAEVScenario', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'OpenCTIPlaybook', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'RssFeed', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'Stream', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'TaxiiFeed', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'ThirdPartyIntegration', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null }> };

export type LastDeployedOverviewQueryQueryVariables = Exact<{
  limit: Scalars['Int']['input'];
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
}>;


export type LastDeployedOverviewQueryQuery = { __typename?: 'Query', lastDeployedOverview: { __typename?: 'LastDeployedOverview', resources: Array<{ __typename?: 'DeployedResource', deployedAt: any, document: { __typename?: 'Connector', verified: boolean, manager_supported: boolean, id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'CsvFeed', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'CustomDashboard', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'CustomView', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'DefaultDocument', id: string, name: string | null, short_description: string | null, type: string, active: boolean, slug: string | null, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'IntegrationHack', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'OpenAEVScenario', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'OpenCTIPlaybook', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'RssFeed', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'Stream', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'TaxiiFeed', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null } | { __typename?: 'ThirdPartyIntegration', id: string, name: string, short_description: string | null, type: string, active: boolean, slug: string, service_instance_id: any | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string }> | null }, deployedBy: { __typename?: 'User', id: string, first_name: string | null, last_name: string | null, email: string, picture: string | null } | null }> } };

type PublicDocumentByServiceSlugItem_Connector_Fragment = { __typename: 'Connector', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, product_version: string | null, container_image: string | null, verified: boolean, source_code: string | null, subscription_link: string | null, manager_supported: boolean, playbook_supported: boolean, minimum_deployable_version: string | null, contact: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null };

type PublicDocumentByServiceSlugItem_CsvFeed_Fragment = { __typename: 'CsvFeed', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, feed_url: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null };

type PublicDocumentByServiceSlugItem_CustomDashboard_Fragment = { __typename: 'CustomDashboard', product_version: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null };

type PublicDocumentByServiceSlugItem_CustomView_Fragment = { __typename: 'CustomView', product_version: string | null, entity_types: Array<string> | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null };

type PublicDocumentByServiceSlugItem_DefaultDocument_Fragment = { __typename: 'DefaultDocument', id: string, name: string | null, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string | null, download_number: number | null, share_number: number | null, active: boolean, type: string, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null };

type PublicDocumentByServiceSlugItem_IntegrationHack_Fragment = { __typename: 'IntegrationHack', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null };

type PublicDocumentByServiceSlugItem_OpenAevScenario_Fragment = { __typename: 'OpenAEVScenario', product_version: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null };

type PublicDocumentByServiceSlugItem_OpenCtiPlaybook_Fragment = { __typename: 'OpenCTIPlaybook', id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null };

type PublicDocumentByServiceSlugItem_RssFeed_Fragment = { __typename: 'RssFeed', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, feed_url: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null };

type PublicDocumentByServiceSlugItem_Stream_Fragment = { __typename: 'Stream', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, feed_url: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null };

type PublicDocumentByServiceSlugItem_TaxiiFeed_Fragment = { __typename: 'TaxiiFeed', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, feed_url: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null };

type PublicDocumentByServiceSlugItem_ThirdPartyIntegration_Fragment = { __typename: 'ThirdPartyIntegration', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, product_version: string | null, vendor_url: string, github_url: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null };

export type PublicDocumentByServiceSlugItemFragment = PublicDocumentByServiceSlugItem_Connector_Fragment | PublicDocumentByServiceSlugItem_CsvFeed_Fragment | PublicDocumentByServiceSlugItem_CustomDashboard_Fragment | PublicDocumentByServiceSlugItem_CustomView_Fragment | PublicDocumentByServiceSlugItem_DefaultDocument_Fragment | PublicDocumentByServiceSlugItem_IntegrationHack_Fragment | PublicDocumentByServiceSlugItem_OpenAevScenario_Fragment | PublicDocumentByServiceSlugItem_OpenCtiPlaybook_Fragment | PublicDocumentByServiceSlugItem_RssFeed_Fragment | PublicDocumentByServiceSlugItem_Stream_Fragment | PublicDocumentByServiceSlugItem_TaxiiFeed_Fragment | PublicDocumentByServiceSlugItem_ThirdPartyIntegration_Fragment;

export type PublicDocumentsByServiceSlugQueryQueryVariables = Exact<{
  serviceInstanceSlug: Scalars['String']['input'];
}>;


export type PublicDocumentsByServiceSlugQueryQuery = { __typename?: 'Query', publicDocumentsByServiceSlug: Array<{ __typename: 'Connector', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, product_version: string | null, container_image: string | null, verified: boolean, source_code: string | null, subscription_link: string | null, manager_supported: boolean, playbook_supported: boolean, minimum_deployable_version: string | null, contact: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null } | { __typename: 'CsvFeed', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, feed_url: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null } | { __typename: 'CustomDashboard', product_version: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null } | { __typename: 'CustomView', product_version: string | null, entity_types: Array<string> | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null } | { __typename: 'DefaultDocument', id: string, name: string | null, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string | null, download_number: number | null, share_number: number | null, active: boolean, type: string, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null } | { __typename: 'IntegrationHack', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null } | { __typename: 'OpenAEVScenario', product_version: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null } | { __typename: 'OpenCTIPlaybook', id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null } | { __typename: 'RssFeed', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, feed_url: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null } | { __typename: 'Stream', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, feed_url: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null } | { __typename: 'TaxiiFeed', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, feed_url: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null } | { __typename: 'ThirdPartyIntegration', integration_type: IntegrationType, datasheet_url: string | null, blogpost_url: string | null, demo_url: string | null, license_type: LicenseType | null, product_version: string | null, vendor_url: string, github_url: string | null, id: string, name: string, description: string | null, short_description: string | null, created_at: any, updated_at: any | null, slug: string, download_number: number | null, share_number: number | null, active: boolean, type: string, solution_categories: Array<{ __typename?: 'SolutionCategory', id: string, name: string }> | null, children_documents: Array<{ __typename?: 'ShareableResource', id: string, image_type: DocumentImageType | null, source_type: DocumentSourceType }> | null, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> | null, uploader: { __typename?: 'User', first_name: string | null, last_name: string | null, picture: string | null } | null, uploader_organization: { __typename?: 'Organization', id: string, personal_space: boolean, name: string } | null }> };

export type PublicDocumentsByServiceSlugSitemapQueryQueryVariables = Exact<{
  serviceInstanceSlug: Scalars['String']['input'];
}>;


export type PublicDocumentsByServiceSlugSitemapQueryQuery = { __typename?: 'Query', publicDocumentsByServiceSlug: Array<{ __typename?: 'Connector', slug: string, created_at: any, updated_at: any | null } | { __typename?: 'CsvFeed', slug: string, created_at: any, updated_at: any | null } | { __typename?: 'CustomDashboard', slug: string, created_at: any, updated_at: any | null } | { __typename?: 'CustomView', slug: string, created_at: any, updated_at: any | null } | { __typename?: 'DefaultDocument', slug: string | null, created_at: any, updated_at: any | null } | { __typename?: 'IntegrationHack', slug: string, created_at: any, updated_at: any | null } | { __typename?: 'OpenAEVScenario', slug: string, created_at: any, updated_at: any | null } | { __typename?: 'OpenCTIPlaybook', slug: string, created_at: any, updated_at: any | null } | { __typename?: 'RssFeed', slug: string, created_at: any, updated_at: any | null } | { __typename?: 'Stream', slug: string, created_at: any, updated_at: any | null } | { __typename?: 'TaxiiFeed', slug: string, created_at: any, updated_at: any | null } | { __typename?: 'ThirdPartyIntegration', slug: string, created_at: any, updated_at: any | null }> };

export type FeatureVoteMutationVariables = Exact<{
  feature_id: Scalars['VotableFeatureId']['input'];
}>;


export type FeatureVoteMutation = { __typename?: 'Mutation', voteForFeature: Array<{ __typename?: 'VotableFeature', id: string, has_my_vote: boolean }> };

export type VotableFeaturePublicFragment = { __typename?: 'VotableFeature', id: string, title: string, short_description: string, description: string, product: FiligranProduct, illustration_document_id: any | null, position: number, has_my_vote: boolean, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> };

export type CurrentVotingRoundQueryVariables = Exact<{
  service_instance_id: Scalars['ServiceInstanceId']['input'];
}>;


export type CurrentVotingRoundQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string } | null, currentVotingRound: { __typename?: 'VotingRound', id: string, service_instance_id: any, name: string, description: string | null, features: Array<{ __typename?: 'VotableFeature', id: string, title: string, short_description: string, description: string, product: FiligranProduct, illustration_document_id: any | null, position: number, has_my_vote: boolean, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> }> } | null };

export type CurrentVotingRoundCalloutQueryVariables = Exact<{
  service_instance_id: Scalars['ServiceInstanceId']['input'];
}>;


export type CurrentVotingRoundCalloutQuery = { __typename?: 'Query', currentVotingRound: { __typename?: 'VotingRound', id: string, name: string, description: string | null, theme: VotingRoundTheme } | null };

export type MeCheckQueryVariables = Exact<{ [key: string]: never; }>;


export type MeCheckQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string } | null };

export type MeFirstNameQueryVariables = Exact<{ [key: string]: never; }>;


export type MeFirstNameQuery = { __typename?: 'Query', me: { __typename?: 'User', first_name: string | null } | null };

export type OrganizationSubscribedServicesBreadcrumbQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type OrganizationSubscribedServicesBreadcrumbQuery = { __typename?: 'Query', organization: { __typename?: 'Organization', id: string, name: string } | null };

export type OrganizationSubscribedServiceRowFragment = { __typename?: 'SubscriptionModel', id: string, start_date: any | null, service_instance: { __typename?: 'ServiceInstance', id: string, name: string, creation_status: ServiceInstanceCreationStatus | null, tags: Array<ServiceInstanceTag> | null, service_definition: { __typename?: 'ServiceDefinition', id: string, name: string, identifier: ServiceDefinitionIdentifier } | null } };

export type OrganizationSubscribedServicesListQueryVariables = Exact<{
  count: Scalars['Int']['input'];
  after: InputMaybe<Scalars['ID']['input']>;
  orderBy: SubscriptionOrdering;
  orderMode: OrderingMode;
  searchTerm: InputMaybe<Scalars['String']['input']>;
  filters: InputMaybe<Array<SubscriptionFilter> | SubscriptionFilter>;
}>;


export type OrganizationSubscribedServicesListQuery = { __typename?: 'Query', subscriptions: { __typename?: 'SubscriptionConnection', totalCount: number, edges: Array<{ __typename?: 'SubscriptionEdge', node: { __typename?: 'SubscriptionModel', id: string, start_date: any | null, service_instance: { __typename?: 'ServiceInstance', id: string, name: string, creation_status: ServiceInstanceCreationStatus | null, tags: Array<ServiceInstanceTag> | null, service_definition: { __typename?: 'ServiceDefinition', id: string, name: string, identifier: ServiceDefinitionIdentifier } | null } } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, hasPreviousPage: boolean, startCursor: string | null, endCursor: string | null } } };

export type RegisteredPlatformsListQueryVariables = Exact<{
  input: RegisteredPlatformsInput;
}>;


export type RegisteredPlatformsListQuery = { __typename?: 'Query', registeredPlatforms: Array<{ __typename?: 'RegisteredPlatform', id: string, platform_id: string, title: string, url: string, contract: PlatformContract, identifier: ServiceDefinitionIdentifier, deployment_request: { __typename?: 'DeploymentRequest', type: DeploymentRequestDeploymentType, parent_id: any | null } | null, subscription: { __typename?: 'SubscriptionModel', end_date: any | null, start_date: any | null, service_instance: { __typename?: 'ServiceInstance', id: string, name: string } } | null }> };

export type RegisteredPlatformsQueryVariables = Exact<{
  input: RegisteredPlatformsInput;
}>;


export type RegisteredPlatformsQuery = { __typename?: 'Query', registeredPlatforms: Array<{ __typename?: 'RegisteredPlatform', id: string, identifier: ServiceDefinitionIdentifier, title: string, contract: PlatformContract, subscription: { __typename?: 'SubscriptionModel', start_date: any | null, end_date: any | null, service_instance_id: any } | null }> };

export type ConnectProductOrganizationAdminsQueryVariables = Exact<{
  input: UsersWithCapabilitiesInOrganizationInput;
}>;


export type ConnectProductOrganizationAdminsQuery = { __typename?: 'Query', usersWithCapabilitiesInOrganization: Array<{ __typename?: 'User', id: string, email: string, first_name: string | null, last_name: string | null }> };

export type AddUsersToBundleGroupsMutationVariables = Exact<{
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
  input: AddUsersToBundleGroupsInput;
}>;


export type AddUsersToBundleGroupsMutation = { __typename?: 'Mutation', addUsersToBundleGroups: Array<{ __typename?: 'BundleUserServiceGroup', user: { __typename?: 'User', id: string, email: string }, groups: Array<{ __typename?: 'UserPlatformGroup', platformIdentifier: PlatformIdentifier, name: ServiceGroupName }> }> };

export type RemoveUsersFromBundleGroupsMutationVariables = Exact<{
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
  userIds: Array<Scalars['UserId']['input']> | Scalars['UserId']['input'];
}>;


export type RemoveUsersFromBundleGroupsMutation = { __typename?: 'Mutation', removeUsersFromBundleGroups: Array<any> };

export type UpdateBundleUserGroupsMutationVariables = Exact<{
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
  input: UpdateBundleUserGroupsInput;
}>;


export type UpdateBundleUserGroupsMutation = { __typename?: 'Mutation', updateBundleUserGroups: Array<{ __typename?: 'BundleUserServiceGroup', user: { __typename?: 'User', id: string, email: string }, groups: Array<{ __typename?: 'UserPlatformGroup', platformIdentifier: PlatformIdentifier, name: ServiceGroupName }> }> };

export type BundleUserServiceGroupsQueryVariables = Exact<{
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
}>;


export type BundleUserServiceGroupsQuery = { __typename?: 'Query', bundleUserServiceGroups: Array<{ __typename?: 'BundleUserServiceGroup', user: { __typename?: 'User', id: string, email: string }, groups: Array<{ __typename?: 'UserPlatformGroup', platformIdentifier: PlatformIdentifier, name: ServiceGroupName }> }> };

export type BundleProductsQueryVariables = Exact<{
  serviceInstanceId: Scalars['ServiceInstanceId']['input'];
}>;


export type BundleProductsQuery = { __typename?: 'Query', bundleProducts: Array<PlatformIdentifier> };

export type ServiceInstancesListQueryVariables = Exact<{
  count: Scalars['Int']['input'];
  orderBy: ServiceInstanceOrdering;
  orderMode: OrderingMode;
  filters: InputMaybe<Array<ServiceInstanceFilter> | ServiceInstanceFilter>;
  searchTerm: InputMaybe<Scalars['String']['input']>;
}>;


export type ServiceInstancesListQuery = { __typename?: 'Query', serviceInstances: { __typename?: 'ServiceConnection', edges: Array<{ __typename?: 'ServiceInstanceEdge', node: { __typename?: 'ServiceInstance', id: string, name: string, service_definition: { __typename?: 'ServiceDefinition', identifier: ServiceDefinitionIdentifier } | null } | null }> } };

export type ServiceInstanceSeoMetadataByIdQueryVariables = Exact<{
  service_instance_id: Scalars['ServiceInstanceId']['input'];
}>;


export type ServiceInstanceSeoMetadataByIdQuery = { __typename?: 'Query', seoServiceInstanceMetadata: Array<{ __typename?: 'SeoServiceInstanceMetadata', service_instance_id: any, language: SeoServiceInstanceLanguage, meta_title: string, meta_description: string }> };

export type EditSeoServiceInstanceMetadataMutationVariables = Exact<{
  service_instance_id: Scalars['ServiceInstanceId']['input'];
  language: SeoServiceInstanceLanguage;
  input: EditSeoServiceInstanceInput;
}>;


export type EditSeoServiceInstanceMetadataMutation = { __typename?: 'Mutation', editSeoServiceInstance: { __typename?: 'SeoServiceInstanceMetadata', service_instance_id: any, language: SeoServiceInstanceLanguage, meta_title: string, meta_description: string } };

export type ServiceUserCapabilitiesQueryVariables = Exact<{
  service_instance_id: Scalars['ServiceInstanceId']['input'];
}>;


export type ServiceUserCapabilitiesQuery = { __typename?: 'Query', userServiceCapabilities: { __typename?: 'UserServiceCapabilitiesResponse', subscription_id: any | null, userServiceCapabilities: Array<{ __typename?: 'UserServiceCapability', id: string, user_service_id: string, generic_service_capability: { __typename?: 'GenericServiceCapability', id: string, name: string | null } | null, subscription_capability: { __typename?: 'SubscriptionCapability', id: string, service_capability: { __typename?: 'ServiceCapability', name: string | null, id: string } | null } | null }> } };

export type SolutionCategoryAddMutationVariables = Exact<{
  input: AddSolutionCategoryInput;
}>;


export type SolutionCategoryAddMutation = { __typename?: 'Mutation', addSolutionCategory: { __typename?: 'SolutionCategory', id: string, name: string, product: Array<FiligranProduct> } };

export type SolutionCategoryEditMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: EditSolutionCategoryInput;
}>;


export type SolutionCategoryEditMutation = { __typename?: 'Mutation', editSolutionCategory: { __typename?: 'SolutionCategory', id: string, name: string, product: Array<FiligranProduct> } };

export type SolutionCategoryDeleteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SolutionCategoryDeleteMutation = { __typename?: 'Mutation', deleteSolutionCategory: { __typename?: 'SolutionCategory', id: string } };

export type SolutionCategoryRowFragment = { __typename?: 'SolutionCategory', id: string, name: string, product: Array<FiligranProduct> };

export type SolutionCategoriesListQueryVariables = Exact<{
  count: Scalars['Int']['input'];
  cursor: InputMaybe<Scalars['ID']['input']>;
  orderBy: SolutionCategoryOrdering;
  orderMode: OrderingMode;
  product: InputMaybe<FiligranProduct>;
}>;


export type SolutionCategoriesListQuery = { __typename?: 'Query', solutionCategories: { __typename?: 'SolutionCategoryConnection', totalCount: number, edges: Array<{ __typename?: 'SolutionCategoryEdge', node: { __typename?: 'SolutionCategory', id: string, name: string, product: Array<FiligranProduct> } }> } | null };

export type CreateDeploymentRequestMutationVariables = Exact<{
  input: CreateDeploymentRequestInput;
}>;


export type CreateDeploymentRequestMutation = { __typename?: 'Mutation', createDeploymentRequest: { __typename?: 'DeploymentRequest', id: string, service_instance_id: any } };

export type PlatformTrialStatusQueryVariables = Exact<{
  organizationId: Scalars['OrganizationId']['input'];
}>;


export type PlatformTrialStatusQuery = { __typename?: 'Query', platformTrialStatus: { __typename?: 'PlatformTrialStatus', isBlacklisted: boolean, hub_status: DeploymentRequestHubStatus | null, end_date: any | null, ongoingStandaloneTrials: Array<PlatformIdentifier> } };

export type TrialDeploymentsEligibilityQueryVariables = Exact<{
  input: TrialDeploymentsInput;
}>;


export type TrialDeploymentsEligibilityQuery = { __typename?: 'Query', trialDeployments: { __typename?: 'TrialsDeployments', availableTrials: Array<PlatformIdentifier>, isBlacklisted: boolean } };

export type UseCaseAddMutationVariables = Exact<{
  input: AddUseCaseInput;
}>;


export type UseCaseAddMutation = { __typename?: 'Mutation', addUseCase: { __typename?: 'UseCase', id: string, name: string, color: string, product: Array<FiligranProduct> } };

export type UseCaseEditMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: EditUseCaseInput;
}>;


export type UseCaseEditMutation = { __typename?: 'Mutation', editUseCase: { __typename?: 'UseCase', id: string, name: string, color: string, product: Array<FiligranProduct> } };

export type UseCaseDeleteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UseCaseDeleteMutation = { __typename?: 'Mutation', deleteUseCase: { __typename?: 'UseCase', id: string } };

export type UseCaseRowFragment = { __typename?: 'UseCase', id: string, name: string, color: string, product: Array<FiligranProduct> };

export type UseCasesListQueryVariables = Exact<{
  count: Scalars['Int']['input'];
  orderBy: UseCaseOrdering;
  orderMode: OrderingMode;
  documentType: InputMaybe<Scalars['String']['input']>;
  product: InputMaybe<FiligranProduct>;
}>;


export type UseCasesListQuery = { __typename?: 'Query', useCases: { __typename?: 'UseCaseConnection', totalCount: number, edges: Array<{ __typename?: 'UseCaseEdge', node: { __typename?: 'UseCase', id: string, name: string, color: string, product: Array<FiligranProduct> } }> } | null };

export type UserDeleteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UserDeleteMutation = { __typename?: 'Mutation', deleteUser: { __typename?: 'User', id: string } };

export type ChangeSelectedOrganizationMutationVariables = Exact<{
  organization_id: Scalars['OrganizationId']['input'];
}>;


export type ChangeSelectedOrganizationMutation = { __typename?: 'Mutation', changeSelectedOrganization: { __typename?: 'User', id: string, selected_organization_id: any | null, selected_org_capabilities: Array<OrganizationCapability> | null } | null };

export type UsersQueryVariables = Exact<{
  first: Scalars['Int']['input'];
  orderBy: UserOrdering;
  orderMode: OrderingMode;
  filters: InputMaybe<Array<Filter> | Filter>;
}>;


export type UsersQuery = { __typename?: 'Query', users: { __typename?: 'UserConnection', edges: Array<{ __typename?: 'UserEdge', node: { __typename?: 'User', id: string, email: string } }> } };

export type VotingRoundCreateMutationVariables = Exact<{
  input: CreateVotingRoundInput;
}>;


export type VotingRoundCreateMutation = { __typename?: 'Mutation', createVotingRound: { __typename?: 'VotingRound', id: string, service_instance_id: any, name: string, description: string | null, status: VotingRoundStatus, theme: VotingRoundTheme, opened_at: any | null, closed_at: any | null, created_at: any } };

export type VotingRoundUpdateMutationVariables = Exact<{
  id: Scalars['VotingRoundId']['input'];
  input: UpdateVotingRoundInput;
}>;


export type VotingRoundUpdateMutation = { __typename?: 'Mutation', updateVotingRound: { __typename?: 'VotingRound', id: string, service_instance_id: any, name: string, description: string | null, status: VotingRoundStatus, theme: VotingRoundTheme, opened_at: any | null, closed_at: any | null, created_at: any } };

export type VotingRoundSetStatusMutationVariables = Exact<{
  id: Scalars['VotingRoundId']['input'];
  status: VotingRoundStatus;
}>;


export type VotingRoundSetStatusMutation = { __typename?: 'Mutation', setVotingRoundStatus: Array<{ __typename?: 'VotingRound', id: string, service_instance_id: any, name: string, description: string | null, status: VotingRoundStatus, theme: VotingRoundTheme, opened_at: any | null, closed_at: any | null, created_at: any }> };

export type VotingRoundDeleteMutationVariables = Exact<{
  id: Scalars['VotingRoundId']['input'];
}>;


export type VotingRoundDeleteMutation = { __typename?: 'Mutation', deleteVotingRound: { __typename?: 'VotingRound', id: string } };

export type VotableFeatureCreateMutationVariables = Exact<{
  input: CreateVotableFeatureInput;
  document: InputMaybe<Array<Scalars['Upload']['input']> | Scalars['Upload']['input']>;
}>;


export type VotableFeatureCreateMutation = { __typename?: 'Mutation', createVotableFeature: { __typename?: 'VotableFeature', id: string, voting_round_id: any, title: string, short_description: string, description: string, product: FiligranProduct, illustration_document_id: any | null, position: number, active: boolean, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> } };

export type VotableFeatureUpdateMutationVariables = Exact<{
  id: Scalars['VotableFeatureId']['input'];
  input: UpdateVotableFeatureInput;
  document: InputMaybe<Array<Scalars['Upload']['input']> | Scalars['Upload']['input']>;
}>;


export type VotableFeatureUpdateMutation = { __typename?: 'Mutation', updateVotableFeature: { __typename?: 'VotableFeature', id: string, voting_round_id: any, title: string, short_description: string, description: string, product: FiligranProduct, illustration_document_id: any | null, position: number, active: boolean, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> } };

export type VotableFeatureDeleteMutationVariables = Exact<{
  id: Scalars['VotableFeatureId']['input'];
}>;


export type VotableFeatureDeleteMutation = { __typename?: 'Mutation', deleteVotableFeature: { __typename?: 'VotableFeature', id: string } };

export type VotableFeatureAdminRowFragment = { __typename?: 'VotableFeature', id: string, voting_round_id: any, title: string, short_description: string, description: string, product: FiligranProduct, illustration_document_id: any | null, position: number, active: boolean, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> };

export type VotingRoundRowFragment = { __typename?: 'VotingRound', id: string, service_instance_id: any, name: string, description: string | null, status: VotingRoundStatus, theme: VotingRoundTheme, opened_at: any | null, closed_at: any | null, created_at: any };

export type VotingRoundsListQueryVariables = Exact<{ [key: string]: never; }>;


export type VotingRoundsListQuery = { __typename?: 'Query', votingRounds: Array<{ __typename?: 'VotingRound', feature_count: number, id: string, service_instance_id: any, name: string, description: string | null, status: VotingRoundStatus, theme: VotingRoundTheme, opened_at: any | null, closed_at: any | null, created_at: any }> };

export type VotingRoundDetailQueryVariables = Exact<{
  id: Scalars['VotingRoundId']['input'];
}>;


export type VotingRoundDetailQuery = { __typename?: 'Query', votingRound: { __typename?: 'VotingRound', id: string, service_instance_id: any, name: string, description: string | null, status: VotingRoundStatus, theme: VotingRoundTheme, opened_at: any | null, closed_at: any | null, created_at: any, features: Array<{ __typename?: 'VotableFeature', id: string, voting_round_id: any, title: string, short_description: string, description: string, product: FiligranProduct, illustration_document_id: any | null, position: number, active: boolean, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> }> } | null };

export type VotingRoundRankingQueryVariables = Exact<{
  id: Scalars['VotingRoundId']['input'];
}>;


export type VotingRoundRankingQuery = { __typename?: 'Query', votingRoundResults: { __typename?: 'VotingRoundResults', total_voters: number, round: { __typename?: 'VotingRound', id: string, name: string, status: VotingRoundStatus }, results: Array<{ __typename?: 'VotableFeatureResult', vote_count: number, feature: { __typename?: 'VotableFeature', id: string, voting_round_id: any, title: string, short_description: string, description: string, product: FiligranProduct, illustration_document_id: any | null, position: number, active: boolean, use_cases: Array<{ __typename?: 'UseCase', id: string, name: string, color: string }> } }> } };

export type EpicCountPerTimelineQueryQueryVariables = Exact<{ [key: string]: never; }>;


export type EpicCountPerTimelineQueryQuery = { __typename?: 'Query', countEpicsPerTimeline: Array<{ __typename?: 'EpicCountPerTimeline', timeline: Timeline, count: number }> };


export const TrialsProductFragmentDoc = `
    fragment TrialsProduct on DeploymentRequest {
  id
  platform_identifier
  hub_status
  platform_id
  platform_url
}
    `;
export const TrialsRowFragmentDoc = `
    fragment TrialsRow on DeploymentRequest {
  id
  service_instance_id
  ordering
  hub_status
  requester_email
  organization_name
  organization_requester_id
  region
  request_date
  start_date
  end_date
  cancellation_date
  cancellation_user_email
  cancellation_reason
  platform_identifier
  platform_id
  platform_url
  children {
    ...TrialsProduct
  }
}
    ${TrialsProductFragmentDoc}`;
export const TrialsQuotaFragmentDoc = `
    fragment TrialsQuota on DeploymentAvailability {
  id
  region
  availableCount
  capacity
  platform_identifier
}
    `;
export const XtmPlatformBundleProductFragmentDoc = `
    fragment XtmPlatformBundleProduct on DeploymentRequest {
  platform_identifier
  service_instance_id
  url
  service_instance {
    name
  }
  registered_platform {
    status
    last_connectivity_check
    url
    myGroups {
      id
      name
    }
  }
}
    `;
export const XtmPlatformBundleDetailsFragmentDoc = `
    fragment XtmPlatformBundleDetails on DeploymentRequest {
  id
  service_instance_id
  organization_name
  start_date
  end_date
  hub_status
  requester_email
  request_date
  cancellation_date
  children {
    ...XtmPlatformBundleProduct
  }
}
    ${XtmPlatformBundleProductFragmentDoc}`;
export const XtmoneIntegrationStatusEntryFragmentDoc = `
    fragment XtmoneIntegrationStatusEntry on XtmoneIntegrationStatusEntry {
  status
  connected
  last_checked_at
}
    `;
export const XtmoneIntegrationStatusFragmentDoc = `
    fragment XtmoneIntegrationStatus on XtmoneIntegrationStatus {
  opencti {
    ...XtmoneIntegrationStatusEntry
  }
  openaev {
    ...XtmoneIntegrationStatusEntry
  }
  linked
  last_checked_at
}
    ${XtmoneIntegrationStatusEntryFragmentDoc}`;
export const HomepageDocumentFragmentDoc = `
    fragment HomepageDocument on Document {
  id
  name
  short_description
  type
  active
  slug
  service_instance_id
  children_documents {
    id
    image_type
  }
  use_cases {
    id
    name
  }
  ... on Connector {
    verified
    manager_supported
  }
}
    `;
export const PublicDocumentByServiceSlugItemFragmentDoc = `
    fragment PublicDocumentByServiceSlugItem on Document {
  __typename
  id
  name
  description
  short_description
  created_at
  updated_at
  slug
  download_number
  share_number
  children_documents {
    id
    image_type
    source_type
  }
  use_cases {
    id
    name
    color
  }
  uploader {
    first_name
    last_name
    picture
  }
  active
  type
  uploader_organization {
    id
    personal_space
    name
  }
  ... on Integration {
    integration_type
    datasheet_url
    blogpost_url
    demo_url
    solution_categories {
      id
      name
    }
    license_type
  }
  ... on CustomDashboard {
    product_version
  }
  ... on CsvFeed {
    feed_url
  }
  ... on TaxiiFeed {
    feed_url
  }
  ... on RssFeed {
    feed_url
  }
  ... on Stream {
    feed_url
  }
  ... on ThirdPartyIntegration {
    product_version
    vendor_url
    github_url
  }
  ... on Connector {
    product_version
    container_image
    verified
    source_code
    subscription_link
    manager_supported
    playbook_supported
    minimum_deployable_version
    contact
  }
  ... on OpenAEVScenario {
    product_version
  }
  ... on CustomView {
    product_version
    entity_types
  }
}
    `;
export const VotableFeaturePublicFragmentDoc = `
    fragment VotableFeaturePublic on VotableFeature {
  id
  title
  short_description
  description
  product
  use_cases {
    id
    name
    color
  }
  illustration_document_id
  position
  has_my_vote
}
    `;
export const OrganizationSubscribedServiceRowFragmentDoc = `
    fragment OrganizationSubscribedServiceRow on SubscriptionModel {
  id
  start_date
  service_instance {
    id
    name
    creation_status
    tags
    service_definition {
      id
      name
      identifier
    }
  }
}
    `;
export const SolutionCategoryRowFragmentDoc = `
    fragment SolutionCategoryRow on SolutionCategory {
  id
  name
  product
}
    `;
export const UseCaseRowFragmentDoc = `
    fragment UseCaseRow on UseCase {
  id
  name
  color
  product
}
    `;
export const VotableFeatureAdminRowFragmentDoc = `
    fragment VotableFeatureAdminRow on VotableFeature {
  id
  voting_round_id
  title
  short_description
  description
  product
  use_cases {
    id
    name
    color
  }
  illustration_document_id
  position
  active
}
    `;
export const VotingRoundRowFragmentDoc = `
    fragment VotingRoundRow on VotingRound {
  id
  service_instance_id
  name
  description
  status
  theme
  opened_at
  closed_at
  created_at
}
    `;
export const TrialsAdminCancelDeploymentRequestDocument = `
    mutation TrialsAdminCancelDeploymentRequest($deploymentRequestId: DeploymentRequestId!) {
  adminCancelDeploymentRequest(deploymentRequestId: $deploymentRequestId) {
    id
  }
}
    `;

export const useTrialsAdminCancelDeploymentRequestMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<TrialsAdminCancelDeploymentRequestMutation, TError, TrialsAdminCancelDeploymentRequestMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<TrialsAdminCancelDeploymentRequestMutation, TError, TrialsAdminCancelDeploymentRequestMutationVariables, TContext>(
      {
    mutationKey: ['TrialsAdminCancelDeploymentRequest'],
    mutationFn: (variables?: TrialsAdminCancelDeploymentRequestMutationVariables) => fetcher<TrialsAdminCancelDeploymentRequestMutation, TrialsAdminCancelDeploymentRequestMutationVariables>(client, TrialsAdminCancelDeploymentRequestDocument, variables, headers)(),
    ...options
  }
    )};

useTrialsAdminCancelDeploymentRequestMutation.getKey = () => ['TrialsAdminCancelDeploymentRequest'];
useTrialsAdminCancelDeploymentRequestMutation.getRootKey = () => ['TrialsAdminCancelDeploymentRequest'] as const;
useTrialsAdminCancelDeploymentRequestMutation.fetcher = (client: GraphQLClient, variables: TrialsAdminCancelDeploymentRequestMutationVariables, headers?: RequestInit['headers']) => fetcher<TrialsAdminCancelDeploymentRequestMutation, TrialsAdminCancelDeploymentRequestMutationVariables>(client, TrialsAdminCancelDeploymentRequestDocument, variables, headers);

export const TrialsReorderDeploymentRequestInQueueDocument = `
    mutation TrialsReorderDeploymentRequestInQueue($input: ReorderDeploymentRequestInQueueInput!) {
  reorderDeploymentRequestInQueue(input: $input) {
    success
  }
}
    `;

export const useTrialsReorderDeploymentRequestInQueueMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<TrialsReorderDeploymentRequestInQueueMutation, TError, TrialsReorderDeploymentRequestInQueueMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<TrialsReorderDeploymentRequestInQueueMutation, TError, TrialsReorderDeploymentRequestInQueueMutationVariables, TContext>(
      {
    mutationKey: ['TrialsReorderDeploymentRequestInQueue'],
    mutationFn: (variables?: TrialsReorderDeploymentRequestInQueueMutationVariables) => fetcher<TrialsReorderDeploymentRequestInQueueMutation, TrialsReorderDeploymentRequestInQueueMutationVariables>(client, TrialsReorderDeploymentRequestInQueueDocument, variables, headers)(),
    ...options
  }
    )};

useTrialsReorderDeploymentRequestInQueueMutation.getKey = () => ['TrialsReorderDeploymentRequestInQueue'];
useTrialsReorderDeploymentRequestInQueueMutation.getRootKey = () => ['TrialsReorderDeploymentRequestInQueue'] as const;
useTrialsReorderDeploymentRequestInQueueMutation.fetcher = (client: GraphQLClient, variables: TrialsReorderDeploymentRequestInQueueMutationVariables, headers?: RequestInit['headers']) => fetcher<TrialsReorderDeploymentRequestInQueueMutation, TrialsReorderDeploymentRequestInQueueMutationVariables>(client, TrialsReorderDeploymentRequestInQueueDocument, variables, headers);

export const TrialsUpdateDeploymentQuotaCapacityDocument = `
    mutation TrialsUpdateDeploymentQuotaCapacity($input: UpdateDeploymentQuotaCapacityInput!) {
  updateDeploymentQuotaCapacity(input: $input) {
    success
  }
}
    `;

export const useTrialsUpdateDeploymentQuotaCapacityMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<TrialsUpdateDeploymentQuotaCapacityMutation, TError, TrialsUpdateDeploymentQuotaCapacityMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<TrialsUpdateDeploymentQuotaCapacityMutation, TError, TrialsUpdateDeploymentQuotaCapacityMutationVariables, TContext>(
      {
    mutationKey: ['TrialsUpdateDeploymentQuotaCapacity'],
    mutationFn: (variables?: TrialsUpdateDeploymentQuotaCapacityMutationVariables) => fetcher<TrialsUpdateDeploymentQuotaCapacityMutation, TrialsUpdateDeploymentQuotaCapacityMutationVariables>(client, TrialsUpdateDeploymentQuotaCapacityDocument, variables, headers)(),
    ...options
  }
    )};

useTrialsUpdateDeploymentQuotaCapacityMutation.getKey = () => ['TrialsUpdateDeploymentQuotaCapacity'];
useTrialsUpdateDeploymentQuotaCapacityMutation.getRootKey = () => ['TrialsUpdateDeploymentQuotaCapacity'] as const;
useTrialsUpdateDeploymentQuotaCapacityMutation.fetcher = (client: GraphQLClient, variables: TrialsUpdateDeploymentQuotaCapacityMutationVariables, headers?: RequestInit['headers']) => fetcher<TrialsUpdateDeploymentQuotaCapacityMutation, TrialsUpdateDeploymentQuotaCapacityMutationVariables>(client, TrialsUpdateDeploymentQuotaCapacityDocument, variables, headers);

export const TrialsListDocument = `
    query TrialsList($count: Int!, $cursor: ID, $orderBy: DeploymentRequestOrdering!, $orderMode: OrderingMode!, $filters: [DeploymentRequestFilter!], $searchTerm: String) {
  deploymentRequestsList(
    first: $count
    after: $cursor
    orderBy: $orderBy
    orderMode: $orderMode
    filters: $filters
    searchTerm: $searchTerm
  ) {
    totalCount
    edges {
      node {
        ...TrialsRow
      }
    }
  }
}
    ${TrialsRowFragmentDoc}`;

export const useTrialsListQuery = <
      TData = TrialsListQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: TrialsListQueryVariables,
      options?: Omit<UseQueryOptions<TrialsListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<TrialsListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<TrialsListQuery, TError, TData>(
      {
    queryKey: ['TrialsList', variables],
    queryFn: fetcher<TrialsListQuery, TrialsListQueryVariables>(client, TrialsListDocument, variables, headers),
    ...options
  }
    )};

useTrialsListQuery.getKey = (variables: TrialsListQueryVariables) => ['TrialsList', variables];
useTrialsListQuery.getRootKey = () => ['TrialsList'] as const;
export const useInfiniteTrialsListQuery = <
      TData = InfiniteData<TrialsListQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: TrialsListQueryVariables,
      options: Omit<UseInfiniteQueryOptions<TrialsListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<TrialsListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<TrialsListQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['TrialsList.infinite', variables],
      queryFn: (metaData) => fetcher<TrialsListQuery, TrialsListQueryVariables>(client, TrialsListDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteTrialsListQuery.getKey = (variables: TrialsListQueryVariables) => ['TrialsList.infinite', variables];
useInfiniteTrialsListQuery.getRootKey = () => ['TrialsList.infinite'] as const;
useTrialsListQuery.fetcher = (client: GraphQLClient, variables: TrialsListQueryVariables, headers?: RequestInit['headers']) => fetcher<TrialsListQuery, TrialsListQueryVariables>(client, TrialsListDocument, variables, headers);

export const TrialsQuotasDocument = `
    query TrialsQuotas($platformIdentifier: PlatformIdentifier) {
  deploymentRequestsAvailable(platformIdentifier: $platformIdentifier) {
    ...TrialsQuota
  }
}
    ${TrialsQuotaFragmentDoc}`;

export const useTrialsQuotasQuery = <
      TData = TrialsQuotasQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables?: TrialsQuotasQueryVariables,
      options?: Omit<UseQueryOptions<TrialsQuotasQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<TrialsQuotasQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<TrialsQuotasQuery, TError, TData>(
      {
    queryKey: variables === undefined ? ['TrialsQuotas'] : ['TrialsQuotas', variables],
    queryFn: fetcher<TrialsQuotasQuery, TrialsQuotasQueryVariables>(client, TrialsQuotasDocument, variables, headers),
    ...options
  }
    )};

useTrialsQuotasQuery.getKey = (variables?: TrialsQuotasQueryVariables) => variables === undefined ? ['TrialsQuotas'] : ['TrialsQuotas', variables];
useTrialsQuotasQuery.getRootKey = () => ['TrialsQuotas'] as const;
export const useInfiniteTrialsQuotasQuery = <
      TData = InfiniteData<TrialsQuotasQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: TrialsQuotasQueryVariables,
      options: Omit<UseInfiniteQueryOptions<TrialsQuotasQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<TrialsQuotasQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<TrialsQuotasQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? variables === undefined ? ['TrialsQuotas.infinite'] : ['TrialsQuotas.infinite', variables],
      queryFn: (metaData) => fetcher<TrialsQuotasQuery, TrialsQuotasQueryVariables>(client, TrialsQuotasDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteTrialsQuotasQuery.getKey = (variables?: TrialsQuotasQueryVariables) => variables === undefined ? ['TrialsQuotas.infinite'] : ['TrialsQuotas.infinite', variables];
useInfiniteTrialsQuotasQuery.getRootKey = () => ['TrialsQuotas.infinite'] as const;
useTrialsQuotasQuery.fetcher = (client: GraphQLClient, variables?: TrialsQuotasQueryVariables, headers?: RequestInit['headers']) => fetcher<TrialsQuotasQuery, TrialsQuotasQueryVariables>(client, TrialsQuotasDocument, variables, headers);

export const XtmPlatformBundleDocument = `
    query XtmPlatformBundle {
  xtmPlatformBundle {
    ...XtmPlatformBundleDetails
  }
}
    ${XtmPlatformBundleDetailsFragmentDoc}`;

export const useXtmPlatformBundleQuery = <
      TData = XtmPlatformBundleQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables?: XtmPlatformBundleQueryVariables,
      options?: Omit<UseQueryOptions<XtmPlatformBundleQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<XtmPlatformBundleQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<XtmPlatformBundleQuery, TError, TData>(
      {
    queryKey: variables === undefined ? ['XtmPlatformBundle'] : ['XtmPlatformBundle', variables],
    queryFn: fetcher<XtmPlatformBundleQuery, XtmPlatformBundleQueryVariables>(client, XtmPlatformBundleDocument, variables, headers),
    ...options
  }
    )};

useXtmPlatformBundleQuery.getKey = (variables?: XtmPlatformBundleQueryVariables) => variables === undefined ? ['XtmPlatformBundle'] : ['XtmPlatformBundle', variables];
useXtmPlatformBundleQuery.getRootKey = () => ['XtmPlatformBundle'] as const;
export const useInfiniteXtmPlatformBundleQuery = <
      TData = InfiniteData<XtmPlatformBundleQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: XtmPlatformBundleQueryVariables,
      options: Omit<UseInfiniteQueryOptions<XtmPlatformBundleQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<XtmPlatformBundleQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<XtmPlatformBundleQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? variables === undefined ? ['XtmPlatformBundle.infinite'] : ['XtmPlatformBundle.infinite', variables],
      queryFn: (metaData) => fetcher<XtmPlatformBundleQuery, XtmPlatformBundleQueryVariables>(client, XtmPlatformBundleDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteXtmPlatformBundleQuery.getKey = (variables?: XtmPlatformBundleQueryVariables) => variables === undefined ? ['XtmPlatformBundle.infinite'] : ['XtmPlatformBundle.infinite', variables];
useInfiniteXtmPlatformBundleQuery.getRootKey = () => ['XtmPlatformBundle.infinite'] as const;
useXtmPlatformBundleQuery.fetcher = (client: GraphQLClient, variables?: XtmPlatformBundleQueryVariables, headers?: RequestInit['headers']) => fetcher<XtmPlatformBundleQuery, XtmPlatformBundleQueryVariables>(client, XtmPlatformBundleDocument, variables, headers);

export const XtmonePlatformIntegrationStatusDocument = `
    query XtmonePlatformIntegrationStatus($serviceInstanceId: ServiceInstanceId!) {
  xtmonePlatformIntegrationStatus(serviceInstanceId: $serviceInstanceId) {
    ...XtmoneIntegrationStatus
  }
}
    ${XtmoneIntegrationStatusFragmentDoc}`;

export const useXtmonePlatformIntegrationStatusQuery = <
      TData = XtmonePlatformIntegrationStatusQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: XtmonePlatformIntegrationStatusQueryVariables,
      options?: Omit<UseQueryOptions<XtmonePlatformIntegrationStatusQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<XtmonePlatformIntegrationStatusQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<XtmonePlatformIntegrationStatusQuery, TError, TData>(
      {
    queryKey: ['XtmonePlatformIntegrationStatus', variables],
    queryFn: fetcher<XtmonePlatformIntegrationStatusQuery, XtmonePlatformIntegrationStatusQueryVariables>(client, XtmonePlatformIntegrationStatusDocument, variables, headers),
    ...options
  }
    )};

useXtmonePlatformIntegrationStatusQuery.getKey = (variables: XtmonePlatformIntegrationStatusQueryVariables) => ['XtmonePlatformIntegrationStatus', variables];
useXtmonePlatformIntegrationStatusQuery.getRootKey = () => ['XtmonePlatformIntegrationStatus'] as const;
export const useInfiniteXtmonePlatformIntegrationStatusQuery = <
      TData = InfiniteData<XtmonePlatformIntegrationStatusQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: XtmonePlatformIntegrationStatusQueryVariables,
      options: Omit<UseInfiniteQueryOptions<XtmonePlatformIntegrationStatusQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<XtmonePlatformIntegrationStatusQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<XtmonePlatformIntegrationStatusQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['XtmonePlatformIntegrationStatus.infinite', variables],
      queryFn: (metaData) => fetcher<XtmonePlatformIntegrationStatusQuery, XtmonePlatformIntegrationStatusQueryVariables>(client, XtmonePlatformIntegrationStatusDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteXtmonePlatformIntegrationStatusQuery.getKey = (variables: XtmonePlatformIntegrationStatusQueryVariables) => ['XtmonePlatformIntegrationStatus.infinite', variables];
useInfiniteXtmonePlatformIntegrationStatusQuery.getRootKey = () => ['XtmonePlatformIntegrationStatus.infinite'] as const;
useXtmonePlatformIntegrationStatusQuery.fetcher = (client: GraphQLClient, variables: XtmonePlatformIntegrationStatusQueryVariables, headers?: RequestInit['headers']) => fetcher<XtmonePlatformIntegrationStatusQuery, XtmonePlatformIntegrationStatusQueryVariables>(client, XtmonePlatformIntegrationStatusDocument, variables, headers);

export const MostDeployedDocumentsQueryDocument = `
    query MostDeployedDocumentsQuery($limit: Int!, $platformIdentifiers: [PlatformIdentifier!]) {
  mostDeployedDocuments(limit: $limit, platformIdentifiers: $platformIdentifiers) {
    ...HomepageDocument
  }
}
    ${HomepageDocumentFragmentDoc}`;

export const useMostDeployedDocumentsQueryQuery = <
      TData = MostDeployedDocumentsQueryQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: MostDeployedDocumentsQueryQueryVariables,
      options?: Omit<UseQueryOptions<MostDeployedDocumentsQueryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<MostDeployedDocumentsQueryQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<MostDeployedDocumentsQueryQuery, TError, TData>(
      {
    queryKey: ['MostDeployedDocumentsQuery', variables],
    queryFn: fetcher<MostDeployedDocumentsQueryQuery, MostDeployedDocumentsQueryQueryVariables>(client, MostDeployedDocumentsQueryDocument, variables, headers),
    ...options
  }
    )};

useMostDeployedDocumentsQueryQuery.getKey = (variables: MostDeployedDocumentsQueryQueryVariables) => ['MostDeployedDocumentsQuery', variables];
useMostDeployedDocumentsQueryQuery.getRootKey = () => ['MostDeployedDocumentsQuery'] as const;
export const useInfiniteMostDeployedDocumentsQueryQuery = <
      TData = InfiniteData<MostDeployedDocumentsQueryQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: MostDeployedDocumentsQueryQueryVariables,
      options: Omit<UseInfiniteQueryOptions<MostDeployedDocumentsQueryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<MostDeployedDocumentsQueryQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<MostDeployedDocumentsQueryQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['MostDeployedDocumentsQuery.infinite', variables],
      queryFn: (metaData) => fetcher<MostDeployedDocumentsQueryQuery, MostDeployedDocumentsQueryQueryVariables>(client, MostDeployedDocumentsQueryDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteMostDeployedDocumentsQueryQuery.getKey = (variables: MostDeployedDocumentsQueryQueryVariables) => ['MostDeployedDocumentsQuery.infinite', variables];
useInfiniteMostDeployedDocumentsQueryQuery.getRootKey = () => ['MostDeployedDocumentsQuery.infinite'] as const;
useMostDeployedDocumentsQueryQuery.fetcher = (client: GraphQLClient, variables: MostDeployedDocumentsQueryQueryVariables, headers?: RequestInit['headers']) => fetcher<MostDeployedDocumentsQueryQuery, MostDeployedDocumentsQueryQueryVariables>(client, MostDeployedDocumentsQueryDocument, variables, headers);

export const NewestDocumentsQueryDocument = `
    query NewestDocumentsQuery($limit: Int!, $platformIdentifiers: [PlatformIdentifier!]) {
  newestDocuments(limit: $limit, platformIdentifiers: $platformIdentifiers) {
    ...HomepageDocument
  }
}
    ${HomepageDocumentFragmentDoc}`;

export const useNewestDocumentsQueryQuery = <
      TData = NewestDocumentsQueryQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: NewestDocumentsQueryQueryVariables,
      options?: Omit<UseQueryOptions<NewestDocumentsQueryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<NewestDocumentsQueryQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<NewestDocumentsQueryQuery, TError, TData>(
      {
    queryKey: ['NewestDocumentsQuery', variables],
    queryFn: fetcher<NewestDocumentsQueryQuery, NewestDocumentsQueryQueryVariables>(client, NewestDocumentsQueryDocument, variables, headers),
    ...options
  }
    )};

useNewestDocumentsQueryQuery.getKey = (variables: NewestDocumentsQueryQueryVariables) => ['NewestDocumentsQuery', variables];
useNewestDocumentsQueryQuery.getRootKey = () => ['NewestDocumentsQuery'] as const;
export const useInfiniteNewestDocumentsQueryQuery = <
      TData = InfiniteData<NewestDocumentsQueryQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: NewestDocumentsQueryQueryVariables,
      options: Omit<UseInfiniteQueryOptions<NewestDocumentsQueryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<NewestDocumentsQueryQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<NewestDocumentsQueryQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['NewestDocumentsQuery.infinite', variables],
      queryFn: (metaData) => fetcher<NewestDocumentsQueryQuery, NewestDocumentsQueryQueryVariables>(client, NewestDocumentsQueryDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteNewestDocumentsQueryQuery.getKey = (variables: NewestDocumentsQueryQueryVariables) => ['NewestDocumentsQuery.infinite', variables];
useInfiniteNewestDocumentsQueryQuery.getRootKey = () => ['NewestDocumentsQuery.infinite'] as const;
useNewestDocumentsQueryQuery.fetcher = (client: GraphQLClient, variables: NewestDocumentsQueryQueryVariables, headers?: RequestInit['headers']) => fetcher<NewestDocumentsQueryQuery, NewestDocumentsQueryQueryVariables>(client, NewestDocumentsQueryDocument, variables, headers);

export const LastDeployedOverviewQueryDocument = `
    query LastDeployedOverviewQuery($limit: Int!, $serviceInstanceId: ServiceInstanceId!) {
  lastDeployedOverview(limit: $limit, serviceInstanceId: $serviceInstanceId) {
    resources {
      document {
        ...HomepageDocument
      }
      deployedAt
      deployedBy {
        id
        first_name
        last_name
        email
        picture
      }
    }
  }
}
    ${HomepageDocumentFragmentDoc}`;

export const useLastDeployedOverviewQueryQuery = <
      TData = LastDeployedOverviewQueryQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: LastDeployedOverviewQueryQueryVariables,
      options?: Omit<UseQueryOptions<LastDeployedOverviewQueryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<LastDeployedOverviewQueryQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<LastDeployedOverviewQueryQuery, TError, TData>(
      {
    queryKey: ['LastDeployedOverviewQuery', variables],
    queryFn: fetcher<LastDeployedOverviewQueryQuery, LastDeployedOverviewQueryQueryVariables>(client, LastDeployedOverviewQueryDocument, variables, headers),
    ...options
  }
    )};

useLastDeployedOverviewQueryQuery.getKey = (variables: LastDeployedOverviewQueryQueryVariables) => ['LastDeployedOverviewQuery', variables];
useLastDeployedOverviewQueryQuery.getRootKey = () => ['LastDeployedOverviewQuery'] as const;
export const useInfiniteLastDeployedOverviewQueryQuery = <
      TData = InfiniteData<LastDeployedOverviewQueryQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: LastDeployedOverviewQueryQueryVariables,
      options: Omit<UseInfiniteQueryOptions<LastDeployedOverviewQueryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<LastDeployedOverviewQueryQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<LastDeployedOverviewQueryQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['LastDeployedOverviewQuery.infinite', variables],
      queryFn: (metaData) => fetcher<LastDeployedOverviewQueryQuery, LastDeployedOverviewQueryQueryVariables>(client, LastDeployedOverviewQueryDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteLastDeployedOverviewQueryQuery.getKey = (variables: LastDeployedOverviewQueryQueryVariables) => ['LastDeployedOverviewQuery.infinite', variables];
useInfiniteLastDeployedOverviewQueryQuery.getRootKey = () => ['LastDeployedOverviewQuery.infinite'] as const;
useLastDeployedOverviewQueryQuery.fetcher = (client: GraphQLClient, variables: LastDeployedOverviewQueryQueryVariables, headers?: RequestInit['headers']) => fetcher<LastDeployedOverviewQueryQuery, LastDeployedOverviewQueryQueryVariables>(client, LastDeployedOverviewQueryDocument, variables, headers);

export const PublicDocumentsByServiceSlugQueryDocument = `
    query PublicDocumentsByServiceSlugQuery($serviceInstanceSlug: String!) {
  publicDocumentsByServiceSlug(serviceInstanceSlug: $serviceInstanceSlug) {
    ...PublicDocumentByServiceSlugItem
  }
}
    ${PublicDocumentByServiceSlugItemFragmentDoc}`;

export const usePublicDocumentsByServiceSlugQueryQuery = <
      TData = PublicDocumentsByServiceSlugQueryQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: PublicDocumentsByServiceSlugQueryQueryVariables,
      options?: Omit<UseQueryOptions<PublicDocumentsByServiceSlugQueryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<PublicDocumentsByServiceSlugQueryQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<PublicDocumentsByServiceSlugQueryQuery, TError, TData>(
      {
    queryKey: ['PublicDocumentsByServiceSlugQuery', variables],
    queryFn: fetcher<PublicDocumentsByServiceSlugQueryQuery, PublicDocumentsByServiceSlugQueryQueryVariables>(client, PublicDocumentsByServiceSlugQueryDocument, variables, headers),
    ...options
  }
    )};

usePublicDocumentsByServiceSlugQueryQuery.getKey = (variables: PublicDocumentsByServiceSlugQueryQueryVariables) => ['PublicDocumentsByServiceSlugQuery', variables];
usePublicDocumentsByServiceSlugQueryQuery.getRootKey = () => ['PublicDocumentsByServiceSlugQuery'] as const;
export const useInfinitePublicDocumentsByServiceSlugQueryQuery = <
      TData = InfiniteData<PublicDocumentsByServiceSlugQueryQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: PublicDocumentsByServiceSlugQueryQueryVariables,
      options: Omit<UseInfiniteQueryOptions<PublicDocumentsByServiceSlugQueryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<PublicDocumentsByServiceSlugQueryQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<PublicDocumentsByServiceSlugQueryQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['PublicDocumentsByServiceSlugQuery.infinite', variables],
      queryFn: (metaData) => fetcher<PublicDocumentsByServiceSlugQueryQuery, PublicDocumentsByServiceSlugQueryQueryVariables>(client, PublicDocumentsByServiceSlugQueryDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfinitePublicDocumentsByServiceSlugQueryQuery.getKey = (variables: PublicDocumentsByServiceSlugQueryQueryVariables) => ['PublicDocumentsByServiceSlugQuery.infinite', variables];
useInfinitePublicDocumentsByServiceSlugQueryQuery.getRootKey = () => ['PublicDocumentsByServiceSlugQuery.infinite'] as const;
usePublicDocumentsByServiceSlugQueryQuery.fetcher = (client: GraphQLClient, variables: PublicDocumentsByServiceSlugQueryQueryVariables, headers?: RequestInit['headers']) => fetcher<PublicDocumentsByServiceSlugQueryQuery, PublicDocumentsByServiceSlugQueryQueryVariables>(client, PublicDocumentsByServiceSlugQueryDocument, variables, headers);

export const PublicDocumentsByServiceSlugSitemapQueryDocument = `
    query PublicDocumentsByServiceSlugSitemapQuery($serviceInstanceSlug: String!) {
  publicDocumentsByServiceSlug(serviceInstanceSlug: $serviceInstanceSlug) {
    slug
    created_at
    updated_at
  }
}
    `;

export const usePublicDocumentsByServiceSlugSitemapQueryQuery = <
      TData = PublicDocumentsByServiceSlugSitemapQueryQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: PublicDocumentsByServiceSlugSitemapQueryQueryVariables,
      options?: Omit<UseQueryOptions<PublicDocumentsByServiceSlugSitemapQueryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<PublicDocumentsByServiceSlugSitemapQueryQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<PublicDocumentsByServiceSlugSitemapQueryQuery, TError, TData>(
      {
    queryKey: ['PublicDocumentsByServiceSlugSitemapQuery', variables],
    queryFn: fetcher<PublicDocumentsByServiceSlugSitemapQueryQuery, PublicDocumentsByServiceSlugSitemapQueryQueryVariables>(client, PublicDocumentsByServiceSlugSitemapQueryDocument, variables, headers),
    ...options
  }
    )};

usePublicDocumentsByServiceSlugSitemapQueryQuery.getKey = (variables: PublicDocumentsByServiceSlugSitemapQueryQueryVariables) => ['PublicDocumentsByServiceSlugSitemapQuery', variables];
usePublicDocumentsByServiceSlugSitemapQueryQuery.getRootKey = () => ['PublicDocumentsByServiceSlugSitemapQuery'] as const;
export const useInfinitePublicDocumentsByServiceSlugSitemapQueryQuery = <
      TData = InfiniteData<PublicDocumentsByServiceSlugSitemapQueryQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: PublicDocumentsByServiceSlugSitemapQueryQueryVariables,
      options: Omit<UseInfiniteQueryOptions<PublicDocumentsByServiceSlugSitemapQueryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<PublicDocumentsByServiceSlugSitemapQueryQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<PublicDocumentsByServiceSlugSitemapQueryQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['PublicDocumentsByServiceSlugSitemapQuery.infinite', variables],
      queryFn: (metaData) => fetcher<PublicDocumentsByServiceSlugSitemapQueryQuery, PublicDocumentsByServiceSlugSitemapQueryQueryVariables>(client, PublicDocumentsByServiceSlugSitemapQueryDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfinitePublicDocumentsByServiceSlugSitemapQueryQuery.getKey = (variables: PublicDocumentsByServiceSlugSitemapQueryQueryVariables) => ['PublicDocumentsByServiceSlugSitemapQuery.infinite', variables];
useInfinitePublicDocumentsByServiceSlugSitemapQueryQuery.getRootKey = () => ['PublicDocumentsByServiceSlugSitemapQuery.infinite'] as const;
usePublicDocumentsByServiceSlugSitemapQueryQuery.fetcher = (client: GraphQLClient, variables: PublicDocumentsByServiceSlugSitemapQueryQueryVariables, headers?: RequestInit['headers']) => fetcher<PublicDocumentsByServiceSlugSitemapQueryQuery, PublicDocumentsByServiceSlugSitemapQueryQueryVariables>(client, PublicDocumentsByServiceSlugSitemapQueryDocument, variables, headers);

export const FeatureVoteDocument = `
    mutation FeatureVote($feature_id: VotableFeatureId!) {
  voteForFeature(feature_id: $feature_id) {
    id
    has_my_vote
  }
}
    `;

export const useFeatureVoteMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<FeatureVoteMutation, TError, FeatureVoteMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<FeatureVoteMutation, TError, FeatureVoteMutationVariables, TContext>(
      {
    mutationKey: ['FeatureVote'],
    mutationFn: (variables?: FeatureVoteMutationVariables) => fetcher<FeatureVoteMutation, FeatureVoteMutationVariables>(client, FeatureVoteDocument, variables, headers)(),
    ...options
  }
    )};

useFeatureVoteMutation.getKey = () => ['FeatureVote'];
useFeatureVoteMutation.getRootKey = () => ['FeatureVote'] as const;
useFeatureVoteMutation.fetcher = (client: GraphQLClient, variables: FeatureVoteMutationVariables, headers?: RequestInit['headers']) => fetcher<FeatureVoteMutation, FeatureVoteMutationVariables>(client, FeatureVoteDocument, variables, headers);

export const CurrentVotingRoundDocument = `
    query CurrentVotingRound($service_instance_id: ServiceInstanceId!) {
  me {
    id
  }
  currentVotingRound(service_instance_id: $service_instance_id) {
    id
    service_instance_id
    name
    description
    features {
      ...VotableFeaturePublic
    }
  }
}
    ${VotableFeaturePublicFragmentDoc}`;

export const useCurrentVotingRoundQuery = <
      TData = CurrentVotingRoundQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: CurrentVotingRoundQueryVariables,
      options?: Omit<UseQueryOptions<CurrentVotingRoundQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<CurrentVotingRoundQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<CurrentVotingRoundQuery, TError, TData>(
      {
    queryKey: ['CurrentVotingRound', variables],
    queryFn: fetcher<CurrentVotingRoundQuery, CurrentVotingRoundQueryVariables>(client, CurrentVotingRoundDocument, variables, headers),
    ...options
  }
    )};

useCurrentVotingRoundQuery.getKey = (variables: CurrentVotingRoundQueryVariables) => ['CurrentVotingRound', variables];
useCurrentVotingRoundQuery.getRootKey = () => ['CurrentVotingRound'] as const;
export const useInfiniteCurrentVotingRoundQuery = <
      TData = InfiniteData<CurrentVotingRoundQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: CurrentVotingRoundQueryVariables,
      options: Omit<UseInfiniteQueryOptions<CurrentVotingRoundQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<CurrentVotingRoundQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<CurrentVotingRoundQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['CurrentVotingRound.infinite', variables],
      queryFn: (metaData) => fetcher<CurrentVotingRoundQuery, CurrentVotingRoundQueryVariables>(client, CurrentVotingRoundDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteCurrentVotingRoundQuery.getKey = (variables: CurrentVotingRoundQueryVariables) => ['CurrentVotingRound.infinite', variables];
useInfiniteCurrentVotingRoundQuery.getRootKey = () => ['CurrentVotingRound.infinite'] as const;
useCurrentVotingRoundQuery.fetcher = (client: GraphQLClient, variables: CurrentVotingRoundQueryVariables, headers?: RequestInit['headers']) => fetcher<CurrentVotingRoundQuery, CurrentVotingRoundQueryVariables>(client, CurrentVotingRoundDocument, variables, headers);

export const CurrentVotingRoundCalloutDocument = `
    query CurrentVotingRoundCallout($service_instance_id: ServiceInstanceId!) {
  currentVotingRound(service_instance_id: $service_instance_id) {
    id
    name
    description
    theme
  }
}
    `;

export const useCurrentVotingRoundCalloutQuery = <
      TData = CurrentVotingRoundCalloutQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: CurrentVotingRoundCalloutQueryVariables,
      options?: Omit<UseQueryOptions<CurrentVotingRoundCalloutQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<CurrentVotingRoundCalloutQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<CurrentVotingRoundCalloutQuery, TError, TData>(
      {
    queryKey: ['CurrentVotingRoundCallout', variables],
    queryFn: fetcher<CurrentVotingRoundCalloutQuery, CurrentVotingRoundCalloutQueryVariables>(client, CurrentVotingRoundCalloutDocument, variables, headers),
    ...options
  }
    )};

useCurrentVotingRoundCalloutQuery.getKey = (variables: CurrentVotingRoundCalloutQueryVariables) => ['CurrentVotingRoundCallout', variables];
useCurrentVotingRoundCalloutQuery.getRootKey = () => ['CurrentVotingRoundCallout'] as const;
export const useInfiniteCurrentVotingRoundCalloutQuery = <
      TData = InfiniteData<CurrentVotingRoundCalloutQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: CurrentVotingRoundCalloutQueryVariables,
      options: Omit<UseInfiniteQueryOptions<CurrentVotingRoundCalloutQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<CurrentVotingRoundCalloutQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<CurrentVotingRoundCalloutQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['CurrentVotingRoundCallout.infinite', variables],
      queryFn: (metaData) => fetcher<CurrentVotingRoundCalloutQuery, CurrentVotingRoundCalloutQueryVariables>(client, CurrentVotingRoundCalloutDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteCurrentVotingRoundCalloutQuery.getKey = (variables: CurrentVotingRoundCalloutQueryVariables) => ['CurrentVotingRoundCallout.infinite', variables];
useInfiniteCurrentVotingRoundCalloutQuery.getRootKey = () => ['CurrentVotingRoundCallout.infinite'] as const;
useCurrentVotingRoundCalloutQuery.fetcher = (client: GraphQLClient, variables: CurrentVotingRoundCalloutQueryVariables, headers?: RequestInit['headers']) => fetcher<CurrentVotingRoundCalloutQuery, CurrentVotingRoundCalloutQueryVariables>(client, CurrentVotingRoundCalloutDocument, variables, headers);

export const MeCheckDocument = `
    query meCheck {
  me {
    id
  }
}
    `;

export const useMeCheckQuery = <
      TData = MeCheckQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables?: MeCheckQueryVariables,
      options?: Omit<UseQueryOptions<MeCheckQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<MeCheckQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<MeCheckQuery, TError, TData>(
      {
    queryKey: variables === undefined ? ['meCheck'] : ['meCheck', variables],
    queryFn: fetcher<MeCheckQuery, MeCheckQueryVariables>(client, MeCheckDocument, variables, headers),
    ...options
  }
    )};

useMeCheckQuery.getKey = (variables?: MeCheckQueryVariables) => variables === undefined ? ['meCheck'] : ['meCheck', variables];
useMeCheckQuery.getRootKey = () => ['meCheck'] as const;
export const useInfiniteMeCheckQuery = <
      TData = InfiniteData<MeCheckQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: MeCheckQueryVariables,
      options: Omit<UseInfiniteQueryOptions<MeCheckQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<MeCheckQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<MeCheckQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? variables === undefined ? ['meCheck.infinite'] : ['meCheck.infinite', variables],
      queryFn: (metaData) => fetcher<MeCheckQuery, MeCheckQueryVariables>(client, MeCheckDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteMeCheckQuery.getKey = (variables?: MeCheckQueryVariables) => variables === undefined ? ['meCheck.infinite'] : ['meCheck.infinite', variables];
useInfiniteMeCheckQuery.getRootKey = () => ['meCheck.infinite'] as const;
useMeCheckQuery.fetcher = (client: GraphQLClient, variables?: MeCheckQueryVariables, headers?: RequestInit['headers']) => fetcher<MeCheckQuery, MeCheckQueryVariables>(client, MeCheckDocument, variables, headers);

export const MeFirstNameDocument = `
    query MeFirstName {
  me {
    first_name
  }
}
    `;

export const useMeFirstNameQuery = <
      TData = MeFirstNameQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables?: MeFirstNameQueryVariables,
      options?: Omit<UseQueryOptions<MeFirstNameQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<MeFirstNameQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<MeFirstNameQuery, TError, TData>(
      {
    queryKey: variables === undefined ? ['MeFirstName'] : ['MeFirstName', variables],
    queryFn: fetcher<MeFirstNameQuery, MeFirstNameQueryVariables>(client, MeFirstNameDocument, variables, headers),
    ...options
  }
    )};

useMeFirstNameQuery.getKey = (variables?: MeFirstNameQueryVariables) => variables === undefined ? ['MeFirstName'] : ['MeFirstName', variables];
useMeFirstNameQuery.getRootKey = () => ['MeFirstName'] as const;
export const useInfiniteMeFirstNameQuery = <
      TData = InfiniteData<MeFirstNameQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: MeFirstNameQueryVariables,
      options: Omit<UseInfiniteQueryOptions<MeFirstNameQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<MeFirstNameQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<MeFirstNameQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? variables === undefined ? ['MeFirstName.infinite'] : ['MeFirstName.infinite', variables],
      queryFn: (metaData) => fetcher<MeFirstNameQuery, MeFirstNameQueryVariables>(client, MeFirstNameDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteMeFirstNameQuery.getKey = (variables?: MeFirstNameQueryVariables) => variables === undefined ? ['MeFirstName.infinite'] : ['MeFirstName.infinite', variables];
useInfiniteMeFirstNameQuery.getRootKey = () => ['MeFirstName.infinite'] as const;
useMeFirstNameQuery.fetcher = (client: GraphQLClient, variables?: MeFirstNameQueryVariables, headers?: RequestInit['headers']) => fetcher<MeFirstNameQuery, MeFirstNameQueryVariables>(client, MeFirstNameDocument, variables, headers);

export const OrganizationSubscribedServicesBreadcrumbDocument = `
    query OrganizationSubscribedServicesBreadcrumb($id: ID!) {
  organization(id: $id) {
    id
    name
  }
}
    `;

export const useOrganizationSubscribedServicesBreadcrumbQuery = <
      TData = OrganizationSubscribedServicesBreadcrumbQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: OrganizationSubscribedServicesBreadcrumbQueryVariables,
      options?: Omit<UseQueryOptions<OrganizationSubscribedServicesBreadcrumbQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<OrganizationSubscribedServicesBreadcrumbQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<OrganizationSubscribedServicesBreadcrumbQuery, TError, TData>(
      {
    queryKey: ['OrganizationSubscribedServicesBreadcrumb', variables],
    queryFn: fetcher<OrganizationSubscribedServicesBreadcrumbQuery, OrganizationSubscribedServicesBreadcrumbQueryVariables>(client, OrganizationSubscribedServicesBreadcrumbDocument, variables, headers),
    ...options
  }
    )};

useOrganizationSubscribedServicesBreadcrumbQuery.getKey = (variables: OrganizationSubscribedServicesBreadcrumbQueryVariables) => ['OrganizationSubscribedServicesBreadcrumb', variables];
useOrganizationSubscribedServicesBreadcrumbQuery.getRootKey = () => ['OrganizationSubscribedServicesBreadcrumb'] as const;
export const useInfiniteOrganizationSubscribedServicesBreadcrumbQuery = <
      TData = InfiniteData<OrganizationSubscribedServicesBreadcrumbQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: OrganizationSubscribedServicesBreadcrumbQueryVariables,
      options: Omit<UseInfiniteQueryOptions<OrganizationSubscribedServicesBreadcrumbQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<OrganizationSubscribedServicesBreadcrumbQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<OrganizationSubscribedServicesBreadcrumbQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['OrganizationSubscribedServicesBreadcrumb.infinite', variables],
      queryFn: (metaData) => fetcher<OrganizationSubscribedServicesBreadcrumbQuery, OrganizationSubscribedServicesBreadcrumbQueryVariables>(client, OrganizationSubscribedServicesBreadcrumbDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteOrganizationSubscribedServicesBreadcrumbQuery.getKey = (variables: OrganizationSubscribedServicesBreadcrumbQueryVariables) => ['OrganizationSubscribedServicesBreadcrumb.infinite', variables];
useInfiniteOrganizationSubscribedServicesBreadcrumbQuery.getRootKey = () => ['OrganizationSubscribedServicesBreadcrumb.infinite'] as const;
useOrganizationSubscribedServicesBreadcrumbQuery.fetcher = (client: GraphQLClient, variables: OrganizationSubscribedServicesBreadcrumbQueryVariables, headers?: RequestInit['headers']) => fetcher<OrganizationSubscribedServicesBreadcrumbQuery, OrganizationSubscribedServicesBreadcrumbQueryVariables>(client, OrganizationSubscribedServicesBreadcrumbDocument, variables, headers);

export const OrganizationSubscribedServicesListDocument = `
    query OrganizationSubscribedServicesList($count: Int!, $after: ID, $orderBy: SubscriptionOrdering!, $orderMode: OrderingMode!, $searchTerm: String, $filters: [SubscriptionFilter!]) {
  subscriptions(
    first: $count
    after: $after
    orderBy: $orderBy
    orderMode: $orderMode
    searchTerm: $searchTerm
    filters: $filters
  ) {
    totalCount
    edges {
      node {
        ...OrganizationSubscribedServiceRow
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
    ${OrganizationSubscribedServiceRowFragmentDoc}`;

export const useOrganizationSubscribedServicesListQuery = <
      TData = OrganizationSubscribedServicesListQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: OrganizationSubscribedServicesListQueryVariables,
      options?: Omit<UseQueryOptions<OrganizationSubscribedServicesListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<OrganizationSubscribedServicesListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<OrganizationSubscribedServicesListQuery, TError, TData>(
      {
    queryKey: ['OrganizationSubscribedServicesList', variables],
    queryFn: fetcher<OrganizationSubscribedServicesListQuery, OrganizationSubscribedServicesListQueryVariables>(client, OrganizationSubscribedServicesListDocument, variables, headers),
    ...options
  }
    )};

useOrganizationSubscribedServicesListQuery.getKey = (variables: OrganizationSubscribedServicesListQueryVariables) => ['OrganizationSubscribedServicesList', variables];
useOrganizationSubscribedServicesListQuery.getRootKey = () => ['OrganizationSubscribedServicesList'] as const;
export const useInfiniteOrganizationSubscribedServicesListQuery = <
      TData = InfiniteData<OrganizationSubscribedServicesListQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: OrganizationSubscribedServicesListQueryVariables,
      options: Omit<UseInfiniteQueryOptions<OrganizationSubscribedServicesListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<OrganizationSubscribedServicesListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<OrganizationSubscribedServicesListQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['OrganizationSubscribedServicesList.infinite', variables],
      queryFn: (metaData) => fetcher<OrganizationSubscribedServicesListQuery, OrganizationSubscribedServicesListQueryVariables>(client, OrganizationSubscribedServicesListDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteOrganizationSubscribedServicesListQuery.getKey = (variables: OrganizationSubscribedServicesListQueryVariables) => ['OrganizationSubscribedServicesList.infinite', variables];
useInfiniteOrganizationSubscribedServicesListQuery.getRootKey = () => ['OrganizationSubscribedServicesList.infinite'] as const;
useOrganizationSubscribedServicesListQuery.fetcher = (client: GraphQLClient, variables: OrganizationSubscribedServicesListQueryVariables, headers?: RequestInit['headers']) => fetcher<OrganizationSubscribedServicesListQuery, OrganizationSubscribedServicesListQueryVariables>(client, OrganizationSubscribedServicesListDocument, variables, headers);

export const RegisteredPlatformsListDocument = `
    query RegisteredPlatformsList($input: RegisteredPlatformsInput!) {
  registeredPlatforms(input: $input) {
    id
    platform_id
    title
    url
    contract
    identifier
    deployment_request {
      type
      parent_id
    }
    subscription {
      end_date
      start_date
      service_instance {
        id
        name
      }
    }
  }
}
    `;

export const useRegisteredPlatformsListQuery = <
      TData = RegisteredPlatformsListQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: RegisteredPlatformsListQueryVariables,
      options?: Omit<UseQueryOptions<RegisteredPlatformsListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<RegisteredPlatformsListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<RegisteredPlatformsListQuery, TError, TData>(
      {
    queryKey: ['RegisteredPlatformsList', variables],
    queryFn: fetcher<RegisteredPlatformsListQuery, RegisteredPlatformsListQueryVariables>(client, RegisteredPlatformsListDocument, variables, headers),
    ...options
  }
    )};

useRegisteredPlatformsListQuery.getKey = (variables: RegisteredPlatformsListQueryVariables) => ['RegisteredPlatformsList', variables];
useRegisteredPlatformsListQuery.getRootKey = () => ['RegisteredPlatformsList'] as const;
export const useInfiniteRegisteredPlatformsListQuery = <
      TData = InfiniteData<RegisteredPlatformsListQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: RegisteredPlatformsListQueryVariables,
      options: Omit<UseInfiniteQueryOptions<RegisteredPlatformsListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<RegisteredPlatformsListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<RegisteredPlatformsListQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['RegisteredPlatformsList.infinite', variables],
      queryFn: (metaData) => fetcher<RegisteredPlatformsListQuery, RegisteredPlatformsListQueryVariables>(client, RegisteredPlatformsListDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteRegisteredPlatformsListQuery.getKey = (variables: RegisteredPlatformsListQueryVariables) => ['RegisteredPlatformsList.infinite', variables];
useInfiniteRegisteredPlatformsListQuery.getRootKey = () => ['RegisteredPlatformsList.infinite'] as const;
useRegisteredPlatformsListQuery.fetcher = (client: GraphQLClient, variables: RegisteredPlatformsListQueryVariables, headers?: RequestInit['headers']) => fetcher<RegisteredPlatformsListQuery, RegisteredPlatformsListQueryVariables>(client, RegisteredPlatformsListDocument, variables, headers);

export const RegisteredPlatformsDocument = `
    query RegisteredPlatforms($input: RegisteredPlatformsInput!) {
  registeredPlatforms(input: $input) {
    id
    identifier
    title
    contract
    subscription {
      start_date
      end_date
      service_instance_id
    }
  }
}
    `;

export const useRegisteredPlatformsQuery = <
      TData = RegisteredPlatformsQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: RegisteredPlatformsQueryVariables,
      options?: Omit<UseQueryOptions<RegisteredPlatformsQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<RegisteredPlatformsQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<RegisteredPlatformsQuery, TError, TData>(
      {
    queryKey: ['RegisteredPlatforms', variables],
    queryFn: fetcher<RegisteredPlatformsQuery, RegisteredPlatformsQueryVariables>(client, RegisteredPlatformsDocument, variables, headers),
    ...options
  }
    )};

useRegisteredPlatformsQuery.getKey = (variables: RegisteredPlatformsQueryVariables) => ['RegisteredPlatforms', variables];
useRegisteredPlatformsQuery.getRootKey = () => ['RegisteredPlatforms'] as const;
export const useInfiniteRegisteredPlatformsQuery = <
      TData = InfiniteData<RegisteredPlatformsQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: RegisteredPlatformsQueryVariables,
      options: Omit<UseInfiniteQueryOptions<RegisteredPlatformsQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<RegisteredPlatformsQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<RegisteredPlatformsQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['RegisteredPlatforms.infinite', variables],
      queryFn: (metaData) => fetcher<RegisteredPlatformsQuery, RegisteredPlatformsQueryVariables>(client, RegisteredPlatformsDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteRegisteredPlatformsQuery.getKey = (variables: RegisteredPlatformsQueryVariables) => ['RegisteredPlatforms.infinite', variables];
useInfiniteRegisteredPlatformsQuery.getRootKey = () => ['RegisteredPlatforms.infinite'] as const;
useRegisteredPlatformsQuery.fetcher = (client: GraphQLClient, variables: RegisteredPlatformsQueryVariables, headers?: RequestInit['headers']) => fetcher<RegisteredPlatformsQuery, RegisteredPlatformsQueryVariables>(client, RegisteredPlatformsDocument, variables, headers);

export const ConnectProductOrganizationAdminsDocument = `
    query ConnectProductOrganizationAdmins($input: UsersWithCapabilitiesInOrganizationInput!) {
  usersWithCapabilitiesInOrganization(input: $input) {
    id
    email
    first_name
    last_name
  }
}
    `;

export const useConnectProductOrganizationAdminsQuery = <
      TData = ConnectProductOrganizationAdminsQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: ConnectProductOrganizationAdminsQueryVariables,
      options?: Omit<UseQueryOptions<ConnectProductOrganizationAdminsQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<ConnectProductOrganizationAdminsQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<ConnectProductOrganizationAdminsQuery, TError, TData>(
      {
    queryKey: ['ConnectProductOrganizationAdmins', variables],
    queryFn: fetcher<ConnectProductOrganizationAdminsQuery, ConnectProductOrganizationAdminsQueryVariables>(client, ConnectProductOrganizationAdminsDocument, variables, headers),
    ...options
  }
    )};

useConnectProductOrganizationAdminsQuery.getKey = (variables: ConnectProductOrganizationAdminsQueryVariables) => ['ConnectProductOrganizationAdmins', variables];
useConnectProductOrganizationAdminsQuery.getRootKey = () => ['ConnectProductOrganizationAdmins'] as const;
export const useInfiniteConnectProductOrganizationAdminsQuery = <
      TData = InfiniteData<ConnectProductOrganizationAdminsQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: ConnectProductOrganizationAdminsQueryVariables,
      options: Omit<UseInfiniteQueryOptions<ConnectProductOrganizationAdminsQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<ConnectProductOrganizationAdminsQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<ConnectProductOrganizationAdminsQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['ConnectProductOrganizationAdmins.infinite', variables],
      queryFn: (metaData) => fetcher<ConnectProductOrganizationAdminsQuery, ConnectProductOrganizationAdminsQueryVariables>(client, ConnectProductOrganizationAdminsDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteConnectProductOrganizationAdminsQuery.getKey = (variables: ConnectProductOrganizationAdminsQueryVariables) => ['ConnectProductOrganizationAdmins.infinite', variables];
useInfiniteConnectProductOrganizationAdminsQuery.getRootKey = () => ['ConnectProductOrganizationAdmins.infinite'] as const;
useConnectProductOrganizationAdminsQuery.fetcher = (client: GraphQLClient, variables: ConnectProductOrganizationAdminsQueryVariables, headers?: RequestInit['headers']) => fetcher<ConnectProductOrganizationAdminsQuery, ConnectProductOrganizationAdminsQueryVariables>(client, ConnectProductOrganizationAdminsDocument, variables, headers);

export const AddUsersToBundleGroupsDocument = `
    mutation AddUsersToBundleGroups($serviceInstanceId: ServiceInstanceId!, $input: AddUsersToBundleGroupsInput!) {
  addUsersToBundleGroups(serviceInstanceId: $serviceInstanceId, input: $input) {
    user {
      id
      email
    }
    groups {
      platformIdentifier
      name
    }
  }
}
    `;

export const useAddUsersToBundleGroupsMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<AddUsersToBundleGroupsMutation, TError, AddUsersToBundleGroupsMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<AddUsersToBundleGroupsMutation, TError, AddUsersToBundleGroupsMutationVariables, TContext>(
      {
    mutationKey: ['AddUsersToBundleGroups'],
    mutationFn: (variables?: AddUsersToBundleGroupsMutationVariables) => fetcher<AddUsersToBundleGroupsMutation, AddUsersToBundleGroupsMutationVariables>(client, AddUsersToBundleGroupsDocument, variables, headers)(),
    ...options
  }
    )};

useAddUsersToBundleGroupsMutation.getKey = () => ['AddUsersToBundleGroups'];
useAddUsersToBundleGroupsMutation.getRootKey = () => ['AddUsersToBundleGroups'] as const;
useAddUsersToBundleGroupsMutation.fetcher = (client: GraphQLClient, variables: AddUsersToBundleGroupsMutationVariables, headers?: RequestInit['headers']) => fetcher<AddUsersToBundleGroupsMutation, AddUsersToBundleGroupsMutationVariables>(client, AddUsersToBundleGroupsDocument, variables, headers);

export const RemoveUsersFromBundleGroupsDocument = `
    mutation RemoveUsersFromBundleGroups($serviceInstanceId: ServiceInstanceId!, $userIds: [UserId!]!) {
  removeUsersFromBundleGroups(
    serviceInstanceId: $serviceInstanceId
    userIds: $userIds
  )
}
    `;

export const useRemoveUsersFromBundleGroupsMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<RemoveUsersFromBundleGroupsMutation, TError, RemoveUsersFromBundleGroupsMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<RemoveUsersFromBundleGroupsMutation, TError, RemoveUsersFromBundleGroupsMutationVariables, TContext>(
      {
    mutationKey: ['RemoveUsersFromBundleGroups'],
    mutationFn: (variables?: RemoveUsersFromBundleGroupsMutationVariables) => fetcher<RemoveUsersFromBundleGroupsMutation, RemoveUsersFromBundleGroupsMutationVariables>(client, RemoveUsersFromBundleGroupsDocument, variables, headers)(),
    ...options
  }
    )};

useRemoveUsersFromBundleGroupsMutation.getKey = () => ['RemoveUsersFromBundleGroups'];
useRemoveUsersFromBundleGroupsMutation.getRootKey = () => ['RemoveUsersFromBundleGroups'] as const;
useRemoveUsersFromBundleGroupsMutation.fetcher = (client: GraphQLClient, variables: RemoveUsersFromBundleGroupsMutationVariables, headers?: RequestInit['headers']) => fetcher<RemoveUsersFromBundleGroupsMutation, RemoveUsersFromBundleGroupsMutationVariables>(client, RemoveUsersFromBundleGroupsDocument, variables, headers);

export const UpdateBundleUserGroupsDocument = `
    mutation UpdateBundleUserGroups($serviceInstanceId: ServiceInstanceId!, $input: UpdateBundleUserGroupsInput!) {
  updateBundleUserGroups(serviceInstanceId: $serviceInstanceId, input: $input) {
    user {
      id
      email
    }
    groups {
      platformIdentifier
      name
    }
  }
}
    `;

export const useUpdateBundleUserGroupsMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<UpdateBundleUserGroupsMutation, TError, UpdateBundleUserGroupsMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<UpdateBundleUserGroupsMutation, TError, UpdateBundleUserGroupsMutationVariables, TContext>(
      {
    mutationKey: ['UpdateBundleUserGroups'],
    mutationFn: (variables?: UpdateBundleUserGroupsMutationVariables) => fetcher<UpdateBundleUserGroupsMutation, UpdateBundleUserGroupsMutationVariables>(client, UpdateBundleUserGroupsDocument, variables, headers)(),
    ...options
  }
    )};

useUpdateBundleUserGroupsMutation.getKey = () => ['UpdateBundleUserGroups'];
useUpdateBundleUserGroupsMutation.getRootKey = () => ['UpdateBundleUserGroups'] as const;
useUpdateBundleUserGroupsMutation.fetcher = (client: GraphQLClient, variables: UpdateBundleUserGroupsMutationVariables, headers?: RequestInit['headers']) => fetcher<UpdateBundleUserGroupsMutation, UpdateBundleUserGroupsMutationVariables>(client, UpdateBundleUserGroupsDocument, variables, headers);

export const BundleUserServiceGroupsDocument = `
    query BundleUserServiceGroups($serviceInstanceId: ServiceInstanceId!) {
  bundleUserServiceGroups(serviceInstanceId: $serviceInstanceId) {
    user {
      id
      email
    }
    groups {
      platformIdentifier
      name
    }
  }
}
    `;

export const useBundleUserServiceGroupsQuery = <
      TData = BundleUserServiceGroupsQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: BundleUserServiceGroupsQueryVariables,
      options?: Omit<UseQueryOptions<BundleUserServiceGroupsQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<BundleUserServiceGroupsQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<BundleUserServiceGroupsQuery, TError, TData>(
      {
    queryKey: ['BundleUserServiceGroups', variables],
    queryFn: fetcher<BundleUserServiceGroupsQuery, BundleUserServiceGroupsQueryVariables>(client, BundleUserServiceGroupsDocument, variables, headers),
    ...options
  }
    )};

useBundleUserServiceGroupsQuery.getKey = (variables: BundleUserServiceGroupsQueryVariables) => ['BundleUserServiceGroups', variables];
useBundleUserServiceGroupsQuery.getRootKey = () => ['BundleUserServiceGroups'] as const;
export const useInfiniteBundleUserServiceGroupsQuery = <
      TData = InfiniteData<BundleUserServiceGroupsQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: BundleUserServiceGroupsQueryVariables,
      options: Omit<UseInfiniteQueryOptions<BundleUserServiceGroupsQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<BundleUserServiceGroupsQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<BundleUserServiceGroupsQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['BundleUserServiceGroups.infinite', variables],
      queryFn: (metaData) => fetcher<BundleUserServiceGroupsQuery, BundleUserServiceGroupsQueryVariables>(client, BundleUserServiceGroupsDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteBundleUserServiceGroupsQuery.getKey = (variables: BundleUserServiceGroupsQueryVariables) => ['BundleUserServiceGroups.infinite', variables];
useInfiniteBundleUserServiceGroupsQuery.getRootKey = () => ['BundleUserServiceGroups.infinite'] as const;
useBundleUserServiceGroupsQuery.fetcher = (client: GraphQLClient, variables: BundleUserServiceGroupsQueryVariables, headers?: RequestInit['headers']) => fetcher<BundleUserServiceGroupsQuery, BundleUserServiceGroupsQueryVariables>(client, BundleUserServiceGroupsDocument, variables, headers);

export const BundleProductsDocument = `
    query BundleProducts($serviceInstanceId: ServiceInstanceId!) {
  bundleProducts(serviceInstanceId: $serviceInstanceId)
}
    `;

export const useBundleProductsQuery = <
      TData = BundleProductsQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: BundleProductsQueryVariables,
      options?: Omit<UseQueryOptions<BundleProductsQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<BundleProductsQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<BundleProductsQuery, TError, TData>(
      {
    queryKey: ['BundleProducts', variables],
    queryFn: fetcher<BundleProductsQuery, BundleProductsQueryVariables>(client, BundleProductsDocument, variables, headers),
    ...options
  }
    )};

useBundleProductsQuery.getKey = (variables: BundleProductsQueryVariables) => ['BundleProducts', variables];
useBundleProductsQuery.getRootKey = () => ['BundleProducts'] as const;
export const useInfiniteBundleProductsQuery = <
      TData = InfiniteData<BundleProductsQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: BundleProductsQueryVariables,
      options: Omit<UseInfiniteQueryOptions<BundleProductsQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<BundleProductsQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<BundleProductsQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['BundleProducts.infinite', variables],
      queryFn: (metaData) => fetcher<BundleProductsQuery, BundleProductsQueryVariables>(client, BundleProductsDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteBundleProductsQuery.getKey = (variables: BundleProductsQueryVariables) => ['BundleProducts.infinite', variables];
useInfiniteBundleProductsQuery.getRootKey = () => ['BundleProducts.infinite'] as const;
useBundleProductsQuery.fetcher = (client: GraphQLClient, variables: BundleProductsQueryVariables, headers?: RequestInit['headers']) => fetcher<BundleProductsQuery, BundleProductsQueryVariables>(client, BundleProductsDocument, variables, headers);

export const ServiceInstancesListDocument = `
    query ServiceInstancesList($count: Int!, $orderBy: ServiceInstanceOrdering!, $orderMode: OrderingMode!, $filters: [ServiceInstanceFilter!], $searchTerm: String) {
  serviceInstances(
    first: $count
    orderBy: $orderBy
    orderMode: $orderMode
    filters: $filters
    searchTerm: $searchTerm
  ) {
    edges {
      node {
        id
        name
        service_definition {
          identifier
        }
      }
    }
  }
}
    `;

export const useServiceInstancesListQuery = <
      TData = ServiceInstancesListQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: ServiceInstancesListQueryVariables,
      options?: Omit<UseQueryOptions<ServiceInstancesListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<ServiceInstancesListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<ServiceInstancesListQuery, TError, TData>(
      {
    queryKey: ['ServiceInstancesList', variables],
    queryFn: fetcher<ServiceInstancesListQuery, ServiceInstancesListQueryVariables>(client, ServiceInstancesListDocument, variables, headers),
    ...options
  }
    )};

useServiceInstancesListQuery.getKey = (variables: ServiceInstancesListQueryVariables) => ['ServiceInstancesList', variables];
useServiceInstancesListQuery.getRootKey = () => ['ServiceInstancesList'] as const;
export const useInfiniteServiceInstancesListQuery = <
      TData = InfiniteData<ServiceInstancesListQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: ServiceInstancesListQueryVariables,
      options: Omit<UseInfiniteQueryOptions<ServiceInstancesListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<ServiceInstancesListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<ServiceInstancesListQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['ServiceInstancesList.infinite', variables],
      queryFn: (metaData) => fetcher<ServiceInstancesListQuery, ServiceInstancesListQueryVariables>(client, ServiceInstancesListDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteServiceInstancesListQuery.getKey = (variables: ServiceInstancesListQueryVariables) => ['ServiceInstancesList.infinite', variables];
useInfiniteServiceInstancesListQuery.getRootKey = () => ['ServiceInstancesList.infinite'] as const;
useServiceInstancesListQuery.fetcher = (client: GraphQLClient, variables: ServiceInstancesListQueryVariables, headers?: RequestInit['headers']) => fetcher<ServiceInstancesListQuery, ServiceInstancesListQueryVariables>(client, ServiceInstancesListDocument, variables, headers);

export const ServiceInstanceSeoMetadataByIdDocument = `
    query ServiceInstanceSeoMetadataById($service_instance_id: ServiceInstanceId!) {
  seoServiceInstanceMetadata(service_instance_id: $service_instance_id) {
    service_instance_id
    language
    meta_title
    meta_description
  }
}
    `;

export const useServiceInstanceSeoMetadataByIdQuery = <
      TData = ServiceInstanceSeoMetadataByIdQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: ServiceInstanceSeoMetadataByIdQueryVariables,
      options?: Omit<UseQueryOptions<ServiceInstanceSeoMetadataByIdQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<ServiceInstanceSeoMetadataByIdQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<ServiceInstanceSeoMetadataByIdQuery, TError, TData>(
      {
    queryKey: ['ServiceInstanceSeoMetadataById', variables],
    queryFn: fetcher<ServiceInstanceSeoMetadataByIdQuery, ServiceInstanceSeoMetadataByIdQueryVariables>(client, ServiceInstanceSeoMetadataByIdDocument, variables, headers),
    ...options
  }
    )};

useServiceInstanceSeoMetadataByIdQuery.getKey = (variables: ServiceInstanceSeoMetadataByIdQueryVariables) => ['ServiceInstanceSeoMetadataById', variables];
useServiceInstanceSeoMetadataByIdQuery.getRootKey = () => ['ServiceInstanceSeoMetadataById'] as const;
export const useInfiniteServiceInstanceSeoMetadataByIdQuery = <
      TData = InfiniteData<ServiceInstanceSeoMetadataByIdQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: ServiceInstanceSeoMetadataByIdQueryVariables,
      options: Omit<UseInfiniteQueryOptions<ServiceInstanceSeoMetadataByIdQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<ServiceInstanceSeoMetadataByIdQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<ServiceInstanceSeoMetadataByIdQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['ServiceInstanceSeoMetadataById.infinite', variables],
      queryFn: (metaData) => fetcher<ServiceInstanceSeoMetadataByIdQuery, ServiceInstanceSeoMetadataByIdQueryVariables>(client, ServiceInstanceSeoMetadataByIdDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteServiceInstanceSeoMetadataByIdQuery.getKey = (variables: ServiceInstanceSeoMetadataByIdQueryVariables) => ['ServiceInstanceSeoMetadataById.infinite', variables];
useInfiniteServiceInstanceSeoMetadataByIdQuery.getRootKey = () => ['ServiceInstanceSeoMetadataById.infinite'] as const;
useServiceInstanceSeoMetadataByIdQuery.fetcher = (client: GraphQLClient, variables: ServiceInstanceSeoMetadataByIdQueryVariables, headers?: RequestInit['headers']) => fetcher<ServiceInstanceSeoMetadataByIdQuery, ServiceInstanceSeoMetadataByIdQueryVariables>(client, ServiceInstanceSeoMetadataByIdDocument, variables, headers);

export const EditSeoServiceInstanceMetadataDocument = `
    mutation EditSeoServiceInstanceMetadata($service_instance_id: ServiceInstanceId!, $language: SeoServiceInstanceLanguage!, $input: EditSeoServiceInstanceInput!) {
  editSeoServiceInstance(
    service_instance_id: $service_instance_id
    language: $language
    input: $input
  ) {
    service_instance_id
    language
    meta_title
    meta_description
  }
}
    `;

export const useEditSeoServiceInstanceMetadataMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<EditSeoServiceInstanceMetadataMutation, TError, EditSeoServiceInstanceMetadataMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<EditSeoServiceInstanceMetadataMutation, TError, EditSeoServiceInstanceMetadataMutationVariables, TContext>(
      {
    mutationKey: ['EditSeoServiceInstanceMetadata'],
    mutationFn: (variables?: EditSeoServiceInstanceMetadataMutationVariables) => fetcher<EditSeoServiceInstanceMetadataMutation, EditSeoServiceInstanceMetadataMutationVariables>(client, EditSeoServiceInstanceMetadataDocument, variables, headers)(),
    ...options
  }
    )};

useEditSeoServiceInstanceMetadataMutation.getKey = () => ['EditSeoServiceInstanceMetadata'];
useEditSeoServiceInstanceMetadataMutation.getRootKey = () => ['EditSeoServiceInstanceMetadata'] as const;
useEditSeoServiceInstanceMetadataMutation.fetcher = (client: GraphQLClient, variables: EditSeoServiceInstanceMetadataMutationVariables, headers?: RequestInit['headers']) => fetcher<EditSeoServiceInstanceMetadataMutation, EditSeoServiceInstanceMetadataMutationVariables>(client, EditSeoServiceInstanceMetadataDocument, variables, headers);

export const ServiceUserCapabilitiesDocument = `
    query ServiceUserCapabilities($service_instance_id: ServiceInstanceId!) {
  userServiceCapabilities(service_instance_id: $service_instance_id) {
    subscription_id
    userServiceCapabilities {
      id
      user_service_id
      generic_service_capability {
        id
        name
      }
      subscription_capability {
        id
        service_capability {
          name
          id
        }
      }
    }
  }
}
    `;

export const useServiceUserCapabilitiesQuery = <
      TData = ServiceUserCapabilitiesQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: ServiceUserCapabilitiesQueryVariables,
      options?: Omit<UseQueryOptions<ServiceUserCapabilitiesQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<ServiceUserCapabilitiesQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<ServiceUserCapabilitiesQuery, TError, TData>(
      {
    queryKey: ['ServiceUserCapabilities', variables],
    queryFn: fetcher<ServiceUserCapabilitiesQuery, ServiceUserCapabilitiesQueryVariables>(client, ServiceUserCapabilitiesDocument, variables, headers),
    ...options
  }
    )};

useServiceUserCapabilitiesQuery.getKey = (variables: ServiceUserCapabilitiesQueryVariables) => ['ServiceUserCapabilities', variables];
useServiceUserCapabilitiesQuery.getRootKey = () => ['ServiceUserCapabilities'] as const;
export const useInfiniteServiceUserCapabilitiesQuery = <
      TData = InfiniteData<ServiceUserCapabilitiesQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: ServiceUserCapabilitiesQueryVariables,
      options: Omit<UseInfiniteQueryOptions<ServiceUserCapabilitiesQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<ServiceUserCapabilitiesQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<ServiceUserCapabilitiesQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['ServiceUserCapabilities.infinite', variables],
      queryFn: (metaData) => fetcher<ServiceUserCapabilitiesQuery, ServiceUserCapabilitiesQueryVariables>(client, ServiceUserCapabilitiesDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteServiceUserCapabilitiesQuery.getKey = (variables: ServiceUserCapabilitiesQueryVariables) => ['ServiceUserCapabilities.infinite', variables];
useInfiniteServiceUserCapabilitiesQuery.getRootKey = () => ['ServiceUserCapabilities.infinite'] as const;
useServiceUserCapabilitiesQuery.fetcher = (client: GraphQLClient, variables: ServiceUserCapabilitiesQueryVariables, headers?: RequestInit['headers']) => fetcher<ServiceUserCapabilitiesQuery, ServiceUserCapabilitiesQueryVariables>(client, ServiceUserCapabilitiesDocument, variables, headers);

export const SolutionCategoryAddDocument = `
    mutation SolutionCategoryAdd($input: AddSolutionCategoryInput!) {
  addSolutionCategory(input: $input) {
    ...SolutionCategoryRow
  }
}
    ${SolutionCategoryRowFragmentDoc}`;

export const useSolutionCategoryAddMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<SolutionCategoryAddMutation, TError, SolutionCategoryAddMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<SolutionCategoryAddMutation, TError, SolutionCategoryAddMutationVariables, TContext>(
      {
    mutationKey: ['SolutionCategoryAdd'],
    mutationFn: (variables?: SolutionCategoryAddMutationVariables) => fetcher<SolutionCategoryAddMutation, SolutionCategoryAddMutationVariables>(client, SolutionCategoryAddDocument, variables, headers)(),
    ...options
  }
    )};

useSolutionCategoryAddMutation.getKey = () => ['SolutionCategoryAdd'];
useSolutionCategoryAddMutation.getRootKey = () => ['SolutionCategoryAdd'] as const;
useSolutionCategoryAddMutation.fetcher = (client: GraphQLClient, variables: SolutionCategoryAddMutationVariables, headers?: RequestInit['headers']) => fetcher<SolutionCategoryAddMutation, SolutionCategoryAddMutationVariables>(client, SolutionCategoryAddDocument, variables, headers);

export const SolutionCategoryEditDocument = `
    mutation SolutionCategoryEdit($id: ID!, $input: EditSolutionCategoryInput!) {
  editSolutionCategory(id: $id, input: $input) {
    ...SolutionCategoryRow
  }
}
    ${SolutionCategoryRowFragmentDoc}`;

export const useSolutionCategoryEditMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<SolutionCategoryEditMutation, TError, SolutionCategoryEditMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<SolutionCategoryEditMutation, TError, SolutionCategoryEditMutationVariables, TContext>(
      {
    mutationKey: ['SolutionCategoryEdit'],
    mutationFn: (variables?: SolutionCategoryEditMutationVariables) => fetcher<SolutionCategoryEditMutation, SolutionCategoryEditMutationVariables>(client, SolutionCategoryEditDocument, variables, headers)(),
    ...options
  }
    )};

useSolutionCategoryEditMutation.getKey = () => ['SolutionCategoryEdit'];
useSolutionCategoryEditMutation.getRootKey = () => ['SolutionCategoryEdit'] as const;
useSolutionCategoryEditMutation.fetcher = (client: GraphQLClient, variables: SolutionCategoryEditMutationVariables, headers?: RequestInit['headers']) => fetcher<SolutionCategoryEditMutation, SolutionCategoryEditMutationVariables>(client, SolutionCategoryEditDocument, variables, headers);

export const SolutionCategoryDeleteDocument = `
    mutation SolutionCategoryDelete($id: ID!) {
  deleteSolutionCategory(id: $id) {
    id
  }
}
    `;

export const useSolutionCategoryDeleteMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<SolutionCategoryDeleteMutation, TError, SolutionCategoryDeleteMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<SolutionCategoryDeleteMutation, TError, SolutionCategoryDeleteMutationVariables, TContext>(
      {
    mutationKey: ['SolutionCategoryDelete'],
    mutationFn: (variables?: SolutionCategoryDeleteMutationVariables) => fetcher<SolutionCategoryDeleteMutation, SolutionCategoryDeleteMutationVariables>(client, SolutionCategoryDeleteDocument, variables, headers)(),
    ...options
  }
    )};

useSolutionCategoryDeleteMutation.getKey = () => ['SolutionCategoryDelete'];
useSolutionCategoryDeleteMutation.getRootKey = () => ['SolutionCategoryDelete'] as const;
useSolutionCategoryDeleteMutation.fetcher = (client: GraphQLClient, variables: SolutionCategoryDeleteMutationVariables, headers?: RequestInit['headers']) => fetcher<SolutionCategoryDeleteMutation, SolutionCategoryDeleteMutationVariables>(client, SolutionCategoryDeleteDocument, variables, headers);

export const SolutionCategoriesListDocument = `
    query SolutionCategoriesList($count: Int!, $cursor: ID, $orderBy: SolutionCategoryOrdering!, $orderMode: OrderingMode!, $product: FiligranProduct) {
  solutionCategories(
    first: $count
    after: $cursor
    orderBy: $orderBy
    orderMode: $orderMode
    product: $product
  ) {
    totalCount
    edges {
      node {
        id
        name
        product
      }
    }
  }
}
    `;

export const useSolutionCategoriesListQuery = <
      TData = SolutionCategoriesListQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: SolutionCategoriesListQueryVariables,
      options?: Omit<UseQueryOptions<SolutionCategoriesListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<SolutionCategoriesListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<SolutionCategoriesListQuery, TError, TData>(
      {
    queryKey: ['SolutionCategoriesList', variables],
    queryFn: fetcher<SolutionCategoriesListQuery, SolutionCategoriesListQueryVariables>(client, SolutionCategoriesListDocument, variables, headers),
    ...options
  }
    )};

useSolutionCategoriesListQuery.getKey = (variables: SolutionCategoriesListQueryVariables) => ['SolutionCategoriesList', variables];
useSolutionCategoriesListQuery.getRootKey = () => ['SolutionCategoriesList'] as const;
export const useInfiniteSolutionCategoriesListQuery = <
      TData = InfiniteData<SolutionCategoriesListQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: SolutionCategoriesListQueryVariables,
      options: Omit<UseInfiniteQueryOptions<SolutionCategoriesListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<SolutionCategoriesListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<SolutionCategoriesListQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['SolutionCategoriesList.infinite', variables],
      queryFn: (metaData) => fetcher<SolutionCategoriesListQuery, SolutionCategoriesListQueryVariables>(client, SolutionCategoriesListDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteSolutionCategoriesListQuery.getKey = (variables: SolutionCategoriesListQueryVariables) => ['SolutionCategoriesList.infinite', variables];
useInfiniteSolutionCategoriesListQuery.getRootKey = () => ['SolutionCategoriesList.infinite'] as const;
useSolutionCategoriesListQuery.fetcher = (client: GraphQLClient, variables: SolutionCategoriesListQueryVariables, headers?: RequestInit['headers']) => fetcher<SolutionCategoriesListQuery, SolutionCategoriesListQueryVariables>(client, SolutionCategoriesListDocument, variables, headers);

export const CreateDeploymentRequestDocument = `
    mutation CreateDeploymentRequest($input: CreateDeploymentRequestInput!) {
  createDeploymentRequest(input: $input) {
    id
    service_instance_id
  }
}
    `;

export const useCreateDeploymentRequestMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<CreateDeploymentRequestMutation, TError, CreateDeploymentRequestMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<CreateDeploymentRequestMutation, TError, CreateDeploymentRequestMutationVariables, TContext>(
      {
    mutationKey: ['CreateDeploymentRequest'],
    mutationFn: (variables?: CreateDeploymentRequestMutationVariables) => fetcher<CreateDeploymentRequestMutation, CreateDeploymentRequestMutationVariables>(client, CreateDeploymentRequestDocument, variables, headers)(),
    ...options
  }
    )};

useCreateDeploymentRequestMutation.getKey = () => ['CreateDeploymentRequest'];
useCreateDeploymentRequestMutation.getRootKey = () => ['CreateDeploymentRequest'] as const;
useCreateDeploymentRequestMutation.fetcher = (client: GraphQLClient, variables: CreateDeploymentRequestMutationVariables, headers?: RequestInit['headers']) => fetcher<CreateDeploymentRequestMutation, CreateDeploymentRequestMutationVariables>(client, CreateDeploymentRequestDocument, variables, headers);

export const PlatformTrialStatusDocument = `
    query PlatformTrialStatus($organizationId: OrganizationId!) {
  platformTrialStatus(organizationId: $organizationId) {
    isBlacklisted
    hub_status
    end_date
    ongoingStandaloneTrials
  }
}
    `;

export const usePlatformTrialStatusQuery = <
      TData = PlatformTrialStatusQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: PlatformTrialStatusQueryVariables,
      options?: Omit<UseQueryOptions<PlatformTrialStatusQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<PlatformTrialStatusQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<PlatformTrialStatusQuery, TError, TData>(
      {
    queryKey: ['PlatformTrialStatus', variables],
    queryFn: fetcher<PlatformTrialStatusQuery, PlatformTrialStatusQueryVariables>(client, PlatformTrialStatusDocument, variables, headers),
    ...options
  }
    )};

usePlatformTrialStatusQuery.getKey = (variables: PlatformTrialStatusQueryVariables) => ['PlatformTrialStatus', variables];
usePlatformTrialStatusQuery.getRootKey = () => ['PlatformTrialStatus'] as const;
export const useInfinitePlatformTrialStatusQuery = <
      TData = InfiniteData<PlatformTrialStatusQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: PlatformTrialStatusQueryVariables,
      options: Omit<UseInfiniteQueryOptions<PlatformTrialStatusQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<PlatformTrialStatusQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<PlatformTrialStatusQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['PlatformTrialStatus.infinite', variables],
      queryFn: (metaData) => fetcher<PlatformTrialStatusQuery, PlatformTrialStatusQueryVariables>(client, PlatformTrialStatusDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfinitePlatformTrialStatusQuery.getKey = (variables: PlatformTrialStatusQueryVariables) => ['PlatformTrialStatus.infinite', variables];
useInfinitePlatformTrialStatusQuery.getRootKey = () => ['PlatformTrialStatus.infinite'] as const;
usePlatformTrialStatusQuery.fetcher = (client: GraphQLClient, variables: PlatformTrialStatusQueryVariables, headers?: RequestInit['headers']) => fetcher<PlatformTrialStatusQuery, PlatformTrialStatusQueryVariables>(client, PlatformTrialStatusDocument, variables, headers);

export const TrialDeploymentsEligibilityDocument = `
    query TrialDeploymentsEligibility($input: TrialDeploymentsInput!) {
  trialDeployments(input: $input) {
    availableTrials
    isBlacklisted
  }
}
    `;

export const useTrialDeploymentsEligibilityQuery = <
      TData = TrialDeploymentsEligibilityQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: TrialDeploymentsEligibilityQueryVariables,
      options?: Omit<UseQueryOptions<TrialDeploymentsEligibilityQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<TrialDeploymentsEligibilityQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<TrialDeploymentsEligibilityQuery, TError, TData>(
      {
    queryKey: ['TrialDeploymentsEligibility', variables],
    queryFn: fetcher<TrialDeploymentsEligibilityQuery, TrialDeploymentsEligibilityQueryVariables>(client, TrialDeploymentsEligibilityDocument, variables, headers),
    ...options
  }
    )};

useTrialDeploymentsEligibilityQuery.getKey = (variables: TrialDeploymentsEligibilityQueryVariables) => ['TrialDeploymentsEligibility', variables];
useTrialDeploymentsEligibilityQuery.getRootKey = () => ['TrialDeploymentsEligibility'] as const;
export const useInfiniteTrialDeploymentsEligibilityQuery = <
      TData = InfiniteData<TrialDeploymentsEligibilityQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: TrialDeploymentsEligibilityQueryVariables,
      options: Omit<UseInfiniteQueryOptions<TrialDeploymentsEligibilityQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<TrialDeploymentsEligibilityQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<TrialDeploymentsEligibilityQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['TrialDeploymentsEligibility.infinite', variables],
      queryFn: (metaData) => fetcher<TrialDeploymentsEligibilityQuery, TrialDeploymentsEligibilityQueryVariables>(client, TrialDeploymentsEligibilityDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteTrialDeploymentsEligibilityQuery.getKey = (variables: TrialDeploymentsEligibilityQueryVariables) => ['TrialDeploymentsEligibility.infinite', variables];
useInfiniteTrialDeploymentsEligibilityQuery.getRootKey = () => ['TrialDeploymentsEligibility.infinite'] as const;
useTrialDeploymentsEligibilityQuery.fetcher = (client: GraphQLClient, variables: TrialDeploymentsEligibilityQueryVariables, headers?: RequestInit['headers']) => fetcher<TrialDeploymentsEligibilityQuery, TrialDeploymentsEligibilityQueryVariables>(client, TrialDeploymentsEligibilityDocument, variables, headers);

export const UseCaseAddDocument = `
    mutation UseCaseAdd($input: AddUseCaseInput!) {
  addUseCase(input: $input) {
    ...UseCaseRow
  }
}
    ${UseCaseRowFragmentDoc}`;

export const useUseCaseAddMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<UseCaseAddMutation, TError, UseCaseAddMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<UseCaseAddMutation, TError, UseCaseAddMutationVariables, TContext>(
      {
    mutationKey: ['UseCaseAdd'],
    mutationFn: (variables?: UseCaseAddMutationVariables) => fetcher<UseCaseAddMutation, UseCaseAddMutationVariables>(client, UseCaseAddDocument, variables, headers)(),
    ...options
  }
    )};

useUseCaseAddMutation.getKey = () => ['UseCaseAdd'];
useUseCaseAddMutation.getRootKey = () => ['UseCaseAdd'] as const;
useUseCaseAddMutation.fetcher = (client: GraphQLClient, variables: UseCaseAddMutationVariables, headers?: RequestInit['headers']) => fetcher<UseCaseAddMutation, UseCaseAddMutationVariables>(client, UseCaseAddDocument, variables, headers);

export const UseCaseEditDocument = `
    mutation UseCaseEdit($id: ID!, $input: EditUseCaseInput!) {
  editUseCase(id: $id, input: $input) {
    ...UseCaseRow
  }
}
    ${UseCaseRowFragmentDoc}`;

export const useUseCaseEditMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<UseCaseEditMutation, TError, UseCaseEditMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<UseCaseEditMutation, TError, UseCaseEditMutationVariables, TContext>(
      {
    mutationKey: ['UseCaseEdit'],
    mutationFn: (variables?: UseCaseEditMutationVariables) => fetcher<UseCaseEditMutation, UseCaseEditMutationVariables>(client, UseCaseEditDocument, variables, headers)(),
    ...options
  }
    )};

useUseCaseEditMutation.getKey = () => ['UseCaseEdit'];
useUseCaseEditMutation.getRootKey = () => ['UseCaseEdit'] as const;
useUseCaseEditMutation.fetcher = (client: GraphQLClient, variables: UseCaseEditMutationVariables, headers?: RequestInit['headers']) => fetcher<UseCaseEditMutation, UseCaseEditMutationVariables>(client, UseCaseEditDocument, variables, headers);

export const UseCaseDeleteDocument = `
    mutation UseCaseDelete($id: ID!) {
  deleteUseCase(id: $id) {
    id
  }
}
    `;

export const useUseCaseDeleteMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<UseCaseDeleteMutation, TError, UseCaseDeleteMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<UseCaseDeleteMutation, TError, UseCaseDeleteMutationVariables, TContext>(
      {
    mutationKey: ['UseCaseDelete'],
    mutationFn: (variables?: UseCaseDeleteMutationVariables) => fetcher<UseCaseDeleteMutation, UseCaseDeleteMutationVariables>(client, UseCaseDeleteDocument, variables, headers)(),
    ...options
  }
    )};

useUseCaseDeleteMutation.getKey = () => ['UseCaseDelete'];
useUseCaseDeleteMutation.getRootKey = () => ['UseCaseDelete'] as const;
useUseCaseDeleteMutation.fetcher = (client: GraphQLClient, variables: UseCaseDeleteMutationVariables, headers?: RequestInit['headers']) => fetcher<UseCaseDeleteMutation, UseCaseDeleteMutationVariables>(client, UseCaseDeleteDocument, variables, headers);

export const UseCasesListDocument = `
    query UseCasesList($count: Int!, $orderBy: UseCaseOrdering!, $orderMode: OrderingMode!, $documentType: String, $product: FiligranProduct) {
  useCases(
    first: $count
    orderBy: $orderBy
    orderMode: $orderMode
    documentType: $documentType
    product: $product
  ) {
    totalCount
    edges {
      node {
        id
        name
        color
        product
      }
    }
  }
}
    `;

export const useUseCasesListQuery = <
      TData = UseCasesListQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: UseCasesListQueryVariables,
      options?: Omit<UseQueryOptions<UseCasesListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<UseCasesListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<UseCasesListQuery, TError, TData>(
      {
    queryKey: ['UseCasesList', variables],
    queryFn: fetcher<UseCasesListQuery, UseCasesListQueryVariables>(client, UseCasesListDocument, variables, headers),
    ...options
  }
    )};

useUseCasesListQuery.getKey = (variables: UseCasesListQueryVariables) => ['UseCasesList', variables];
useUseCasesListQuery.getRootKey = () => ['UseCasesList'] as const;
export const useInfiniteUseCasesListQuery = <
      TData = InfiniteData<UseCasesListQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: UseCasesListQueryVariables,
      options: Omit<UseInfiniteQueryOptions<UseCasesListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<UseCasesListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<UseCasesListQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['UseCasesList.infinite', variables],
      queryFn: (metaData) => fetcher<UseCasesListQuery, UseCasesListQueryVariables>(client, UseCasesListDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteUseCasesListQuery.getKey = (variables: UseCasesListQueryVariables) => ['UseCasesList.infinite', variables];
useInfiniteUseCasesListQuery.getRootKey = () => ['UseCasesList.infinite'] as const;
useUseCasesListQuery.fetcher = (client: GraphQLClient, variables: UseCasesListQueryVariables, headers?: RequestInit['headers']) => fetcher<UseCasesListQuery, UseCasesListQueryVariables>(client, UseCasesListDocument, variables, headers);

export const UserDeleteDocument = `
    mutation UserDelete($id: ID!) {
  deleteUser(id: $id) {
    id
  }
}
    `;

export const useUserDeleteMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<UserDeleteMutation, TError, UserDeleteMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<UserDeleteMutation, TError, UserDeleteMutationVariables, TContext>(
      {
    mutationKey: ['UserDelete'],
    mutationFn: (variables?: UserDeleteMutationVariables) => fetcher<UserDeleteMutation, UserDeleteMutationVariables>(client, UserDeleteDocument, variables, headers)(),
    ...options
  }
    )};

useUserDeleteMutation.getKey = () => ['UserDelete'];
useUserDeleteMutation.getRootKey = () => ['UserDelete'] as const;
useUserDeleteMutation.fetcher = (client: GraphQLClient, variables: UserDeleteMutationVariables, headers?: RequestInit['headers']) => fetcher<UserDeleteMutation, UserDeleteMutationVariables>(client, UserDeleteDocument, variables, headers);

export const ChangeSelectedOrganizationDocument = `
    mutation ChangeSelectedOrganization($organization_id: OrganizationId!) {
  changeSelectedOrganization(organization_id: $organization_id) {
    id
    selected_organization_id
    selected_org_capabilities
  }
}
    `;

export const useChangeSelectedOrganizationMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<ChangeSelectedOrganizationMutation, TError, ChangeSelectedOrganizationMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<ChangeSelectedOrganizationMutation, TError, ChangeSelectedOrganizationMutationVariables, TContext>(
      {
    mutationKey: ['ChangeSelectedOrganization'],
    mutationFn: (variables?: ChangeSelectedOrganizationMutationVariables) => fetcher<ChangeSelectedOrganizationMutation, ChangeSelectedOrganizationMutationVariables>(client, ChangeSelectedOrganizationDocument, variables, headers)(),
    ...options
  }
    )};

useChangeSelectedOrganizationMutation.getKey = () => ['ChangeSelectedOrganization'];
useChangeSelectedOrganizationMutation.getRootKey = () => ['ChangeSelectedOrganization'] as const;
useChangeSelectedOrganizationMutation.fetcher = (client: GraphQLClient, variables: ChangeSelectedOrganizationMutationVariables, headers?: RequestInit['headers']) => fetcher<ChangeSelectedOrganizationMutation, ChangeSelectedOrganizationMutationVariables>(client, ChangeSelectedOrganizationDocument, variables, headers);

export const UsersDocument = `
    query Users($first: Int!, $orderBy: UserOrdering!, $orderMode: OrderingMode!, $filters: [Filter!]) {
  users(
    first: $first
    orderBy: $orderBy
    orderMode: $orderMode
    filters: $filters
  ) {
    edges {
      node {
        id
        email
      }
    }
  }
}
    `;

export const useUsersQuery = <
      TData = UsersQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: UsersQueryVariables,
      options?: Omit<UseQueryOptions<UsersQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<UsersQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<UsersQuery, TError, TData>(
      {
    queryKey: ['Users', variables],
    queryFn: fetcher<UsersQuery, UsersQueryVariables>(client, UsersDocument, variables, headers),
    ...options
  }
    )};

useUsersQuery.getKey = (variables: UsersQueryVariables) => ['Users', variables];
useUsersQuery.getRootKey = () => ['Users'] as const;
export const useInfiniteUsersQuery = <
      TData = InfiniteData<UsersQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: UsersQueryVariables,
      options: Omit<UseInfiniteQueryOptions<UsersQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<UsersQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<UsersQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['Users.infinite', variables],
      queryFn: (metaData) => fetcher<UsersQuery, UsersQueryVariables>(client, UsersDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteUsersQuery.getKey = (variables: UsersQueryVariables) => ['Users.infinite', variables];
useInfiniteUsersQuery.getRootKey = () => ['Users.infinite'] as const;
useUsersQuery.fetcher = (client: GraphQLClient, variables: UsersQueryVariables, headers?: RequestInit['headers']) => fetcher<UsersQuery, UsersQueryVariables>(client, UsersDocument, variables, headers);

export const VotingRoundCreateDocument = `
    mutation VotingRoundCreate($input: CreateVotingRoundInput!) {
  createVotingRound(input: $input) {
    ...VotingRoundRow
  }
}
    ${VotingRoundRowFragmentDoc}`;

export const useVotingRoundCreateMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<VotingRoundCreateMutation, TError, VotingRoundCreateMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<VotingRoundCreateMutation, TError, VotingRoundCreateMutationVariables, TContext>(
      {
    mutationKey: ['VotingRoundCreate'],
    mutationFn: (variables?: VotingRoundCreateMutationVariables) => fetcher<VotingRoundCreateMutation, VotingRoundCreateMutationVariables>(client, VotingRoundCreateDocument, variables, headers)(),
    ...options
  }
    )};

useVotingRoundCreateMutation.getKey = () => ['VotingRoundCreate'];
useVotingRoundCreateMutation.getRootKey = () => ['VotingRoundCreate'] as const;
useVotingRoundCreateMutation.fetcher = (client: GraphQLClient, variables: VotingRoundCreateMutationVariables, headers?: RequestInit['headers']) => fetcher<VotingRoundCreateMutation, VotingRoundCreateMutationVariables>(client, VotingRoundCreateDocument, variables, headers);

export const VotingRoundUpdateDocument = `
    mutation VotingRoundUpdate($id: VotingRoundId!, $input: UpdateVotingRoundInput!) {
  updateVotingRound(id: $id, input: $input) {
    ...VotingRoundRow
  }
}
    ${VotingRoundRowFragmentDoc}`;

export const useVotingRoundUpdateMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<VotingRoundUpdateMutation, TError, VotingRoundUpdateMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<VotingRoundUpdateMutation, TError, VotingRoundUpdateMutationVariables, TContext>(
      {
    mutationKey: ['VotingRoundUpdate'],
    mutationFn: (variables?: VotingRoundUpdateMutationVariables) => fetcher<VotingRoundUpdateMutation, VotingRoundUpdateMutationVariables>(client, VotingRoundUpdateDocument, variables, headers)(),
    ...options
  }
    )};

useVotingRoundUpdateMutation.getKey = () => ['VotingRoundUpdate'];
useVotingRoundUpdateMutation.getRootKey = () => ['VotingRoundUpdate'] as const;
useVotingRoundUpdateMutation.fetcher = (client: GraphQLClient, variables: VotingRoundUpdateMutationVariables, headers?: RequestInit['headers']) => fetcher<VotingRoundUpdateMutation, VotingRoundUpdateMutationVariables>(client, VotingRoundUpdateDocument, variables, headers);

export const VotingRoundSetStatusDocument = `
    mutation VotingRoundSetStatus($id: VotingRoundId!, $status: VotingRoundStatus!) {
  setVotingRoundStatus(id: $id, status: $status) {
    ...VotingRoundRow
  }
}
    ${VotingRoundRowFragmentDoc}`;

export const useVotingRoundSetStatusMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<VotingRoundSetStatusMutation, TError, VotingRoundSetStatusMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<VotingRoundSetStatusMutation, TError, VotingRoundSetStatusMutationVariables, TContext>(
      {
    mutationKey: ['VotingRoundSetStatus'],
    mutationFn: (variables?: VotingRoundSetStatusMutationVariables) => fetcher<VotingRoundSetStatusMutation, VotingRoundSetStatusMutationVariables>(client, VotingRoundSetStatusDocument, variables, headers)(),
    ...options
  }
    )};

useVotingRoundSetStatusMutation.getKey = () => ['VotingRoundSetStatus'];
useVotingRoundSetStatusMutation.getRootKey = () => ['VotingRoundSetStatus'] as const;
useVotingRoundSetStatusMutation.fetcher = (client: GraphQLClient, variables: VotingRoundSetStatusMutationVariables, headers?: RequestInit['headers']) => fetcher<VotingRoundSetStatusMutation, VotingRoundSetStatusMutationVariables>(client, VotingRoundSetStatusDocument, variables, headers);

export const VotingRoundDeleteDocument = `
    mutation VotingRoundDelete($id: VotingRoundId!) {
  deleteVotingRound(id: $id) {
    id
  }
}
    `;

export const useVotingRoundDeleteMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<VotingRoundDeleteMutation, TError, VotingRoundDeleteMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<VotingRoundDeleteMutation, TError, VotingRoundDeleteMutationVariables, TContext>(
      {
    mutationKey: ['VotingRoundDelete'],
    mutationFn: (variables?: VotingRoundDeleteMutationVariables) => fetcher<VotingRoundDeleteMutation, VotingRoundDeleteMutationVariables>(client, VotingRoundDeleteDocument, variables, headers)(),
    ...options
  }
    )};

useVotingRoundDeleteMutation.getKey = () => ['VotingRoundDelete'];
useVotingRoundDeleteMutation.getRootKey = () => ['VotingRoundDelete'] as const;
useVotingRoundDeleteMutation.fetcher = (client: GraphQLClient, variables: VotingRoundDeleteMutationVariables, headers?: RequestInit['headers']) => fetcher<VotingRoundDeleteMutation, VotingRoundDeleteMutationVariables>(client, VotingRoundDeleteDocument, variables, headers);

export const VotableFeatureCreateDocument = `
    mutation VotableFeatureCreate($input: CreateVotableFeatureInput!, $document: [Upload!]) {
  createVotableFeature(input: $input, document: $document) {
    ...VotableFeatureAdminRow
  }
}
    ${VotableFeatureAdminRowFragmentDoc}`;

export const useVotableFeatureCreateMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<VotableFeatureCreateMutation, TError, VotableFeatureCreateMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<VotableFeatureCreateMutation, TError, VotableFeatureCreateMutationVariables, TContext>(
      {
    mutationKey: ['VotableFeatureCreate'],
    mutationFn: (variables?: VotableFeatureCreateMutationVariables) => fetcher<VotableFeatureCreateMutation, VotableFeatureCreateMutationVariables>(client, VotableFeatureCreateDocument, variables, headers)(),
    ...options
  }
    )};

useVotableFeatureCreateMutation.getKey = () => ['VotableFeatureCreate'];
useVotableFeatureCreateMutation.getRootKey = () => ['VotableFeatureCreate'] as const;
useVotableFeatureCreateMutation.fetcher = (client: GraphQLClient, variables: VotableFeatureCreateMutationVariables, headers?: RequestInit['headers']) => fetcher<VotableFeatureCreateMutation, VotableFeatureCreateMutationVariables>(client, VotableFeatureCreateDocument, variables, headers);

export const VotableFeatureUpdateDocument = `
    mutation VotableFeatureUpdate($id: VotableFeatureId!, $input: UpdateVotableFeatureInput!, $document: [Upload!]) {
  updateVotableFeature(id: $id, input: $input, document: $document) {
    ...VotableFeatureAdminRow
  }
}
    ${VotableFeatureAdminRowFragmentDoc}`;

export const useVotableFeatureUpdateMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<VotableFeatureUpdateMutation, TError, VotableFeatureUpdateMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<VotableFeatureUpdateMutation, TError, VotableFeatureUpdateMutationVariables, TContext>(
      {
    mutationKey: ['VotableFeatureUpdate'],
    mutationFn: (variables?: VotableFeatureUpdateMutationVariables) => fetcher<VotableFeatureUpdateMutation, VotableFeatureUpdateMutationVariables>(client, VotableFeatureUpdateDocument, variables, headers)(),
    ...options
  }
    )};

useVotableFeatureUpdateMutation.getKey = () => ['VotableFeatureUpdate'];
useVotableFeatureUpdateMutation.getRootKey = () => ['VotableFeatureUpdate'] as const;
useVotableFeatureUpdateMutation.fetcher = (client: GraphQLClient, variables: VotableFeatureUpdateMutationVariables, headers?: RequestInit['headers']) => fetcher<VotableFeatureUpdateMutation, VotableFeatureUpdateMutationVariables>(client, VotableFeatureUpdateDocument, variables, headers);

export const VotableFeatureDeleteDocument = `
    mutation VotableFeatureDelete($id: VotableFeatureId!) {
  deleteVotableFeature(id: $id) {
    id
  }
}
    `;

export const useVotableFeatureDeleteMutation = <
      TError = unknown,
      TContext = unknown
    >(
      client: GraphQLClient,
      options?: UseMutationOptions<VotableFeatureDeleteMutation, TError, VotableFeatureDeleteMutationVariables, TContext>,
      headers?: RequestInit['headers']
    ) => {
    
    return useMutation<VotableFeatureDeleteMutation, TError, VotableFeatureDeleteMutationVariables, TContext>(
      {
    mutationKey: ['VotableFeatureDelete'],
    mutationFn: (variables?: VotableFeatureDeleteMutationVariables) => fetcher<VotableFeatureDeleteMutation, VotableFeatureDeleteMutationVariables>(client, VotableFeatureDeleteDocument, variables, headers)(),
    ...options
  }
    )};

useVotableFeatureDeleteMutation.getKey = () => ['VotableFeatureDelete'];
useVotableFeatureDeleteMutation.getRootKey = () => ['VotableFeatureDelete'] as const;
useVotableFeatureDeleteMutation.fetcher = (client: GraphQLClient, variables: VotableFeatureDeleteMutationVariables, headers?: RequestInit['headers']) => fetcher<VotableFeatureDeleteMutation, VotableFeatureDeleteMutationVariables>(client, VotableFeatureDeleteDocument, variables, headers);

export const VotingRoundsListDocument = `
    query VotingRoundsList {
  votingRounds {
    ...VotingRoundRow
    feature_count
  }
}
    ${VotingRoundRowFragmentDoc}`;

export const useVotingRoundsListQuery = <
      TData = VotingRoundsListQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables?: VotingRoundsListQueryVariables,
      options?: Omit<UseQueryOptions<VotingRoundsListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<VotingRoundsListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<VotingRoundsListQuery, TError, TData>(
      {
    queryKey: variables === undefined ? ['VotingRoundsList'] : ['VotingRoundsList', variables],
    queryFn: fetcher<VotingRoundsListQuery, VotingRoundsListQueryVariables>(client, VotingRoundsListDocument, variables, headers),
    ...options
  }
    )};

useVotingRoundsListQuery.getKey = (variables?: VotingRoundsListQueryVariables) => variables === undefined ? ['VotingRoundsList'] : ['VotingRoundsList', variables];
useVotingRoundsListQuery.getRootKey = () => ['VotingRoundsList'] as const;
export const useInfiniteVotingRoundsListQuery = <
      TData = InfiniteData<VotingRoundsListQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: VotingRoundsListQueryVariables,
      options: Omit<UseInfiniteQueryOptions<VotingRoundsListQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<VotingRoundsListQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<VotingRoundsListQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? variables === undefined ? ['VotingRoundsList.infinite'] : ['VotingRoundsList.infinite', variables],
      queryFn: (metaData) => fetcher<VotingRoundsListQuery, VotingRoundsListQueryVariables>(client, VotingRoundsListDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteVotingRoundsListQuery.getKey = (variables?: VotingRoundsListQueryVariables) => variables === undefined ? ['VotingRoundsList.infinite'] : ['VotingRoundsList.infinite', variables];
useInfiniteVotingRoundsListQuery.getRootKey = () => ['VotingRoundsList.infinite'] as const;
useVotingRoundsListQuery.fetcher = (client: GraphQLClient, variables?: VotingRoundsListQueryVariables, headers?: RequestInit['headers']) => fetcher<VotingRoundsListQuery, VotingRoundsListQueryVariables>(client, VotingRoundsListDocument, variables, headers);

export const VotingRoundDetailDocument = `
    query VotingRoundDetail($id: VotingRoundId!) {
  votingRound(id: $id) {
    ...VotingRoundRow
    features {
      ...VotableFeatureAdminRow
    }
  }
}
    ${VotingRoundRowFragmentDoc}
${VotableFeatureAdminRowFragmentDoc}`;

export const useVotingRoundDetailQuery = <
      TData = VotingRoundDetailQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: VotingRoundDetailQueryVariables,
      options?: Omit<UseQueryOptions<VotingRoundDetailQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<VotingRoundDetailQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<VotingRoundDetailQuery, TError, TData>(
      {
    queryKey: ['VotingRoundDetail', variables],
    queryFn: fetcher<VotingRoundDetailQuery, VotingRoundDetailQueryVariables>(client, VotingRoundDetailDocument, variables, headers),
    ...options
  }
    )};

useVotingRoundDetailQuery.getKey = (variables: VotingRoundDetailQueryVariables) => ['VotingRoundDetail', variables];
useVotingRoundDetailQuery.getRootKey = () => ['VotingRoundDetail'] as const;
export const useInfiniteVotingRoundDetailQuery = <
      TData = InfiniteData<VotingRoundDetailQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: VotingRoundDetailQueryVariables,
      options: Omit<UseInfiniteQueryOptions<VotingRoundDetailQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<VotingRoundDetailQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<VotingRoundDetailQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['VotingRoundDetail.infinite', variables],
      queryFn: (metaData) => fetcher<VotingRoundDetailQuery, VotingRoundDetailQueryVariables>(client, VotingRoundDetailDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteVotingRoundDetailQuery.getKey = (variables: VotingRoundDetailQueryVariables) => ['VotingRoundDetail.infinite', variables];
useInfiniteVotingRoundDetailQuery.getRootKey = () => ['VotingRoundDetail.infinite'] as const;
useVotingRoundDetailQuery.fetcher = (client: GraphQLClient, variables: VotingRoundDetailQueryVariables, headers?: RequestInit['headers']) => fetcher<VotingRoundDetailQuery, VotingRoundDetailQueryVariables>(client, VotingRoundDetailDocument, variables, headers);

export const VotingRoundRankingDocument = `
    query VotingRoundRanking($id: VotingRoundId!) {
  votingRoundResults(id: $id) {
    total_voters
    round {
      id
      name
      status
    }
    results {
      vote_count
      feature {
        ...VotableFeatureAdminRow
      }
    }
  }
}
    ${VotableFeatureAdminRowFragmentDoc}`;

export const useVotingRoundRankingQuery = <
      TData = VotingRoundRankingQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: VotingRoundRankingQueryVariables,
      options?: Omit<UseQueryOptions<VotingRoundRankingQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<VotingRoundRankingQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<VotingRoundRankingQuery, TError, TData>(
      {
    queryKey: ['VotingRoundRanking', variables],
    queryFn: fetcher<VotingRoundRankingQuery, VotingRoundRankingQueryVariables>(client, VotingRoundRankingDocument, variables, headers),
    ...options
  }
    )};

useVotingRoundRankingQuery.getKey = (variables: VotingRoundRankingQueryVariables) => ['VotingRoundRanking', variables];
useVotingRoundRankingQuery.getRootKey = () => ['VotingRoundRanking'] as const;
export const useInfiniteVotingRoundRankingQuery = <
      TData = InfiniteData<VotingRoundRankingQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: VotingRoundRankingQueryVariables,
      options: Omit<UseInfiniteQueryOptions<VotingRoundRankingQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<VotingRoundRankingQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<VotingRoundRankingQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['VotingRoundRanking.infinite', variables],
      queryFn: (metaData) => fetcher<VotingRoundRankingQuery, VotingRoundRankingQueryVariables>(client, VotingRoundRankingDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteVotingRoundRankingQuery.getKey = (variables: VotingRoundRankingQueryVariables) => ['VotingRoundRanking.infinite', variables];
useInfiniteVotingRoundRankingQuery.getRootKey = () => ['VotingRoundRanking.infinite'] as const;
useVotingRoundRankingQuery.fetcher = (client: GraphQLClient, variables: VotingRoundRankingQueryVariables, headers?: RequestInit['headers']) => fetcher<VotingRoundRankingQuery, VotingRoundRankingQueryVariables>(client, VotingRoundRankingDocument, variables, headers);

export const EpicCountPerTimelineQueryDocument = `
    query EpicCountPerTimelineQuery {
  countEpicsPerTimeline {
    timeline
    count
  }
}
    `;

export const useEpicCountPerTimelineQueryQuery = <
      TData = EpicCountPerTimelineQueryQuery,
      TError = unknown
    >(
      client: GraphQLClient,
      variables?: EpicCountPerTimelineQueryQueryVariables,
      options?: Omit<UseQueryOptions<EpicCountPerTimelineQueryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<EpicCountPerTimelineQueryQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useQuery<EpicCountPerTimelineQueryQuery, TError, TData>(
      {
    queryKey: variables === undefined ? ['EpicCountPerTimelineQuery'] : ['EpicCountPerTimelineQuery', variables],
    queryFn: fetcher<EpicCountPerTimelineQueryQuery, EpicCountPerTimelineQueryQueryVariables>(client, EpicCountPerTimelineQueryDocument, variables, headers),
    ...options
  }
    )};

useEpicCountPerTimelineQueryQuery.getKey = (variables?: EpicCountPerTimelineQueryQueryVariables) => variables === undefined ? ['EpicCountPerTimelineQuery'] : ['EpicCountPerTimelineQuery', variables];
useEpicCountPerTimelineQueryQuery.getRootKey = () => ['EpicCountPerTimelineQuery'] as const;
export const useInfiniteEpicCountPerTimelineQueryQuery = <
      TData = InfiniteData<EpicCountPerTimelineQueryQuery>,
      TError = unknown
    >(
      client: GraphQLClient,
      variables: EpicCountPerTimelineQueryQueryVariables,
      options: Omit<UseInfiniteQueryOptions<EpicCountPerTimelineQueryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<EpicCountPerTimelineQueryQuery, TError, TData>['queryKey'] },
      headers?: RequestInit['headers']
    ) => {
    
    return useInfiniteQuery<EpicCountPerTimelineQueryQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? variables === undefined ? ['EpicCountPerTimelineQuery.infinite'] : ['EpicCountPerTimelineQuery.infinite', variables],
      queryFn: (metaData) => fetcher<EpicCountPerTimelineQueryQuery, EpicCountPerTimelineQueryQueryVariables>(client, EpicCountPerTimelineQueryDocument, {...variables, ...(metaData.pageParam ?? {})}, headers)(),
      ...restOptions
    }
  })()
    )};

useInfiniteEpicCountPerTimelineQueryQuery.getKey = (variables?: EpicCountPerTimelineQueryQueryVariables) => variables === undefined ? ['EpicCountPerTimelineQuery.infinite'] : ['EpicCountPerTimelineQuery.infinite', variables];
useInfiniteEpicCountPerTimelineQueryQuery.getRootKey = () => ['EpicCountPerTimelineQuery.infinite'] as const;
useEpicCountPerTimelineQueryQuery.fetcher = (client: GraphQLClient, variables?: EpicCountPerTimelineQueryQueryVariables, headers?: RequestInit['headers']) => fetcher<EpicCountPerTimelineQueryQuery, EpicCountPerTimelineQueryQueryVariables>(client, EpicCountPerTimelineQueryDocument, variables, headers);
