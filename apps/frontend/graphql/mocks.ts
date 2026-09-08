import { AddServiceInput, AddSolutionCategoryInput, AddSubscriptionCapabilityInput, AddUseCaseInput, AddUserInput, AddUsersToBundleGroupsInput, AdminAddUserInput, AdminEditUserInput, AutoRegisterPlatformInput, BulkPendingUserFromOrganizationInput, BundleUserRoleAssignmentInput, BundleUserServiceGroup, CanUnregisterPlatformInput, CanUnregisterResponse, Capability, Competitor, CompetitorConnection, CompetitorEdge, Connector, ConsumeProvisionedNewsFeedItemsResponse, CreateCompetitorInput, CreateDeploymentRequestInput, CreateDocumentInput, CreateEpicInput, CreateSubscriptionsInput, CreateVotableFeatureInput, CreateVotingRoundInput, CsvFeed, CustomDashboard, CustomView, DefaultDocument, DeployedPlatform, DeployedResource, DeploymentAvailability, DeploymentRequest, DeploymentRequestConnection, DeploymentRequestEdge, DeploymentRequestFilter, Document, DocumentConnection, DocumentEdge, DocumentMetadata, EditMeUserInput, EditSeoServiceInstanceInput, EditSolutionCategoryInput, EditUseCaseInput, EditUserCapabilitiesInput, Epic, EpicConnection, EpicCountPerTimeline, EpicEdge, Filter, GenericServiceCapability, Integration, IntegrationHack, IsPlatformRegisteredInput, IsPlatformRegisteredOrganization, IsPlatformRegisteredResponse, LastDeployedOverview, LogicalFilterInput, ManifestFragmentInput, MeUserSubscription, MergeEvent, Mutation, NewsFeedItem, NewsFeedItemConnection, NewsFeedItemEdge, NewsFeedItemMetadata, Node, OneClickDeployInput, OpenAevScenario, OpenCtiPlatformRegistrationStatusInput, OpenCtiPlatformRegistrationStatusResponse, OpenCtiPlaybook, Organization, OrganizationCapabilities, OrganizationCapabilitiesInput, OrganizationConnection, OrganizationEdge, OrganizationInput, OrganizationRef, PageInfo, PlatformDeploymentRequest, PlatformDeploymentRequestConnection, PlatformDeploymentRequestEdge, PlatformInput, PlatformProvider, PlatformTrialStatus, ProductUseCaseInput, ProvisionedNewsFeedItem, Query, RefreshPlatformRegistrationConnectivityStatusAllTenantsInput, RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse, RefreshPlatformRegistrationConnectivityStatusInput, RefreshPlatformRegistrationConnectivityStatusResponse, RefreshPlatformRegistrationConnectivityStatusSingleTenantInput, RefreshUserPlatformTokenResponse, RegisterPlatformInput, RegisteredPlatform, RegisteredPlatformInput, RegisteredPlatformsInput, RegisteredProductVersion, RegistrationResponse, ReorderDeploymentRequestInQueueInput, RolePortal, RssFeed, SendTelemetryMutation, SeoServiceInstance, SeoServiceInstanceMetadata, ServiceCapability, ServiceConnection, ServiceDefinition, ServiceGroup, ServiceInstance, ServiceInstanceEdge, ServiceInstanceFilter, ServiceInstanceSubscription, ServiceLink, Settings, ShareableResource, SolutionCategory, SolutionCategoryConnection, SolutionCategoryEdge, Stream, SubscribedServiceInstanceConfiguration, Subscription, SubscriptionCapability, SubscriptionConnection, SubscriptionEdge, SubscriptionFilter, SubscriptionModel, Success, TaxiiFeed, TelemetryResponse, TenantDetails, TenantStatus, ThirdPartyIntegration, TrialDeploymentsInput, TrialsDeployments, UnregisterPlatformInput, UpdateBundleUserGroupsInput, UpdateBundleUserGroupsRoleInput, UpdateCompetitorInput, UpdateDeploymentQuotaCapacityInput, UpdateDeploymentRequestInput, UpdateDocumentInput, UpdateEpicInput, UpdatePlatformServiceMetadataInput, UpdateServiceGroupsInput, UpdateServiceGroupsInputGroup, UpdateSubscriptionInput, UpdateVotableFeatureInput, UpdateVotingRoundInput, UseCase, UseCaseConnection, UseCaseEdge, User, UserConnection, UserEdge, UserPendingSubscription, UserPlatformGroup, UserService, UserServiceAddInput, UserServiceAddYourselfInput, UserServiceCapabilitiesResponse, UserServiceCapability, UserServiceConnection, UserServiceDeleted, UserServiceEdge, UserServiceEditInput, UserServicesAddCapabilitiesInput, UserServicesDeleteInput, UserSubscription, UsersWithCapabilitiesInOrganizationInput, VotableFeature, VotableFeatureResult, VotingRound, VotingRoundResults, XtmoneIntegrationStatus, XtmoneIntegrationStatusEntry, CompetitorOrdering, CompetitorTier, DeploymentRequestActivitySector, DeploymentRequestDeploymentType, DeploymentRequestFilterKey, DeploymentRequestHubStatus, DeploymentRequestJobTitle, DeploymentRequestOrdering, DeploymentRequestPlatformRegion, DeploymentRequestPlatformState, DeploymentRequestSource, DeploymentRequestUseCase, DocumentImageType, DocumentMetadataKeyCode, DocumentOrdering, DocumentSourceType, EditionType, EpicOrdering, EpicType, FeatureFlag, FiligranProduct, FilterKey, IntegrationType, LicenseType, LogicalOperator, ManifestType, NewsFeedItemMetadataKey, NewsFeedItemType, OrderingMode, OrganizationCapability, OrganizationOrdering, PlatformConfigurationStatus, PlatformContract, PlatformIdentifier, PlatformRegistrationConnectivityStatus, PlatformRegistrationStatus, PortalCapability, ReorderDeploymentRequestInQueueDirection, SeoServiceInstanceLanguage, ServiceDefinitionIdentifier, ServiceGroupName, ServiceInstanceCreationStatus, ServiceInstanceFilterKey, ServiceInstanceOrdering, ServiceInstanceTag, ServiceRestriction, SolutionCategoryOrdering, SubscriptionFilterKey, SubscriptionOrdering, Timeline, UseCaseOrdering, UserOrdering, UserServiceOrdering, VotingRoundStatus, VotingRoundTheme } from './generated';

export const mockAddServiceInput = (overrides?: Partial<AddServiceInput>, _relationshipsToOmit: Set<string> = new Set()): AddServiceInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('AddServiceInput');
    return {
        fee_type: overrides && overrides.hasOwnProperty('fee_type') ? overrides.fee_type! : 'alienus',
        organization_id: overrides && overrides.hasOwnProperty('organization_id') ? overrides.organization_id! : 'succedo',
        price: overrides && overrides.hasOwnProperty('price') ? overrides.price! : 2077,
        service_instance_description: overrides && overrides.hasOwnProperty('service_instance_description') ? overrides.service_instance_description! : 'quasi',
        service_instance_name: overrides && overrides.hasOwnProperty('service_instance_name') ? overrides.service_instance_name! : 'vulariter',
        url: overrides && overrides.hasOwnProperty('url') ? overrides.url! : 'acsi',
    };
};

export const mockAddSolutionCategoryInput = (overrides?: Partial<AddSolutionCategoryInput>, _relationshipsToOmit: Set<string> = new Set()): AddSolutionCategoryInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('AddSolutionCategoryInput');
    return {
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'amoveo',
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : [FiligranProduct.Openaev],
    };
};

export const mockAddSubscriptionCapabilityInput = (overrides?: Partial<AddSubscriptionCapabilityInput>, _relationshipsToOmit: Set<string> = new Set()): AddSubscriptionCapabilityInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('AddSubscriptionCapabilityInput');
    return {
        capabilitiesId: overrides && overrides.hasOwnProperty('capabilitiesId') ? overrides.capabilitiesId! : ['una'],
        subscriptionsId: overrides && overrides.hasOwnProperty('subscriptionsId') ? overrides.subscriptionsId! : ['somnus'],
    };
};

export const mockAddUseCaseInput = (overrides?: Partial<AddUseCaseInput>, _relationshipsToOmit: Set<string> = new Set()): AddUseCaseInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('AddUseCaseInput');
    return {
        color: overrides && overrides.hasOwnProperty('color') ? overrides.color! : 'claudeo',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'sordeo',
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : [FiligranProduct.Openaev],
    };
};

export const mockAddUserInput = (overrides?: Partial<AddUserInput>, _relationshipsToOmit: Set<string> = new Set()): AddUserInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('AddUserInput');
    return {
        capabilities: overrides && overrides.hasOwnProperty('capabilities') ? overrides.capabilities! : ['tamisium'],
        email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : 'voro',
        password: overrides && overrides.hasOwnProperty('password') ? overrides.password! : 'alii',
    };
};

export const mockAddUsersToBundleGroupsInput = (overrides?: Partial<AddUsersToBundleGroupsInput>, _relationshipsToOmit: Set<string> = new Set()): AddUsersToBundleGroupsInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('AddUsersToBundleGroupsInput');
    return {
        roles: overrides && overrides.hasOwnProperty('roles') ? overrides.roles! : [relationshipsToOmit.has('BundleUserRoleAssignmentInput') ? {} as BundleUserRoleAssignmentInput : mockBundleUserRoleAssignmentInput({}, relationshipsToOmit)],
        userIds: overrides && overrides.hasOwnProperty('userIds') ? overrides.userIds! : ['texo'],
    };
};

export const mockAdminAddUserInput = (overrides?: Partial<AdminAddUserInput>, _relationshipsToOmit: Set<string> = new Set()): AdminAddUserInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('AdminAddUserInput');
    return {
        email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : 'confugo',
        first_name: overrides && overrides.hasOwnProperty('first_name') ? overrides.first_name! : 'et',
        last_name: overrides && overrides.hasOwnProperty('last_name') ? overrides.last_name! : 'adficio',
        organization_capabilities: overrides && overrides.hasOwnProperty('organization_capabilities') ? overrides.organization_capabilities! : [relationshipsToOmit.has('OrganizationCapabilitiesInput') ? {} as OrganizationCapabilitiesInput : mockOrganizationCapabilitiesInput({}, relationshipsToOmit)],
        password: overrides && overrides.hasOwnProperty('password') ? overrides.password! : 'delectatio',
    };
};

export const mockAdminEditUserInput = (overrides?: Partial<AdminEditUserInput>, _relationshipsToOmit: Set<string> = new Set()): AdminEditUserInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('AdminEditUserInput');
    return {
        disabled: overrides && overrides.hasOwnProperty('disabled') ? overrides.disabled! : false,
        email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : 'nihil',
        first_name: overrides && overrides.hasOwnProperty('first_name') ? overrides.first_name! : 'crux',
        last_name: overrides && overrides.hasOwnProperty('last_name') ? overrides.last_name! : 'aliquam',
        organization_capabilities: overrides && overrides.hasOwnProperty('organization_capabilities') ? overrides.organization_capabilities! : [relationshipsToOmit.has('OrganizationCapabilitiesInput') ? {} as OrganizationCapabilitiesInput : mockOrganizationCapabilitiesInput({}, relationshipsToOmit)],
    };
};

export const mockAutoRegisterPlatformInput = (overrides?: Partial<AutoRegisterPlatformInput>, _relationshipsToOmit: Set<string> = new Set()): AutoRegisterPlatformInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('AutoRegisterPlatformInput');
    return {
        existing_users_count: overrides && overrides.hasOwnProperty('existing_users_count') ? overrides.existing_users_count! : 1197,
        platform: overrides && overrides.hasOwnProperty('platform') ? overrides.platform! : relationshipsToOmit.has('PlatformInput') ? {} as PlatformInput : mockPlatformInput({}, relationshipsToOmit),
    };
};

export const mockBulkPendingUserFromOrganizationInput = (overrides?: Partial<BulkPendingUserFromOrganizationInput>, _relationshipsToOmit: Set<string> = new Set()): BulkPendingUserFromOrganizationInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('BulkPendingUserFromOrganizationInput');
    return {
        excludedIds: overrides && overrides.hasOwnProperty('excludedIds') ? overrides.excludedIds! : ['ager'],
        filters: overrides && overrides.hasOwnProperty('filters') ? overrides.filters! : [relationshipsToOmit.has('Filter') ? {} as Filter : mockFilter({}, relationshipsToOmit)],
        ids: overrides && overrides.hasOwnProperty('ids') ? overrides.ids! : ['natus'],
        searchTerm: overrides && overrides.hasOwnProperty('searchTerm') ? overrides.searchTerm! : 'succurro',
    };
};

export const mockBundleUserRoleAssignmentInput = (overrides?: Partial<BundleUserRoleAssignmentInput>, _relationshipsToOmit: Set<string> = new Set()): BundleUserRoleAssignmentInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('BundleUserRoleAssignmentInput');
    return {
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : PlatformIdentifier.Openaev,
        role: overrides && overrides.hasOwnProperty('role') ? overrides.role! : ServiceGroupName.Admin,
    };
};

export const mockBundleUserServiceGroup = (overrides?: Partial<BundleUserServiceGroup>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'BundleUserServiceGroup' } & BundleUserServiceGroup => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('BundleUserServiceGroup');
    return {
        __typename: 'BundleUserServiceGroup',
        groups: overrides && overrides.hasOwnProperty('groups') ? overrides.groups! : [relationshipsToOmit.has('UserPlatformGroup') ? {} as UserPlatformGroup : mockUserPlatformGroup({}, relationshipsToOmit)],
        user: overrides && overrides.hasOwnProperty('user') ? overrides.user! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
    };
};

export const mockCanUnregisterPlatformInput = (overrides?: Partial<CanUnregisterPlatformInput>, _relationshipsToOmit: Set<string> = new Set()): CanUnregisterPlatformInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CanUnregisterPlatformInput');
    return {
        platformId: overrides && overrides.hasOwnProperty('platformId') ? overrides.platformId! : 'accommodo',
        tenantId: overrides && overrides.hasOwnProperty('tenantId') ? overrides.tenantId! : 'suasoria',
    };
};

export const mockCanUnregisterResponse = (overrides?: Partial<CanUnregisterResponse>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'CanUnregisterResponse' } & CanUnregisterResponse => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CanUnregisterResponse');
    return {
        __typename: 'CanUnregisterResponse',
        isAllowed: overrides && overrides.hasOwnProperty('isAllowed') ? overrides.isAllowed! : true,
        isInOrganization: overrides && overrides.hasOwnProperty('isInOrganization') ? overrides.isInOrganization! : true,
        isPlatformRegistered: overrides && overrides.hasOwnProperty('isPlatformRegistered') ? overrides.isPlatformRegistered! : false,
        organizationId: overrides && overrides.hasOwnProperty('organizationId') ? overrides.organizationId! : 'vinculum',
    };
};

export const mockCapability = (overrides?: Partial<Capability>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Capability' } & Capability => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Capability');
    return {
        __typename: 'Capability',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'b988a465-29a8-46c5-89bf-f8480c00cde4',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : PortalCapability.Bypass,
    };
};

export const mockCompetitor = (overrides?: Partial<Competitor>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Competitor' } & Competitor => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Competitor');
    return {
        __typename: 'Competitor',
        domain: overrides && overrides.hasOwnProperty('domain') ? overrides.domain! : 'conforto',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '7639c730-8387-431d-935f-6d4c5f6de10d',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'adsum',
        tier: overrides && overrides.hasOwnProperty('tier') ? overrides.tier! : CompetitorTier.Tier1,
    };
};

export const mockCompetitorConnection = (overrides?: Partial<CompetitorConnection>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'CompetitorConnection' } & CompetitorConnection => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CompetitorConnection');
    return {
        __typename: 'CompetitorConnection',
        edges: overrides && overrides.hasOwnProperty('edges') ? overrides.edges! : [relationshipsToOmit.has('CompetitorEdge') ? {} as CompetitorEdge : mockCompetitorEdge({}, relationshipsToOmit)],
        pageInfo: overrides && overrides.hasOwnProperty('pageInfo') ? overrides.pageInfo! : relationshipsToOmit.has('PageInfo') ? {} as PageInfo : mockPageInfo({}, relationshipsToOmit),
        totalCount: overrides && overrides.hasOwnProperty('totalCount') ? overrides.totalCount! : 5126,
    };
};

export const mockCompetitorEdge = (overrides?: Partial<CompetitorEdge>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'CompetitorEdge' } & CompetitorEdge => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CompetitorEdge');
    return {
        __typename: 'CompetitorEdge',
        cursor: overrides && overrides.hasOwnProperty('cursor') ? overrides.cursor! : 'ager',
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('Competitor') ? {} as Competitor : mockCompetitor({}, relationshipsToOmit),
    };
};

export const mockConnector = (overrides?: Partial<Connector>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Connector' } & Connector => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Connector');
    return {
        __typename: 'Connector',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : true,
        blogpost_url: overrides && overrides.hasOwnProperty('blogpost_url') ? overrides.blogpost_url! : 'caute',
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        contact: overrides && overrides.hasOwnProperty('contact') ? overrides.contact! : 'cubo',
        container_image: overrides && overrides.hasOwnProperty('container_image') ? overrides.container_image! : 'sollers',
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-06-06T02:21:37.850Z',
        datasheet_url: overrides && overrides.hasOwnProperty('datasheet_url') ? overrides.datasheet_url! : 'adfectus',
        demo_url: overrides && overrides.hasOwnProperty('demo_url') ? overrides.demo_url! : 'vitium',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'tamen',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 1433,
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'defungo',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '2d6afa55-5d34-423e-a46f-e5ca9fc9ace2',
        integration_type: overrides && overrides.hasOwnProperty('integration_type') ? overrides.integration_type! : IntegrationType.Connector,
        license_type: overrides && overrides.hasOwnProperty('license_type') ? overrides.license_type! : LicenseType.Commercial,
        manager_supported: overrides && overrides.hasOwnProperty('manager_supported') ? overrides.manager_supported! : true,
        minimum_deployable_version: overrides && overrides.hasOwnProperty('minimum_deployable_version') ? overrides.minimum_deployable_version! : 'ventosus',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'tergiversatio',
        playbook_supported: overrides && overrides.hasOwnProperty('playbook_supported') ? overrides.playbook_supported! : true,
        product_version: overrides && overrides.hasOwnProperty('product_version') ? overrides.product_version! : 'quibusdam',
        remover_id: overrides && overrides.hasOwnProperty('remover_id') ? overrides.remover_id! : 'ea7a600e-7ea5-47dc-85fc-3a6bd1d4649e',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'a',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 8216,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'conscendo',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'volo',
        solution_categories: overrides && overrides.hasOwnProperty('solution_categories') ? overrides.solution_categories! : [relationshipsToOmit.has('SolutionCategory') ? {} as SolutionCategory : mockSolutionCategory({}, relationshipsToOmit)],
        source_code: overrides && overrides.hasOwnProperty('source_code') ? overrides.source_code! : 'cui',
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        subscription_link: overrides && overrides.hasOwnProperty('subscription_link') ? overrides.subscription_link! : 'torrens',
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'abduco',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-06-27T11:11:29.899Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'excepturi',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
        verified: overrides && overrides.hasOwnProperty('verified') ? overrides.verified! : true,
        version: overrides && overrides.hasOwnProperty('version') ? overrides.version! : 'agnitio',
    };
};

export const mockConsumeProvisionedNewsFeedItemsResponse = (overrides?: Partial<ConsumeProvisionedNewsFeedItemsResponse>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'ConsumeProvisionedNewsFeedItemsResponse' } & ConsumeProvisionedNewsFeedItemsResponse => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ConsumeProvisionedNewsFeedItemsResponse');
    return {
        __typename: 'ConsumeProvisionedNewsFeedItemsResponse',
        available_news_feed_types: overrides && overrides.hasOwnProperty('available_news_feed_types') ? overrides.available_news_feed_types! : [NewsFeedItemType.ResourceCustomDashboard],
        news_feed_items: overrides && overrides.hasOwnProperty('news_feed_items') ? overrides.news_feed_items! : [relationshipsToOmit.has('ProvisionedNewsFeedItem') ? {} as ProvisionedNewsFeedItem : mockProvisionedNewsFeedItem({}, relationshipsToOmit)],
    };
};

export const mockCreateCompetitorInput = (overrides?: Partial<CreateCompetitorInput>, _relationshipsToOmit: Set<string> = new Set()): CreateCompetitorInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CreateCompetitorInput');
    return {
        domain: overrides && overrides.hasOwnProperty('domain') ? overrides.domain! : 'alter',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'demoror',
        tier: overrides && overrides.hasOwnProperty('tier') ? overrides.tier! : CompetitorTier.Tier1,
    };
};

export const mockCreateDeploymentRequestInput = (overrides?: Partial<CreateDeploymentRequestInput>, _relationshipsToOmit: Set<string> = new Set()): CreateDeploymentRequestInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CreateDeploymentRequestInput');
    return {
        activity_sector: overrides && overrides.hasOwnProperty('activity_sector') ? overrides.activity_sector! : DeploymentRequestActivitySector.ComputerGames,
        job_title: overrides && overrides.hasOwnProperty('job_title') ? overrides.job_title! : DeploymentRequestJobTitle.ApplicationSecuritySpecialist,
        products: overrides && overrides.hasOwnProperty('products') ? overrides.products! : [PlatformIdentifier.Openaev],
        region: overrides && overrides.hasOwnProperty('region') ? overrides.region! : DeploymentRequestPlatformRegion.ApacAu,
        source: overrides && overrides.hasOwnProperty('source') ? overrides.source! : DeploymentRequestSource.OpenaevDemo,
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : DeploymentRequestDeploymentType.Bundle,
        use_cases_by_product: overrides && overrides.hasOwnProperty('use_cases_by_product') ? overrides.use_cases_by_product! : [relationshipsToOmit.has('ProductUseCaseInput') ? {} as ProductUseCaseInput : mockProductUseCaseInput({}, relationshipsToOmit)],
    };
};

export const mockCreateDocumentInput = (overrides?: Partial<CreateDocumentInput>, _relationshipsToOmit: Set<string> = new Set()): CreateDocumentInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CreateDocumentInput');
    return {
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : false,
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'spes',
        entity_types: overrides && overrides.hasOwnProperty('entity_types') ? overrides.entity_types! : ['vorax'],
        license_type: overrides && overrides.hasOwnProperty('license_type') ? overrides.license_type! : LicenseType.Commercial,
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'attollo',
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'appono',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'tutamen',
        solution_categories: overrides && overrides.hasOwnProperty('solution_categories') ? overrides.solution_categories! : ['voluntarius'],
        uploader_id: overrides && overrides.hasOwnProperty('uploader_id') ? overrides.uploader_id! : 'eos',
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : ['deleniti'],
    };
};

export const mockCreateEpicInput = (overrides?: Partial<CreateEpicInput>, _relationshipsToOmit: Set<string> = new Set()): CreateEpicInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CreateEpicInput');
    return {
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : true,
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'corrumpo',
        edition_type: overrides && overrides.hasOwnProperty('edition_type') ? overrides.edition_type! : EditionType.CommunityEdition,
        illustration_document: overrides && overrides.hasOwnProperty('illustration_document') ? overrides.illustration_document! : 'comminor',
        is_integration: overrides && overrides.hasOwnProperty('is_integration') ? overrides.is_integration! : true,
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : FiligranProduct.Openaev,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'ter',
        timeline: overrides && overrides.hasOwnProperty('timeline') ? overrides.timeline! : Timeline.Finished,
        title: overrides && overrides.hasOwnProperty('title') ? overrides.title! : 'suggero',
    };
};

export const mockCreateSubscriptionsInput = (overrides?: Partial<CreateSubscriptionsInput>, _relationshipsToOmit: Set<string> = new Set()): CreateSubscriptionsInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CreateSubscriptionsInput');
    return {
        capability_ids: overrides && overrides.hasOwnProperty('capability_ids') ? overrides.capability_ids! : ['cruciamentum'],
        end_date: overrides && overrides.hasOwnProperty('end_date') ? overrides.end_date! : '2021-11-15T05:37:02.684Z',
        organization_id: overrides && overrides.hasOwnProperty('organization_id') ? overrides.organization_id! : ['soleo'],
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'arbor',
        start_date: overrides && overrides.hasOwnProperty('start_date') ? overrides.start_date! : '2021-06-19T04:46:21.088Z',
    };
};

export const mockCreateVotableFeatureInput = (overrides?: Partial<CreateVotableFeatureInput>, _relationshipsToOmit: Set<string> = new Set()): CreateVotableFeatureInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CreateVotableFeatureInput');
    return {
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : true,
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'eius',
        position: overrides && overrides.hasOwnProperty('position') ? overrides.position! : 4155,
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : FiligranProduct.Openaev,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'supra',
        title: overrides && overrides.hasOwnProperty('title') ? overrides.title! : 'illum',
        use_case_ids: overrides && overrides.hasOwnProperty('use_case_ids') ? overrides.use_case_ids! : ['abundans'],
        voting_round_id: overrides && overrides.hasOwnProperty('voting_round_id') ? overrides.voting_round_id! : 'tripudio',
    };
};

export const mockCreateVotingRoundInput = (overrides?: Partial<CreateVotingRoundInput>, _relationshipsToOmit: Set<string> = new Set()): CreateVotingRoundInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CreateVotingRoundInput');
    return {
        copy_features_from_round_id: overrides && overrides.hasOwnProperty('copy_features_from_round_id') ? overrides.copy_features_from_round_id! : 'tenax',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'sub',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'cometes',
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'trans',
        theme: overrides && overrides.hasOwnProperty('theme') ? overrides.theme! : VotingRoundTheme.Default,
    };
};

export const mockCsvFeed = (overrides?: Partial<CsvFeed>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'CsvFeed' } & CsvFeed => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CsvFeed');
    return {
        __typename: 'CsvFeed',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : false,
        blogpost_url: overrides && overrides.hasOwnProperty('blogpost_url') ? overrides.blogpost_url! : 'accusantium',
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-03-09T23:44:00.946Z',
        datasheet_url: overrides && overrides.hasOwnProperty('datasheet_url') ? overrides.datasheet_url! : 'altus',
        demo_url: overrides && overrides.hasOwnProperty('demo_url') ? overrides.demo_url! : 'beatus',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'cuius',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 996,
        feed_url: overrides && overrides.hasOwnProperty('feed_url') ? overrides.feed_url! : 'urbs',
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'vergo',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'd402862e-4ba9-471e-8250-231891e18194',
        integration_type: overrides && overrides.hasOwnProperty('integration_type') ? overrides.integration_type! : IntegrationType.Connector,
        license_type: overrides && overrides.hasOwnProperty('license_type') ? overrides.license_type! : LicenseType.Commercial,
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'dens',
        remover_id: overrides && overrides.hasOwnProperty('remover_id') ? overrides.remover_id! : '0af6b54c-b4cb-4866-ac7f-f95fae1a248b',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'velociter',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 7303,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'contego',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'congregatio',
        solution_categories: overrides && overrides.hasOwnProperty('solution_categories') ? overrides.solution_categories! : [relationshipsToOmit.has('SolutionCategory') ? {} as SolutionCategory : mockSolutionCategory({}, relationshipsToOmit)],
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'depulso',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-11-19T00:40:26.710Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'conicio',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
    };
};

export const mockCustomDashboard = (overrides?: Partial<CustomDashboard>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'CustomDashboard' } & CustomDashboard => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CustomDashboard');
    return {
        __typename: 'CustomDashboard',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : true,
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-02-26T11:07:24.595Z',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'claro',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 8039,
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'repellat',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '1267efdc-ad36-431f-b796-45d4434b82bc',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'adeo',
        product_version: overrides && overrides.hasOwnProperty('product_version') ? overrides.product_version! : 'thalassinus',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'odit',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 8754,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'curso',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'pecco',
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'ducimus',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-06-23T14:50:59.069Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'modi',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
    };
};

export const mockCustomView = (overrides?: Partial<CustomView>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'CustomView' } & CustomView => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('CustomView');
    return {
        __typename: 'CustomView',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : false,
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-01-16T00:25:14.770Z',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'fugiat',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 7554,
        entity_types: overrides && overrides.hasOwnProperty('entity_types') ? overrides.entity_types! : ['vomica'],
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'defetiscor',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '819df404-7e54-4aa9-9b88-82cb22749625',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'vito',
        product_version: overrides && overrides.hasOwnProperty('product_version') ? overrides.product_version! : 'tenuis',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'color',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 9547,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'sollers',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'demonstro',
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'debitis',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-01-07T20:08:32.912Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'adsuesco',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
    };
};

export const mockDefaultDocument = (overrides?: Partial<DefaultDocument>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'DefaultDocument' } & DefaultDocument => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('DefaultDocument');
    return {
        __typename: 'DefaultDocument',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : false,
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-01-09T03:39:30.695Z',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'vergo',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 948,
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'blandior',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'c3661972-135f-4ce5-a554-4434c7c46f42',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'tutamen',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'aliquid',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 7741,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'molestiae',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'demoror',
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'cribro',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-04-20T22:05:16.944Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'ars',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
    };
};

export const mockDeployedPlatform = (overrides?: Partial<DeployedPlatform>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'DeployedPlatform' } & DeployedPlatform => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('DeployedPlatform');
    return {
        __typename: 'DeployedPlatform',
        platformIdentifier: overrides && overrides.hasOwnProperty('platformIdentifier') ? overrides.platformIdentifier! : PlatformIdentifier.Openaev,
        serviceInstanceId: overrides && overrides.hasOwnProperty('serviceInstanceId') ? overrides.serviceInstanceId! : 'tam',
    };
};

export const mockDeployedResource = (overrides?: Partial<DeployedResource>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'DeployedResource' } & DeployedResource => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('DeployedResource');
    return {
        __typename: 'DeployedResource',
        deployedAt: overrides && overrides.hasOwnProperty('deployedAt') ? overrides.deployedAt! : '2021-02-04T10:34:18.212Z',
        deployedBy: overrides && overrides.hasOwnProperty('deployedBy') ? overrides.deployedBy! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        document: overrides && overrides.hasOwnProperty('document') ? overrides.document! : relationshipsToOmit.has('Document') ? {} as Document : mockDocument({}, relationshipsToOmit),
    };
};

export const mockDeploymentAvailability = (overrides?: Partial<DeploymentAvailability>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'DeploymentAvailability' } & DeploymentAvailability => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('DeploymentAvailability');
    return {
        __typename: 'DeploymentAvailability',
        availableCount: overrides && overrides.hasOwnProperty('availableCount') ? overrides.availableCount! : 6555,
        capacity: overrides && overrides.hasOwnProperty('capacity') ? overrides.capacity! : 2192,
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '6b4611b2-0741-4176-b330-9117b080b913',
        platform_identifier: overrides && overrides.hasOwnProperty('platform_identifier') ? overrides.platform_identifier! : PlatformIdentifier.Openaev,
        region: overrides && overrides.hasOwnProperty('region') ? overrides.region! : DeploymentRequestPlatformRegion.ApacAu,
    };
};

export const mockDeploymentRequest = (overrides?: Partial<DeploymentRequest>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'DeploymentRequest' } & DeploymentRequest => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('DeploymentRequest');
    return {
        __typename: 'DeploymentRequest',
        activity_sector: overrides && overrides.hasOwnProperty('activity_sector') ? overrides.activity_sector! : DeploymentRequestActivitySector.ComputerGames,
        cancellation_date: overrides && overrides.hasOwnProperty('cancellation_date') ? overrides.cancellation_date! : '2021-03-18T02:32:36.736Z',
        cancellation_reason: overrides && overrides.hasOwnProperty('cancellation_reason') ? overrides.cancellation_reason! : 'sodalitas',
        cancellation_user_email: overrides && overrides.hasOwnProperty('cancellation_user_email') ? overrides.cancellation_user_email! : 'adipisci',
        children: overrides && overrides.hasOwnProperty('children') ? overrides.children! : [relationshipsToOmit.has('DeploymentRequest') ? {} as DeploymentRequest : mockDeploymentRequest({}, relationshipsToOmit)],
        counts_in_orga_quota: overrides && overrides.hasOwnProperty('counts_in_orga_quota') ? overrides.counts_in_orga_quota! : true,
        end_date: overrides && overrides.hasOwnProperty('end_date') ? overrides.end_date! : '2021-07-23T20:46:30.210Z',
        hub_status: overrides && overrides.hasOwnProperty('hub_status') ? overrides.hub_status! : DeploymentRequestHubStatus.Active,
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'dea1da54-7026-41e4-9cda-27ec2b272c42',
        job_title: overrides && overrides.hasOwnProperty('job_title') ? overrides.job_title! : DeploymentRequestJobTitle.ApplicationSecuritySpecialist,
        ordering: overrides && overrides.hasOwnProperty('ordering') ? overrides.ordering! : 3841,
        organization_name: overrides && overrides.hasOwnProperty('organization_name') ? overrides.organization_name! : 'bibo',
        organization_requester_id: overrides && overrides.hasOwnProperty('organization_requester_id') ? overrides.organization_requester_id! : 'titulus',
        parent_id: overrides && overrides.hasOwnProperty('parent_id') ? overrides.parent_id! : 'desino',
        platform_id: overrides && overrides.hasOwnProperty('platform_id') ? overrides.platform_id! : 'arca',
        platform_identifier: overrides && overrides.hasOwnProperty('platform_identifier') ? overrides.platform_identifier! : PlatformIdentifier.Openaev,
        platform_url: overrides && overrides.hasOwnProperty('platform_url') ? overrides.platform_url! : 'deleniti',
        region: overrides && overrides.hasOwnProperty('region') ? overrides.region! : DeploymentRequestPlatformRegion.ApacAu,
        registered_platform: overrides && overrides.hasOwnProperty('registered_platform') ? overrides.registered_platform! : relationshipsToOmit.has('RegisteredPlatform') ? {} as RegisteredPlatform : mockRegisteredPlatform({}, relationshipsToOmit),
        request_date: overrides && overrides.hasOwnProperty('request_date') ? overrides.request_date! : '2021-12-09T17:29:43.905Z',
        requester_email: overrides && overrides.hasOwnProperty('requester_email') ? overrides.requester_email! : 'veritatis',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'tumultus',
        start_date: overrides && overrides.hasOwnProperty('start_date') ? overrides.start_date! : '2021-05-11T01:52:30.491Z',
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : DeploymentRequestDeploymentType.Bundle,
        url: overrides && overrides.hasOwnProperty('url') ? overrides.url! : 'adnuo',
        use_case: overrides && overrides.hasOwnProperty('use_case') ? overrides.use_case! : DeploymentRequestUseCase.AttackSimulation,
    };
};

export const mockDeploymentRequestConnection = (overrides?: Partial<DeploymentRequestConnection>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'DeploymentRequestConnection' } & DeploymentRequestConnection => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('DeploymentRequestConnection');
    return {
        __typename: 'DeploymentRequestConnection',
        edges: overrides && overrides.hasOwnProperty('edges') ? overrides.edges! : [relationshipsToOmit.has('DeploymentRequestEdge') ? {} as DeploymentRequestEdge : mockDeploymentRequestEdge({}, relationshipsToOmit)],
        pageInfo: overrides && overrides.hasOwnProperty('pageInfo') ? overrides.pageInfo! : relationshipsToOmit.has('PageInfo') ? {} as PageInfo : mockPageInfo({}, relationshipsToOmit),
        totalCount: overrides && overrides.hasOwnProperty('totalCount') ? overrides.totalCount! : 7545,
    };
};

export const mockDeploymentRequestEdge = (overrides?: Partial<DeploymentRequestEdge>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'DeploymentRequestEdge' } & DeploymentRequestEdge => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('DeploymentRequestEdge');
    return {
        __typename: 'DeploymentRequestEdge',
        cursor: overrides && overrides.hasOwnProperty('cursor') ? overrides.cursor! : 'tunc',
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('DeploymentRequest') ? {} as DeploymentRequest : mockDeploymentRequest({}, relationshipsToOmit),
    };
};

export const mockDeploymentRequestFilter = (overrides?: Partial<DeploymentRequestFilter>, _relationshipsToOmit: Set<string> = new Set()): DeploymentRequestFilter => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('DeploymentRequestFilter');
    return {
        key: overrides && overrides.hasOwnProperty('key') ? overrides.key! : DeploymentRequestFilterKey.ActualState,
        value: overrides && overrides.hasOwnProperty('value') ? overrides.value! : ['adhaero'],
    };
};

export const mockDocument = (overrides?: Partial<Document>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Document' } & Document => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Document');
    return {
        __typename: 'Document',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : true,
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-04-20T23:59:15.763Z',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'natus',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 2269,
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'cupio',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'ab777987-09a3-448f-a2b6-4c0ecc3b45da',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'curia',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'aspicio',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 6849,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'aranea',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'tabella',
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'bellum',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-01-22T20:50:56.924Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'adulatio',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
    };
};

export const mockDocumentConnection = (overrides?: Partial<DocumentConnection>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'DocumentConnection' } & DocumentConnection => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('DocumentConnection');
    return {
        __typename: 'DocumentConnection',
        edges: overrides && overrides.hasOwnProperty('edges') ? overrides.edges! : [relationshipsToOmit.has('DocumentEdge') ? {} as DocumentEdge : mockDocumentEdge({}, relationshipsToOmit)],
        pageInfo: overrides && overrides.hasOwnProperty('pageInfo') ? overrides.pageInfo! : relationshipsToOmit.has('PageInfo') ? {} as PageInfo : mockPageInfo({}, relationshipsToOmit),
        totalCount: overrides && overrides.hasOwnProperty('totalCount') ? overrides.totalCount! : 8091,
    };
};

export const mockDocumentEdge = (overrides?: Partial<DocumentEdge>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'DocumentEdge' } & DocumentEdge => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('DocumentEdge');
    return {
        __typename: 'DocumentEdge',
        cursor: overrides && overrides.hasOwnProperty('cursor') ? overrides.cursor! : 'clam',
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('Document') ? {} as Document : mockDocument({}, relationshipsToOmit),
    };
};

export const mockDocumentMetadata = (overrides?: Partial<DocumentMetadata>, _relationshipsToOmit: Set<string> = new Set()): DocumentMetadata => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('DocumentMetadata');
    return {
        key: overrides && overrides.hasOwnProperty('key') ? overrides.key! : DocumentMetadataKeyCode.AdditionalProperties,
        value: overrides && overrides.hasOwnProperty('value') ? overrides.value! : 'ascit',
    };
};

export const mockEditMeUserInput = (overrides?: Partial<EditMeUserInput>, _relationshipsToOmit: Set<string> = new Set()): EditMeUserInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('EditMeUserInput');
    return {
        country: overrides && overrides.hasOwnProperty('country') ? overrides.country! : 'consequatur',
        first_name: overrides && overrides.hasOwnProperty('first_name') ? overrides.first_name! : 'cito',
        last_name: overrides && overrides.hasOwnProperty('last_name') ? overrides.last_name! : 'iste',
        selected_language: overrides && overrides.hasOwnProperty('selected_language') ? overrides.selected_language! : 'aureus',
    };
};

export const mockEditSeoServiceInstanceInput = (overrides?: Partial<EditSeoServiceInstanceInput>, _relationshipsToOmit: Set<string> = new Set()): EditSeoServiceInstanceInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('EditSeoServiceInstanceInput');
    return {
        meta_description: overrides && overrides.hasOwnProperty('meta_description') ? overrides.meta_description! : 'defero',
        meta_title: overrides && overrides.hasOwnProperty('meta_title') ? overrides.meta_title! : 'deripio',
    };
};

export const mockEditSolutionCategoryInput = (overrides?: Partial<EditSolutionCategoryInput>, _relationshipsToOmit: Set<string> = new Set()): EditSolutionCategoryInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('EditSolutionCategoryInput');
    return {
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'antepono',
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : [FiligranProduct.Openaev],
    };
};

export const mockEditUseCaseInput = (overrides?: Partial<EditUseCaseInput>, _relationshipsToOmit: Set<string> = new Set()): EditUseCaseInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('EditUseCaseInput');
    return {
        color: overrides && overrides.hasOwnProperty('color') ? overrides.color! : 'aptus',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'patrocinor',
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : [FiligranProduct.Openaev],
    };
};

export const mockEditUserCapabilitiesInput = (overrides?: Partial<EditUserCapabilitiesInput>, _relationshipsToOmit: Set<string> = new Set()): EditUserCapabilitiesInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('EditUserCapabilitiesInput');
    return {
        capabilities: overrides && overrides.hasOwnProperty('capabilities') ? overrides.capabilities! : ['quisquam'],
    };
};

export const mockEpic = (overrides?: Partial<Epic>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Epic' } & Epic => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Epic');
    return {
        __typename: 'Epic',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : true,
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-09-09T07:23:25.816Z',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'itaque',
        document: overrides && overrides.hasOwnProperty('document') ? overrides.document! : relationshipsToOmit.has('Document') ? {} as Document : mockDocument({}, relationshipsToOmit),
        document_id: overrides && overrides.hasOwnProperty('document_id') ? overrides.document_id! : 'venustas',
        edition_type: overrides && overrides.hasOwnProperty('edition_type') ? overrides.edition_type! : EditionType.CommunityEdition,
        epic_type: overrides && overrides.hasOwnProperty('epic_type') ? overrides.epic_type! : EpicType.Integration,
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '43bb0673-349a-47ed-9407-f44cc9929f36',
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : FiligranProduct.Openaev,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'tutamen',
        timeline: overrides && overrides.hasOwnProperty('timeline') ? overrides.timeline! : Timeline.Finished,
        title: overrides && overrides.hasOwnProperty('title') ? overrides.title! : 'amplitudo',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-04-10T05:21:11.658Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'aqua',
        uploader_id: overrides && overrides.hasOwnProperty('uploader_id') ? overrides.uploader_id! : 'bis',
    };
};

export const mockEpicConnection = (overrides?: Partial<EpicConnection>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'EpicConnection' } & EpicConnection => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('EpicConnection');
    return {
        __typename: 'EpicConnection',
        edges: overrides && overrides.hasOwnProperty('edges') ? overrides.edges! : [relationshipsToOmit.has('EpicEdge') ? {} as EpicEdge : mockEpicEdge({}, relationshipsToOmit)],
        pageInfo: overrides && overrides.hasOwnProperty('pageInfo') ? overrides.pageInfo! : relationshipsToOmit.has('PageInfo') ? {} as PageInfo : mockPageInfo({}, relationshipsToOmit),
        totalCount: overrides && overrides.hasOwnProperty('totalCount') ? overrides.totalCount! : 6377,
    };
};

export const mockEpicCountPerTimeline = (overrides?: Partial<EpicCountPerTimeline>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'EpicCountPerTimeline' } & EpicCountPerTimeline => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('EpicCountPerTimeline');
    return {
        __typename: 'EpicCountPerTimeline',
        count: overrides && overrides.hasOwnProperty('count') ? overrides.count! : 935,
        timeline: overrides && overrides.hasOwnProperty('timeline') ? overrides.timeline! : Timeline.Finished,
    };
};

export const mockEpicEdge = (overrides?: Partial<EpicEdge>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'EpicEdge' } & EpicEdge => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('EpicEdge');
    return {
        __typename: 'EpicEdge',
        cursor: overrides && overrides.hasOwnProperty('cursor') ? overrides.cursor! : 'peccatus',
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('Epic') ? {} as Epic : mockEpic({}, relationshipsToOmit),
    };
};

export const mockFilter = (overrides?: Partial<Filter>, _relationshipsToOmit: Set<string> = new Set()): Filter => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Filter');
    return {
        key: overrides && overrides.hasOwnProperty('key') ? overrides.key! : FilterKey.EntityType,
        value: overrides && overrides.hasOwnProperty('value') ? overrides.value! : ['alo'],
    };
};

export const mockGenericServiceCapability = (overrides?: Partial<GenericServiceCapability>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'GenericServiceCapability' } & GenericServiceCapability => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('GenericServiceCapability');
    return {
        __typename: 'GenericServiceCapability',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '22017b2a-1abe-48d2-9ad0-3bed7678e13f',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'statim',
    };
};

export const mockIntegration = (overrides?: Partial<Integration>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Integration' } & Integration => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Integration');
    return {
        __typename: 'Integration',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : false,
        blogpost_url: overrides && overrides.hasOwnProperty('blogpost_url') ? overrides.blogpost_url! : 'deleniti',
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-07-21T07:00:48.060Z',
        datasheet_url: overrides && overrides.hasOwnProperty('datasheet_url') ? overrides.datasheet_url! : 'capio',
        demo_url: overrides && overrides.hasOwnProperty('demo_url') ? overrides.demo_url! : 'inventore',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'voluptate',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 136,
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'coerceo',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '13dc993d-b0b3-4f4d-bccd-92696c8395f2',
        integration_type: overrides && overrides.hasOwnProperty('integration_type') ? overrides.integration_type! : IntegrationType.Connector,
        license_type: overrides && overrides.hasOwnProperty('license_type') ? overrides.license_type! : LicenseType.Commercial,
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'vel',
        remover_id: overrides && overrides.hasOwnProperty('remover_id') ? overrides.remover_id! : '6809ffe2-af24-4d65-945a-3bb225b21afe',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'vestrum',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 7834,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'virgo',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'cunctatio',
        solution_categories: overrides && overrides.hasOwnProperty('solution_categories') ? overrides.solution_categories! : [relationshipsToOmit.has('SolutionCategory') ? {} as SolutionCategory : mockSolutionCategory({}, relationshipsToOmit)],
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'spero',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-06-27T03:44:35.685Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'deinde',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
    };
};

export const mockIntegrationHack = (overrides?: Partial<IntegrationHack>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'IntegrationHack' } & IntegrationHack => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('IntegrationHack');
    return {
        __typename: 'IntegrationHack',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : false,
        blogpost_url: overrides && overrides.hasOwnProperty('blogpost_url') ? overrides.blogpost_url! : 'dedecor',
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-08-03T14:38:06.226Z',
        datasheet_url: overrides && overrides.hasOwnProperty('datasheet_url') ? overrides.datasheet_url! : 'pecus',
        demo_url: overrides && overrides.hasOwnProperty('demo_url') ? overrides.demo_url! : 'depulso',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'bestia',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 8052,
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'depulso',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'a157c762-cadc-415f-8901-c839e9bb92ba',
        integration_type: overrides && overrides.hasOwnProperty('integration_type') ? overrides.integration_type! : IntegrationType.Connector,
        license_type: overrides && overrides.hasOwnProperty('license_type') ? overrides.license_type! : LicenseType.Commercial,
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'animi',
        remover_id: overrides && overrides.hasOwnProperty('remover_id') ? overrides.remover_id! : '6f41ff17-09aa-48f5-aae2-29bcf53a6df2',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'adulescens',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 8662,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'aliqua',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'suppono',
        solution_categories: overrides && overrides.hasOwnProperty('solution_categories') ? overrides.solution_categories! : [relationshipsToOmit.has('SolutionCategory') ? {} as SolutionCategory : mockSolutionCategory({}, relationshipsToOmit)],
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'cogito',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-03-04T01:06:54.275Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'statim',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
    };
};

export const mockIsPlatformRegisteredInput = (overrides?: Partial<IsPlatformRegisteredInput>, _relationshipsToOmit: Set<string> = new Set()): IsPlatformRegisteredInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('IsPlatformRegisteredInput');
    return {
        platformId: overrides && overrides.hasOwnProperty('platformId') ? overrides.platformId! : 'ultio',
        tenantId: overrides && overrides.hasOwnProperty('tenantId') ? overrides.tenantId! : 'comburo',
    };
};

export const mockIsPlatformRegisteredOrganization = (overrides?: Partial<IsPlatformRegisteredOrganization>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'IsPlatformRegisteredOrganization' } & IsPlatformRegisteredOrganization => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('IsPlatformRegisteredOrganization');
    return {
        __typename: 'IsPlatformRegisteredOrganization',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '91ef029e-ada3-4db6-8a30-d71a36800f15',
    };
};

export const mockIsPlatformRegisteredResponse = (overrides?: Partial<IsPlatformRegisteredResponse>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'IsPlatformRegisteredResponse' } & IsPlatformRegisteredResponse => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('IsPlatformRegisteredResponse');
    return {
        __typename: 'IsPlatformRegisteredResponse',
        organization: overrides && overrides.hasOwnProperty('organization') ? overrides.organization! : relationshipsToOmit.has('IsPlatformRegisteredOrganization') ? {} as IsPlatformRegisteredOrganization : mockIsPlatformRegisteredOrganization({}, relationshipsToOmit),
        platformTitle: overrides && overrides.hasOwnProperty('platformTitle') ? overrides.platformTitle! : 'debilito',
        status: overrides && overrides.hasOwnProperty('status') ? overrides.status! : PlatformRegistrationStatus.NeverRegistered,
    };
};

export const mockLastDeployedOverview = (overrides?: Partial<LastDeployedOverview>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'LastDeployedOverview' } & LastDeployedOverview => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('LastDeployedOverview');
    return {
        __typename: 'LastDeployedOverview',
        resources: overrides && overrides.hasOwnProperty('resources') ? overrides.resources! : [relationshipsToOmit.has('DeployedResource') ? {} as DeployedResource : mockDeployedResource({}, relationshipsToOmit)],
    };
};

export const mockLogicalFilterInput = (overrides?: Partial<LogicalFilterInput>, _relationshipsToOmit: Set<string> = new Set()): LogicalFilterInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('LogicalFilterInput');
    return {
        children: overrides && overrides.hasOwnProperty('children') ? overrides.children! : [relationshipsToOmit.has('LogicalFilterInput') ? {} as LogicalFilterInput : mockLogicalFilterInput({}, relationshipsToOmit)],
        leaf: overrides && overrides.hasOwnProperty('leaf') ? overrides.leaf! : relationshipsToOmit.has('Filter') ? {} as Filter : mockFilter({}, relationshipsToOmit),
        operator: overrides && overrides.hasOwnProperty('operator') ? overrides.operator! : LogicalOperator.And,
    };
};

export const mockManifestFragmentInput = (overrides?: Partial<ManifestFragmentInput>, _relationshipsToOmit: Set<string> = new Set()): ManifestFragmentInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ManifestFragmentInput');
    return {
        additional_properties: overrides && overrides.hasOwnProperty('additional_properties') ? overrides.additional_properties! : 'cicuta',
        config_schema: overrides && overrides.hasOwnProperty('config_schema') ? overrides.config_schema! : 'cupressus',
        contact: overrides && overrides.hasOwnProperty('contact') ? overrides.contact! : 'arma',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'studio',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'coruscus',
        image_name: overrides && overrides.hasOwnProperty('image_name') ? overrides.image_name! : 'reiciendis',
        image_type: overrides && overrides.hasOwnProperty('image_type') ? overrides.image_type! : 'absens',
        integration_type: overrides && overrides.hasOwnProperty('integration_type') ? overrides.integration_type! : 'decretum',
        last_verified_date: overrides && overrides.hasOwnProperty('last_verified_date') ? overrides.last_verified_date! : 'subnecto',
        license_type: overrides && overrides.hasOwnProperty('license_type') ? overrides.license_type! : LicenseType.Commercial,
        logo: overrides && overrides.hasOwnProperty('logo') ? overrides.logo! : 'umerus',
        manager_supported: overrides && overrides.hasOwnProperty('manager_supported') ? overrides.manager_supported! : false,
        min_version: overrides && overrides.hasOwnProperty('min_version') ? overrides.min_version! : 'deserunt',
        platform: overrides && overrides.hasOwnProperty('platform') ? overrides.platform! : 'vilicus',
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'molestias',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'validus',
        solution_categories: overrides && overrides.hasOwnProperty('solution_categories') ? overrides.solution_categories! : ['velociter'],
        source_code: overrides && overrides.hasOwnProperty('source_code') ? overrides.source_code! : 'vereor',
        subscription_link: overrides && overrides.hasOwnProperty('subscription_link') ? overrides.subscription_link! : 'temptatio',
        title: overrides && overrides.hasOwnProperty('title') ? overrides.title! : 'accusator',
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : ['adficio'],
        verified: overrides && overrides.hasOwnProperty('verified') ? overrides.verified! : false,
        version: overrides && overrides.hasOwnProperty('version') ? overrides.version! : 'sustineo',
    };
};

export const mockMeUserSubscription = (overrides?: Partial<MeUserSubscription>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'MeUserSubscription' } & MeUserSubscription => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('MeUserSubscription');
    return {
        __typename: 'MeUserSubscription',
        delete: overrides && overrides.hasOwnProperty('delete') ? overrides.delete! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        edit: overrides && overrides.hasOwnProperty('edit') ? overrides.edit! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
    };
};

export const mockMergeEvent = (overrides?: Partial<MergeEvent>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'MergeEvent' } & MergeEvent => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('MergeEvent');
    return {
        __typename: 'MergeEvent',
        from: overrides && overrides.hasOwnProperty('from') ? overrides.from! : 'aadc4f20-941e-4d34-b3b0-f4c60a4f0108',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'e32f1661-03af-459a-8d69-c0bf57f4d9c0',
        target: overrides && overrides.hasOwnProperty('target') ? overrides.target! : '4bbdf45c-7e17-454a-a70a-4ac962fd719b',
    };
};

export const mockMutation = (overrides?: Partial<Mutation>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Mutation' } & Mutation => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Mutation');
    return {
        __typename: 'Mutation',
        acceptPendingUserInOrganization: overrides && overrides.hasOwnProperty('acceptPendingUserInOrganization') ? overrides.acceptPendingUserInOrganization! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        addCapabilitiesToUserServices: overrides && overrides.hasOwnProperty('addCapabilitiesToUserServices') ? overrides.addCapabilitiesToUserServices! : [relationshipsToOmit.has('UserService') ? {} as UserService : mockUserService({}, relationshipsToOmit)],
        addOrganization: overrides && overrides.hasOwnProperty('addOrganization') ? overrides.addOrganization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        addServicePicture: overrides && overrides.hasOwnProperty('addServicePicture') ? overrides.addServicePicture! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        addSolutionCategory: overrides && overrides.hasOwnProperty('addSolutionCategory') ? overrides.addSolutionCategory! : relationshipsToOmit.has('SolutionCategory') ? {} as SolutionCategory : mockSolutionCategory({}, relationshipsToOmit),
        addSubscription: overrides && overrides.hasOwnProperty('addSubscription') ? overrides.addSubscription! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        addSubscriptionCapability: overrides && overrides.hasOwnProperty('addSubscriptionCapability') ? overrides.addSubscriptionCapability! : [relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit)],
        addUseCase: overrides && overrides.hasOwnProperty('addUseCase') ? overrides.addUseCase! : relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit),
        addUser: overrides && overrides.hasOwnProperty('addUser') ? overrides.addUser! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        addUserService: overrides && overrides.hasOwnProperty('addUserService') ? overrides.addUserService! : [relationshipsToOmit.has('UserService') ? {} as UserService : mockUserService({}, relationshipsToOmit)],
        addUsersToBundleGroups: overrides && overrides.hasOwnProperty('addUsersToBundleGroups') ? overrides.addUsersToBundleGroups! : [relationshipsToOmit.has('BundleUserServiceGroup') ? {} as BundleUserServiceGroup : mockBundleUserServiceGroup({}, relationshipsToOmit)],
        adminAddUser: overrides && overrides.hasOwnProperty('adminAddUser') ? overrides.adminAddUser! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        adminCancelDeploymentRequest: overrides && overrides.hasOwnProperty('adminCancelDeploymentRequest') ? overrides.adminCancelDeploymentRequest! : relationshipsToOmit.has('DeploymentRequest') ? {} as DeploymentRequest : mockDeploymentRequest({}, relationshipsToOmit),
        adminEditUser: overrides && overrides.hasOwnProperty('adminEditUser') ? overrides.adminEditUser! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        autoRegisterPlatform: overrides && overrides.hasOwnProperty('autoRegisterPlatform') ? overrides.autoRegisterPlatform! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        bulkAcceptPendingUserInOrganization: overrides && overrides.hasOwnProperty('bulkAcceptPendingUserInOrganization') ? overrides.bulkAcceptPendingUserInOrganization! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        bulkRemovePendingUserFromOrganization: overrides && overrides.hasOwnProperty('bulkRemovePendingUserFromOrganization') ? overrides.bulkRemovePendingUserFromOrganization! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        cancelDeploymentRequest: overrides && overrides.hasOwnProperty('cancelDeploymentRequest') ? overrides.cancelDeploymentRequest! : relationshipsToOmit.has('DeploymentRequest') ? {} as DeploymentRequest : mockDeploymentRequest({}, relationshipsToOmit),
        changeSelectedOrganization: overrides && overrides.hasOwnProperty('changeSelectedOrganization') ? overrides.changeSelectedOrganization! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        consumeProvisionedNewsFeedItems: overrides && overrides.hasOwnProperty('consumeProvisionedNewsFeedItems') ? overrides.consumeProvisionedNewsFeedItems! : relationshipsToOmit.has('ConsumeProvisionedNewsFeedItemsResponse') ? {} as ConsumeProvisionedNewsFeedItemsResponse : mockConsumeProvisionedNewsFeedItemsResponse({}, relationshipsToOmit),
        contactUs: overrides && overrides.hasOwnProperty('contactUs') ? overrides.contactUs! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        createCompetitor: overrides && overrides.hasOwnProperty('createCompetitor') ? overrides.createCompetitor! : relationshipsToOmit.has('Competitor') ? {} as Competitor : mockCompetitor({}, relationshipsToOmit),
        createDeploymentRequest: overrides && overrides.hasOwnProperty('createDeploymentRequest') ? overrides.createDeploymentRequest! : relationshipsToOmit.has('DeploymentRequest') ? {} as DeploymentRequest : mockDeploymentRequest({}, relationshipsToOmit),
        createDocument: overrides && overrides.hasOwnProperty('createDocument') ? overrides.createDocument! : relationshipsToOmit.has('Document') ? {} as Document : mockDocument({}, relationshipsToOmit),
        createEpic: overrides && overrides.hasOwnProperty('createEpic') ? overrides.createEpic! : relationshipsToOmit.has('Epic') ? {} as Epic : mockEpic({}, relationshipsToOmit),
        createSubscriptions: overrides && overrides.hasOwnProperty('createSubscriptions') ? overrides.createSubscriptions! : [relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit)],
        createVotableFeature: overrides && overrides.hasOwnProperty('createVotableFeature') ? overrides.createVotableFeature! : relationshipsToOmit.has('VotableFeature') ? {} as VotableFeature : mockVotableFeature({}, relationshipsToOmit),
        createVotingRound: overrides && overrides.hasOwnProperty('createVotingRound') ? overrides.createVotingRound! : relationshipsToOmit.has('VotingRound') ? {} as VotingRound : mockVotingRound({}, relationshipsToOmit),
        deleteCompetitor: overrides && overrides.hasOwnProperty('deleteCompetitor') ? overrides.deleteCompetitor! : relationshipsToOmit.has('Competitor') ? {} as Competitor : mockCompetitor({}, relationshipsToOmit),
        deleteDocument: overrides && overrides.hasOwnProperty('deleteDocument') ? overrides.deleteDocument! : relationshipsToOmit.has('Document') ? {} as Document : mockDocument({}, relationshipsToOmit),
        deleteEpic: overrides && overrides.hasOwnProperty('deleteEpic') ? overrides.deleteEpic! : relationshipsToOmit.has('Epic') ? {} as Epic : mockEpic({}, relationshipsToOmit),
        deleteNewsFeedItem: overrides && overrides.hasOwnProperty('deleteNewsFeedItem') ? overrides.deleteNewsFeedItem! : false,
        deleteOrganization: overrides && overrides.hasOwnProperty('deleteOrganization') ? overrides.deleteOrganization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        deleteSolutionCategory: overrides && overrides.hasOwnProperty('deleteSolutionCategory') ? overrides.deleteSolutionCategory! : relationshipsToOmit.has('SolutionCategory') ? {} as SolutionCategory : mockSolutionCategory({}, relationshipsToOmit),
        deleteSubscriptions: overrides && overrides.hasOwnProperty('deleteSubscriptions') ? overrides.deleteSubscriptions! : [relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit)],
        deleteUseCase: overrides && overrides.hasOwnProperty('deleteUseCase') ? overrides.deleteUseCase! : relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit),
        deleteUser: overrides && overrides.hasOwnProperty('deleteUser') ? overrides.deleteUser! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        deleteUserServices: overrides && overrides.hasOwnProperty('deleteUserServices') ? overrides.deleteUserServices! : [relationshipsToOmit.has('UserService') ? {} as UserService : mockUserService({}, relationshipsToOmit)],
        deleteVotableFeature: overrides && overrides.hasOwnProperty('deleteVotableFeature') ? overrides.deleteVotableFeature! : relationshipsToOmit.has('VotableFeature') ? {} as VotableFeature : mockVotableFeature({}, relationshipsToOmit),
        deleteVotingRound: overrides && overrides.hasOwnProperty('deleteVotingRound') ? overrides.deleteVotingRound! : relationshipsToOmit.has('VotingRound') ? {} as VotingRound : mockVotingRound({}, relationshipsToOmit),
        editMeUser: overrides && overrides.hasOwnProperty('editMeUser') ? overrides.editMeUser! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        editOrganization: overrides && overrides.hasOwnProperty('editOrganization') ? overrides.editOrganization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        editSeoServiceInstance: overrides && overrides.hasOwnProperty('editSeoServiceInstance') ? overrides.editSeoServiceInstance! : relationshipsToOmit.has('SeoServiceInstanceMetadata') ? {} as SeoServiceInstanceMetadata : mockSeoServiceInstanceMetadata({}, relationshipsToOmit),
        editSolutionCategory: overrides && overrides.hasOwnProperty('editSolutionCategory') ? overrides.editSolutionCategory! : relationshipsToOmit.has('SolutionCategory') ? {} as SolutionCategory : mockSolutionCategory({}, relationshipsToOmit),
        editUseCase: overrides && overrides.hasOwnProperty('editUseCase') ? overrides.editUseCase! : relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit),
        editUserCapabilities: overrides && overrides.hasOwnProperty('editUserCapabilities') ? overrides.editUserCapabilities! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        editUserService: overrides && overrides.hasOwnProperty('editUserService') ? overrides.editUserService! : relationshipsToOmit.has('UserService') ? {} as UserService : mockUserService({}, relationshipsToOmit),
        frontendErrorLog: overrides && overrides.hasOwnProperty('frontendErrorLog') ? overrides.frontendErrorLog! : false,
        generateManifest: overrides && overrides.hasOwnProperty('generateManifest') ? overrides.generateManifest! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        incrementShareNumberDocument: overrides && overrides.hasOwnProperty('incrementShareNumberDocument') ? overrides.incrementShareNumberDocument! : relationshipsToOmit.has('Document') ? {} as Document : mockDocument({}, relationshipsToOmit),
        ingestManifestFragments: overrides && overrides.hasOwnProperty('ingestManifestFragments') ? overrides.ingestManifestFragments! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        login: overrides && overrides.hasOwnProperty('login') ? overrides.login! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        logout: overrides && overrides.hasOwnProperty('logout') ? overrides.logout! : 'c0bb04f3-5940-42c4-b3b3-6d3927041bab',
        newProductVersion: overrides && overrides.hasOwnProperty('newProductVersion') ? overrides.newProductVersion! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        refreshPlatformRegistrationConnectivityStatus: overrides && overrides.hasOwnProperty('refreshPlatformRegistrationConnectivityStatus') ? overrides.refreshPlatformRegistrationConnectivityStatus! : relationshipsToOmit.has('RefreshPlatformRegistrationConnectivityStatusResponse') ? {} as RefreshPlatformRegistrationConnectivityStatusResponse : mockRefreshPlatformRegistrationConnectivityStatusResponse({}, relationshipsToOmit),
        refreshPlatformRegistrationConnectivityStatusAllTenants: overrides && overrides.hasOwnProperty('refreshPlatformRegistrationConnectivityStatusAllTenants') ? overrides.refreshPlatformRegistrationConnectivityStatusAllTenants! : relationshipsToOmit.has('RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse') ? {} as RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse : mockRefreshPlatformRegistrationConnectivityStatusAllTenantsResponse({}, relationshipsToOmit),
        refreshPlatformRegistrationConnectivityStatusSingleTenant: overrides && overrides.hasOwnProperty('refreshPlatformRegistrationConnectivityStatusSingleTenant') ? overrides.refreshPlatformRegistrationConnectivityStatusSingleTenant! : relationshipsToOmit.has('RefreshPlatformRegistrationConnectivityStatusResponse') ? {} as RefreshPlatformRegistrationConnectivityStatusResponse : mockRefreshPlatformRegistrationConnectivityStatusResponse({}, relationshipsToOmit),
        refreshUserPlatformToken: overrides && overrides.hasOwnProperty('refreshUserPlatformToken') ? overrides.refreshUserPlatformToken! : relationshipsToOmit.has('RefreshUserPlatformTokenResponse') ? {} as RefreshUserPlatformTokenResponse : mockRefreshUserPlatformTokenResponse({}, relationshipsToOmit),
        registerPlatform: overrides && overrides.hasOwnProperty('registerPlatform') ? overrides.registerPlatform! : relationshipsToOmit.has('RegistrationResponse') ? {} as RegistrationResponse : mockRegistrationResponse({}, relationshipsToOmit),
        removePendingUserFromOrganization: overrides && overrides.hasOwnProperty('removePendingUserFromOrganization') ? overrides.removePendingUserFromOrganization! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        removeUserFromOrganization: overrides && overrides.hasOwnProperty('removeUserFromOrganization') ? overrides.removeUserFromOrganization! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        removeUsersFromBundleGroups: overrides && overrides.hasOwnProperty('removeUsersFromBundleGroups') ? overrides.removeUsersFromBundleGroups! : ['cerno'],
        reorderDeploymentRequestInQueue: overrides && overrides.hasOwnProperty('reorderDeploymentRequestInQueue') ? overrides.reorderDeploymentRequestInQueue! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        requestTransferPersonalSpace: overrides && overrides.hasOwnProperty('requestTransferPersonalSpace') ? overrides.requestTransferPersonalSpace! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        resetPassword: overrides && overrides.hasOwnProperty('resetPassword') ? overrides.resetPassword! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        sendTelemetryEvent: overrides && overrides.hasOwnProperty('sendTelemetryEvent') ? overrides.sendTelemetryEvent! : relationshipsToOmit.has('SendTelemetryMutation') ? {} as SendTelemetryMutation : mockSendTelemetryMutation({}, relationshipsToOmit),
        setVotingRoundStatus: overrides && overrides.hasOwnProperty('setVotingRoundStatus') ? overrides.setVotingRoundStatus! : [relationshipsToOmit.has('VotingRound') ? {} as VotingRound : mockVotingRound({}, relationshipsToOmit)],
        transferPersonalSpace: overrides && overrides.hasOwnProperty('transferPersonalSpace') ? overrides.transferPersonalSpace! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        unregisterPlatform: overrides && overrides.hasOwnProperty('unregisterPlatform') ? overrides.unregisterPlatform! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        updateBundleUserGroups: overrides && overrides.hasOwnProperty('updateBundleUserGroups') ? overrides.updateBundleUserGroups! : [relationshipsToOmit.has('BundleUserServiceGroup') ? {} as BundleUserServiceGroup : mockBundleUserServiceGroup({}, relationshipsToOmit)],
        updateCompetitor: overrides && overrides.hasOwnProperty('updateCompetitor') ? overrides.updateCompetitor! : relationshipsToOmit.has('Competitor') ? {} as Competitor : mockCompetitor({}, relationshipsToOmit),
        updateDeploymentQuotaCapacity: overrides && overrides.hasOwnProperty('updateDeploymentQuotaCapacity') ? overrides.updateDeploymentQuotaCapacity! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        updateDeploymentRequest: overrides && overrides.hasOwnProperty('updateDeploymentRequest') ? overrides.updateDeploymentRequest! : relationshipsToOmit.has('PlatformDeploymentRequest') ? {} as PlatformDeploymentRequest : mockPlatformDeploymentRequest({}, relationshipsToOmit),
        updateDocument: overrides && overrides.hasOwnProperty('updateDocument') ? overrides.updateDocument! : relationshipsToOmit.has('Document') ? {} as Document : mockDocument({}, relationshipsToOmit),
        updateEpic: overrides && overrides.hasOwnProperty('updateEpic') ? overrides.updateEpic! : relationshipsToOmit.has('Epic') ? {} as Epic : mockEpic({}, relationshipsToOmit),
        updatePlatformServiceMetadata: overrides && overrides.hasOwnProperty('updatePlatformServiceMetadata') ? overrides.updatePlatformServiceMetadata! : relationshipsToOmit.has('RegisteredPlatform') ? {} as RegisteredPlatform : mockRegisteredPlatform({}, relationshipsToOmit),
        updateServiceGroups: overrides && overrides.hasOwnProperty('updateServiceGroups') ? overrides.updateServiceGroups! : [relationshipsToOmit.has('ServiceGroup') ? {} as ServiceGroup : mockServiceGroup({}, relationshipsToOmit)],
        updateSubscription: overrides && overrides.hasOwnProperty('updateSubscription') ? overrides.updateSubscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        updateVotableFeature: overrides && overrides.hasOwnProperty('updateVotableFeature') ? overrides.updateVotableFeature! : relationshipsToOmit.has('VotableFeature') ? {} as VotableFeature : mockVotableFeature({}, relationshipsToOmit),
        updateVotingRound: overrides && overrides.hasOwnProperty('updateVotingRound') ? overrides.updateVotingRound! : relationshipsToOmit.has('VotingRound') ? {} as VotingRound : mockVotingRound({}, relationshipsToOmit),
        uploadUserPicture: overrides && overrides.hasOwnProperty('uploadUserPicture') ? overrides.uploadUserPicture! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        voteForFeature: overrides && overrides.hasOwnProperty('voteForFeature') ? overrides.voteForFeature! : [relationshipsToOmit.has('VotableFeature') ? {} as VotableFeature : mockVotableFeature({}, relationshipsToOmit)],
    };
};

export const mockNewsFeedItem = (overrides?: Partial<NewsFeedItem>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'NewsFeedItem' } & NewsFeedItem => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('NewsFeedItem');
    return {
        __typename: 'NewsFeedItem',
        creation_date: overrides && overrides.hasOwnProperty('creation_date') ? overrides.creation_date! : '2021-01-09T04:49:06.623Z',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '0e38ad81-8af0-47da-b557-0a9c23488b2b',
        is_deleted: overrides && overrides.hasOwnProperty('is_deleted') ? overrides.is_deleted! : true,
        metadata: overrides && overrides.hasOwnProperty('metadata') ? overrides.metadata! : [relationshipsToOmit.has('NewsFeedItemMetadata') ? {} as NewsFeedItemMetadata : mockNewsFeedItemMetadata({}, relationshipsToOmit)],
        tags: overrides && overrides.hasOwnProperty('tags') ? overrides.tags! : ['depromo'],
        title: overrides && overrides.hasOwnProperty('title') ? overrides.title! : 'ver',
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : NewsFeedItemType.ResourceCustomDashboard,
    };
};

export const mockNewsFeedItemConnection = (overrides?: Partial<NewsFeedItemConnection>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'NewsFeedItemConnection' } & NewsFeedItemConnection => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('NewsFeedItemConnection');
    return {
        __typename: 'NewsFeedItemConnection',
        edges: overrides && overrides.hasOwnProperty('edges') ? overrides.edges! : [relationshipsToOmit.has('NewsFeedItemEdge') ? {} as NewsFeedItemEdge : mockNewsFeedItemEdge({}, relationshipsToOmit)],
        pageInfo: overrides && overrides.hasOwnProperty('pageInfo') ? overrides.pageInfo! : relationshipsToOmit.has('PageInfo') ? {} as PageInfo : mockPageInfo({}, relationshipsToOmit),
        totalCount: overrides && overrides.hasOwnProperty('totalCount') ? overrides.totalCount! : 6923,
    };
};

export const mockNewsFeedItemEdge = (overrides?: Partial<NewsFeedItemEdge>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'NewsFeedItemEdge' } & NewsFeedItemEdge => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('NewsFeedItemEdge');
    return {
        __typename: 'NewsFeedItemEdge',
        cursor: overrides && overrides.hasOwnProperty('cursor') ? overrides.cursor! : 'solutio',
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('NewsFeedItem') ? {} as NewsFeedItem : mockNewsFeedItem({}, relationshipsToOmit),
    };
};

export const mockNewsFeedItemMetadata = (overrides?: Partial<NewsFeedItemMetadata>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'NewsFeedItemMetadata' } & NewsFeedItemMetadata => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('NewsFeedItemMetadata');
    return {
        __typename: 'NewsFeedItemMetadata',
        key: overrides && overrides.hasOwnProperty('key') ? overrides.key! : NewsFeedItemMetadataKey.DocumentId,
        value: overrides && overrides.hasOwnProperty('value') ? overrides.value! : 'astrum',
    };
};

export const mockNode = (overrides?: Partial<Node>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Node' } & Node => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Node');
    return {
        __typename: 'Node',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '8b23789f-fc2b-42cb-a56c-665574fdcbfe',
    };
};

export const mockOneClickDeployInput = (overrides?: Partial<OneClickDeployInput>, _relationshipsToOmit: Set<string> = new Set()): OneClickDeployInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('OneClickDeployInput');
    return {
        platform_identifier: overrides && overrides.hasOwnProperty('platform_identifier') ? overrides.platform_identifier! : PlatformIdentifier.Openaev,
        platform_service_instance_id: overrides && overrides.hasOwnProperty('platform_service_instance_id') ? overrides.platform_service_instance_id! : '5c99a93c-7343-4c56-a53a-29af5f8361cb',
        resource_id: overrides && overrides.hasOwnProperty('resource_id') ? overrides.resource_id! : 'surgo',
        resource_title: overrides && overrides.hasOwnProperty('resource_title') ? overrides.resource_title! : 'usus',
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'tempus',
    };
};

export const mockOpenAevScenario = (overrides?: Partial<OpenAevScenario>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'OpenAEVScenario' } & OpenAevScenario => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('OpenAevScenario');
    return {
        __typename: 'OpenAEVScenario',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : false,
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-05-13T16:17:56.001Z',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'colo',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 5333,
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'tenax',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'e2253f4c-6679-49d7-b161-028f32137e99',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'volva',
        product_version: overrides && overrides.hasOwnProperty('product_version') ? overrides.product_version! : 'veritas',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'vereor',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 4808,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'testimonium',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'curia',
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'cultellus',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-01-11T02:27:18.904Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'cognatus',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
    };
};

export const mockOpenCtiPlatformRegistrationStatusInput = (overrides?: Partial<OpenCtiPlatformRegistrationStatusInput>, _relationshipsToOmit: Set<string> = new Set()): OpenCtiPlatformRegistrationStatusInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('OpenCtiPlatformRegistrationStatusInput');
    return {
        platformId: overrides && overrides.hasOwnProperty('platformId') ? overrides.platformId! : 'suadeo',
        token: overrides && overrides.hasOwnProperty('token') ? overrides.token! : 'terebro',
    };
};

export const mockOpenCtiPlatformRegistrationStatusResponse = (overrides?: Partial<OpenCtiPlatformRegistrationStatusResponse>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'OpenCTIPlatformRegistrationStatusResponse' } & OpenCtiPlatformRegistrationStatusResponse => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('OpenCtiPlatformRegistrationStatusResponse');
    return {
        __typename: 'OpenCTIPlatformRegistrationStatusResponse',
        status: overrides && overrides.hasOwnProperty('status') ? overrides.status! : PlatformRegistrationConnectivityStatus.Active,
    };
};

export const mockOpenCtiPlaybook = (overrides?: Partial<OpenCtiPlaybook>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'OpenCTIPlaybook' } & OpenCtiPlaybook => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('OpenCtiPlaybook');
    return {
        __typename: 'OpenCTIPlaybook',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : true,
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-04-05T02:59:14.572Z',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'vorago',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 6307,
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'tondeo',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '67ce0150-2689-4089-bb20-8a1b43ff1fa5',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'derideo',
        product_version: overrides && overrides.hasOwnProperty('product_version') ? overrides.product_version! : 'nisi',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'explicabo',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 6384,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'cresco',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'admoveo',
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'adnuo',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-06-05T00:45:02.372Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'communis',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
    };
};

export const mockOrganization = (overrides?: Partial<Organization>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Organization' } & Organization => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Organization');
    return {
        __typename: 'Organization',
        capabilityUser: overrides && overrides.hasOwnProperty('capabilityUser') ? overrides.capabilityUser! : [relationshipsToOmit.has('Capability') ? {} as Capability : mockCapability({}, relationshipsToOmit)],
        domains: overrides && overrides.hasOwnProperty('domains') ? overrides.domains! : ['commodo'],
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '5f8a43ce-bfc3-411d-b6d9-e3b4c562c170',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'succedo',
        personal_space: overrides && overrides.hasOwnProperty('personal_space') ? overrides.personal_space! : true,
    };
};

export const mockOrganizationCapabilities = (overrides?: Partial<OrganizationCapabilities>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'OrganizationCapabilities' } & OrganizationCapabilities => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('OrganizationCapabilities');
    return {
        __typename: 'OrganizationCapabilities',
        capabilities: overrides && overrides.hasOwnProperty('capabilities') ? overrides.capabilities! : [OrganizationCapability.AdministrateOrganization],
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'ff0a5d9a-a172-482c-864f-63ffebcb0893',
        organization: overrides && overrides.hasOwnProperty('organization') ? overrides.organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
    };
};

export const mockOrganizationCapabilitiesInput = (overrides?: Partial<OrganizationCapabilitiesInput>, _relationshipsToOmit: Set<string> = new Set()): OrganizationCapabilitiesInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('OrganizationCapabilitiesInput');
    return {
        capabilities: overrides && overrides.hasOwnProperty('capabilities') ? overrides.capabilities! : ['aptus'],
        organization_id: overrides && overrides.hasOwnProperty('organization_id') ? overrides.organization_id! : 'terminatio',
    };
};

export const mockOrganizationConnection = (overrides?: Partial<OrganizationConnection>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'OrganizationConnection' } & OrganizationConnection => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('OrganizationConnection');
    return {
        __typename: 'OrganizationConnection',
        edges: overrides && overrides.hasOwnProperty('edges') ? overrides.edges! : [relationshipsToOmit.has('OrganizationEdge') ? {} as OrganizationEdge : mockOrganizationEdge({}, relationshipsToOmit)],
        pageInfo: overrides && overrides.hasOwnProperty('pageInfo') ? overrides.pageInfo! : relationshipsToOmit.has('PageInfo') ? {} as PageInfo : mockPageInfo({}, relationshipsToOmit),
        totalCount: overrides && overrides.hasOwnProperty('totalCount') ? overrides.totalCount! : 8365,
    };
};

export const mockOrganizationEdge = (overrides?: Partial<OrganizationEdge>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'OrganizationEdge' } & OrganizationEdge => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('OrganizationEdge');
    return {
        __typename: 'OrganizationEdge',
        cursor: overrides && overrides.hasOwnProperty('cursor') ? overrides.cursor! : 'commemoro',
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
    };
};

export const mockOrganizationInput = (overrides?: Partial<OrganizationInput>, _relationshipsToOmit: Set<string> = new Set()): OrganizationInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('OrganizationInput');
    return {
        domains: overrides && overrides.hasOwnProperty('domains') ? overrides.domains! : ['degenero'],
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'xiphias',
    };
};

export const mockOrganizationRef = (overrides?: Partial<OrganizationRef>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'OrganizationRef' } & OrganizationRef => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('OrganizationRef');
    return {
        __typename: 'OrganizationRef',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '452c3b64-0f49-4624-9dcb-a8b8bfe7d9c1',
    };
};

export const mockPageInfo = (overrides?: Partial<PageInfo>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'PageInfo' } & PageInfo => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('PageInfo');
    return {
        __typename: 'PageInfo',
        endCursor: overrides && overrides.hasOwnProperty('endCursor') ? overrides.endCursor! : 'tabgo',
        hasNextPage: overrides && overrides.hasOwnProperty('hasNextPage') ? overrides.hasNextPage! : true,
        hasPreviousPage: overrides && overrides.hasOwnProperty('hasPreviousPage') ? overrides.hasPreviousPage! : false,
        startCursor: overrides && overrides.hasOwnProperty('startCursor') ? overrides.startCursor! : 'tripudio',
    };
};

export const mockPlatformDeploymentRequest = (overrides?: Partial<PlatformDeploymentRequest>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'PlatformDeploymentRequest' } & PlatformDeploymentRequest => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('PlatformDeploymentRequest');
    return {
        __typename: 'PlatformDeploymentRequest',
        activity_sector: overrides && overrides.hasOwnProperty('activity_sector') ? overrides.activity_sector! : DeploymentRequestActivitySector.ComputerGames,
        actual_state: overrides && overrides.hasOwnProperty('actual_state') ? overrides.actual_state! : DeploymentRequestPlatformState.Active,
        end_date: overrides && overrides.hasOwnProperty('end_date') ? overrides.end_date! : '2021-06-03T21:40:45.600Z',
        failure_reason: overrides && overrides.hasOwnProperty('failure_reason') ? overrides.failure_reason! : 'victoria',
        hub_status: overrides && overrides.hasOwnProperty('hub_status') ? overrides.hub_status! : DeploymentRequestHubStatus.Active,
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'ee80a0f7-a979-4420-9700-418e3ec7d51d',
        job_title: overrides && overrides.hasOwnProperty('job_title') ? overrides.job_title! : DeploymentRequestJobTitle.ApplicationSecuritySpecialist,
        ordering: overrides && overrides.hasOwnProperty('ordering') ? overrides.ordering! : 4529,
        organization_domains: overrides && overrides.hasOwnProperty('organization_domains') ? overrides.organization_domains! : ['ustulo'],
        organization_name: overrides && overrides.hasOwnProperty('organization_name') ? overrides.organization_name! : 'complectus',
        parent_id: overrides && overrides.hasOwnProperty('parent_id') ? overrides.parent_id! : 'ago',
        platform_id: overrides && overrides.hasOwnProperty('platform_id') ? overrides.platform_id! : 'voluntarius',
        platform_identifier: overrides && overrides.hasOwnProperty('platform_identifier') ? overrides.platform_identifier! : PlatformIdentifier.Openaev,
        platform_token: overrides && overrides.hasOwnProperty('platform_token') ? overrides.platform_token! : 'totam',
        platform_url: overrides && overrides.hasOwnProperty('platform_url') ? overrides.platform_url! : 'aranea',
        region: overrides && overrides.hasOwnProperty('region') ? overrides.region! : DeploymentRequestPlatformRegion.ApacAu,
        requester_email: overrides && overrides.hasOwnProperty('requester_email') ? overrides.requester_email! : 'tredecim',
        requester_first_name: overrides && overrides.hasOwnProperty('requester_first_name') ? overrides.requester_first_name! : 'conor',
        requester_last_name: overrides && overrides.hasOwnProperty('requester_last_name') ? overrides.requester_last_name! : 'conspergo',
        start_date: overrides && overrides.hasOwnProperty('start_date') ? overrides.start_date! : '2021-03-19T10:43:53.476Z',
        target_state: overrides && overrides.hasOwnProperty('target_state') ? overrides.target_state! : DeploymentRequestPlatformState.Active,
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : DeploymentRequestDeploymentType.Bundle,
        url: overrides && overrides.hasOwnProperty('url') ? overrides.url! : 'amiculum',
        use_case: overrides && overrides.hasOwnProperty('use_case') ? overrides.use_case! : DeploymentRequestUseCase.AttackSimulation,
    };
};

export const mockPlatformDeploymentRequestConnection = (overrides?: Partial<PlatformDeploymentRequestConnection>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'PlatformDeploymentRequestConnection' } & PlatformDeploymentRequestConnection => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('PlatformDeploymentRequestConnection');
    return {
        __typename: 'PlatformDeploymentRequestConnection',
        edges: overrides && overrides.hasOwnProperty('edges') ? overrides.edges! : [relationshipsToOmit.has('PlatformDeploymentRequestEdge') ? {} as PlatformDeploymentRequestEdge : mockPlatformDeploymentRequestEdge({}, relationshipsToOmit)],
        pageInfo: overrides && overrides.hasOwnProperty('pageInfo') ? overrides.pageInfo! : relationshipsToOmit.has('PageInfo') ? {} as PageInfo : mockPageInfo({}, relationshipsToOmit),
        totalCount: overrides && overrides.hasOwnProperty('totalCount') ? overrides.totalCount! : 2966,
    };
};

export const mockPlatformDeploymentRequestEdge = (overrides?: Partial<PlatformDeploymentRequestEdge>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'PlatformDeploymentRequestEdge' } & PlatformDeploymentRequestEdge => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('PlatformDeploymentRequestEdge');
    return {
        __typename: 'PlatformDeploymentRequestEdge',
        cursor: overrides && overrides.hasOwnProperty('cursor') ? overrides.cursor! : 'numquam',
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('PlatformDeploymentRequest') ? {} as PlatformDeploymentRequest : mockPlatformDeploymentRequest({}, relationshipsToOmit),
    };
};

export const mockPlatformInput = (overrides?: Partial<PlatformInput>, _relationshipsToOmit: Set<string> = new Set()): PlatformInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('PlatformInput');
    return {
        contract: overrides && overrides.hasOwnProperty('contract') ? overrides.contract! : PlatformContract.Ce,
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '22650c77-d3da-4f5f-a2c2-3f932982fa68',
        tenantId: overrides && overrides.hasOwnProperty('tenantId') ? overrides.tenantId! : 'vociferor',
        tenantName: overrides && overrides.hasOwnProperty('tenantName') ? overrides.tenantName! : 'id',
        title: overrides && overrides.hasOwnProperty('title') ? overrides.title! : 'accusantium',
        url: overrides && overrides.hasOwnProperty('url') ? overrides.url! : 'abstergo',
        version: overrides && overrides.hasOwnProperty('version') ? overrides.version! : 'communis',
    };
};

export const mockPlatformProvider = (overrides?: Partial<PlatformProvider>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'PlatformProvider' } & PlatformProvider => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('PlatformProvider');
    return {
        __typename: 'PlatformProvider',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'stella',
        provider: overrides && overrides.hasOwnProperty('provider') ? overrides.provider! : 'casus',
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'deduco',
    };
};

export const mockPlatformTrialStatus = (overrides?: Partial<PlatformTrialStatus>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'PlatformTrialStatus' } & PlatformTrialStatus => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('PlatformTrialStatus');
    return {
        __typename: 'PlatformTrialStatus',
        end_date: overrides && overrides.hasOwnProperty('end_date') ? overrides.end_date! : '2021-07-26T23:22:15.977Z',
        hub_status: overrides && overrides.hasOwnProperty('hub_status') ? overrides.hub_status! : DeploymentRequestHubStatus.Active,
        isBlacklisted: overrides && overrides.hasOwnProperty('isBlacklisted') ? overrides.isBlacklisted! : true,
        ongoingStandaloneTrials: overrides && overrides.hasOwnProperty('ongoingStandaloneTrials') ? overrides.ongoingStandaloneTrials! : [PlatformIdentifier.Openaev],
    };
};

export const mockProductUseCaseInput = (overrides?: Partial<ProductUseCaseInput>, _relationshipsToOmit: Set<string> = new Set()): ProductUseCaseInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ProductUseCaseInput');
    return {
        platform_identifier: overrides && overrides.hasOwnProperty('platform_identifier') ? overrides.platform_identifier! : PlatformIdentifier.Openaev,
        use_case: overrides && overrides.hasOwnProperty('use_case') ? overrides.use_case! : DeploymentRequestUseCase.AttackSimulation,
    };
};

export const mockProvisionedNewsFeedItem = (overrides?: Partial<ProvisionedNewsFeedItem>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'ProvisionedNewsFeedItem' } & ProvisionedNewsFeedItem => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ProvisionedNewsFeedItem');
    return {
        __typename: 'ProvisionedNewsFeedItem',
        creation_date: overrides && overrides.hasOwnProperty('creation_date') ? overrides.creation_date! : '2021-05-01T21:01:57.202Z',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '3cf83307-c8b2-4e03-84db-c626c5e02761',
        is_deleted: overrides && overrides.hasOwnProperty('is_deleted') ? overrides.is_deleted! : false,
        metadata: overrides && overrides.hasOwnProperty('metadata') ? overrides.metadata! : [relationshipsToOmit.has('NewsFeedItemMetadata') ? {} as NewsFeedItemMetadata : mockNewsFeedItemMetadata({}, relationshipsToOmit)],
        tags: overrides && overrides.hasOwnProperty('tags') ? overrides.tags! : ['ustulo'],
        title: overrides && overrides.hasOwnProperty('title') ? overrides.title! : 'vox',
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : NewsFeedItemType.ResourceCustomDashboard,
    };
};

export const mockQuery = (overrides?: Partial<Query>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Query' } & Query => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Query');
    return {
        __typename: 'Query',
        bundleProducts: overrides && overrides.hasOwnProperty('bundleProducts') ? overrides.bundleProducts! : [PlatformIdentifier.Openaev],
        bundleUserServiceGroups: overrides && overrides.hasOwnProperty('bundleUserServiceGroups') ? overrides.bundleUserServiceGroups! : [relationshipsToOmit.has('BundleUserServiceGroup') ? {} as BundleUserServiceGroup : mockBundleUserServiceGroup({}, relationshipsToOmit)],
        canUnregisterPlatform: overrides && overrides.hasOwnProperty('canUnregisterPlatform') ? overrides.canUnregisterPlatform! : relationshipsToOmit.has('CanUnregisterResponse') ? {} as CanUnregisterResponse : mockCanUnregisterResponse({}, relationshipsToOmit),
        competitors: overrides && overrides.hasOwnProperty('competitors') ? overrides.competitors! : relationshipsToOmit.has('CompetitorConnection') ? {} as CompetitorConnection : mockCompetitorConnection({}, relationshipsToOmit),
        countEpicsPerTimeline: overrides && overrides.hasOwnProperty('countEpicsPerTimeline') ? overrides.countEpicsPerTimeline! : [relationshipsToOmit.has('EpicCountPerTimeline') ? {} as EpicCountPerTimeline : mockEpicCountPerTimeline({}, relationshipsToOmit)],
        currentVotingRound: overrides && overrides.hasOwnProperty('currentVotingRound') ? overrides.currentVotingRound! : relationshipsToOmit.has('VotingRound') ? {} as VotingRound : mockVotingRound({}, relationshipsToOmit),
        deploymentRequests: overrides && overrides.hasOwnProperty('deploymentRequests') ? overrides.deploymentRequests! : relationshipsToOmit.has('PlatformDeploymentRequestConnection') ? {} as PlatformDeploymentRequestConnection : mockPlatformDeploymentRequestConnection({}, relationshipsToOmit),
        deploymentRequestsAvailable: overrides && overrides.hasOwnProperty('deploymentRequestsAvailable') ? overrides.deploymentRequestsAvailable! : [relationshipsToOmit.has('DeploymentAvailability') ? {} as DeploymentAvailability : mockDeploymentAvailability({}, relationshipsToOmit)],
        deploymentRequestsList: overrides && overrides.hasOwnProperty('deploymentRequestsList') ? overrides.deploymentRequestsList! : relationshipsToOmit.has('DeploymentRequestConnection') ? {} as DeploymentRequestConnection : mockDeploymentRequestConnection({}, relationshipsToOmit),
        document: overrides && overrides.hasOwnProperty('document') ? overrides.document! : relationshipsToOmit.has('Document') ? {} as Document : mockDocument({}, relationshipsToOmit),
        documentExists: overrides && overrides.hasOwnProperty('documentExists') ? overrides.documentExists! : false,
        documents: overrides && overrides.hasOwnProperty('documents') ? overrides.documents! : relationshipsToOmit.has('DocumentConnection') ? {} as DocumentConnection : mockDocumentConnection({}, relationshipsToOmit),
        epics: overrides && overrides.hasOwnProperty('epics') ? overrides.epics! : relationshipsToOmit.has('EpicConnection') ? {} as EpicConnection : mockEpicConnection({}, relationshipsToOmit),
        isPlatformRegistered: overrides && overrides.hasOwnProperty('isPlatformRegistered') ? overrides.isPlatformRegistered! : relationshipsToOmit.has('IsPlatformRegisteredResponse') ? {} as IsPlatformRegisteredResponse : mockIsPlatformRegisteredResponse({}, relationshipsToOmit),
        lastDeployedOverview: overrides && overrides.hasOwnProperty('lastDeployedOverview') ? overrides.lastDeployedOverview! : relationshipsToOmit.has('LastDeployedOverview') ? {} as LastDeployedOverview : mockLastDeployedOverview({}, relationshipsToOmit),
        me: overrides && overrides.hasOwnProperty('me') ? overrides.me! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        mostDeployedDocuments: overrides && overrides.hasOwnProperty('mostDeployedDocuments') ? overrides.mostDeployedDocuments! : [relationshipsToOmit.has('Document') ? {} as Document : mockDocument({}, relationshipsToOmit)],
        newestDocuments: overrides && overrides.hasOwnProperty('newestDocuments') ? overrides.newestDocuments! : [relationshipsToOmit.has('Document') ? {} as Document : mockDocument({}, relationshipsToOmit)],
        newsFeedItems: overrides && overrides.hasOwnProperty('newsFeedItems') ? overrides.newsFeedItems! : relationshipsToOmit.has('NewsFeedItemConnection') ? {} as NewsFeedItemConnection : mockNewsFeedItemConnection({}, relationshipsToOmit),
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('Node') ? {} as Node : mockNode({}, relationshipsToOmit),
        openCTIPlatformRegistrationStatus: overrides && overrides.hasOwnProperty('openCTIPlatformRegistrationStatus') ? overrides.openCTIPlatformRegistrationStatus! : relationshipsToOmit.has('OpenCtiPlatformRegistrationStatusResponse') ? {} as OpenCtiPlatformRegistrationStatusResponse : mockOpenCtiPlatformRegistrationStatusResponse({}, relationshipsToOmit),
        organization: overrides && overrides.hasOwnProperty('organization') ? overrides.organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        organizations: overrides && overrides.hasOwnProperty('organizations') ? overrides.organizations! : relationshipsToOmit.has('OrganizationConnection') ? {} as OrganizationConnection : mockOrganizationConnection({}, relationshipsToOmit),
        pendingUsers: overrides && overrides.hasOwnProperty('pendingUsers') ? overrides.pendingUsers! : relationshipsToOmit.has('UserConnection') ? {} as UserConnection : mockUserConnection({}, relationshipsToOmit),
        platformAssociatedOrganization: overrides && overrides.hasOwnProperty('platformAssociatedOrganization') ? overrides.platformAssociatedOrganization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        platformTrialStatus: overrides && overrides.hasOwnProperty('platformTrialStatus') ? overrides.platformTrialStatus! : relationshipsToOmit.has('PlatformTrialStatus') ? {} as PlatformTrialStatus : mockPlatformTrialStatus({}, relationshipsToOmit),
        publicDocumentBySlug: overrides && overrides.hasOwnProperty('publicDocumentBySlug') ? overrides.publicDocumentBySlug! : relationshipsToOmit.has('Document') ? {} as Document : mockDocument({}, relationshipsToOmit),
        publicDocuments: overrides && overrides.hasOwnProperty('publicDocuments') ? overrides.publicDocuments! : relationshipsToOmit.has('DocumentConnection') ? {} as DocumentConnection : mockDocumentConnection({}, relationshipsToOmit),
        publicDocumentsByServiceSlug: overrides && overrides.hasOwnProperty('publicDocumentsByServiceSlug') ? overrides.publicDocumentsByServiceSlug! : [relationshipsToOmit.has('Document') ? {} as Document : mockDocument({}, relationshipsToOmit)],
        registeredPlatform: overrides && overrides.hasOwnProperty('registeredPlatform') ? overrides.registeredPlatform! : relationshipsToOmit.has('RegisteredPlatform') ? {} as RegisteredPlatform : mockRegisteredPlatform({}, relationshipsToOmit),
        registeredPlatforms: overrides && overrides.hasOwnProperty('registeredPlatforms') ? overrides.registeredPlatforms! : [relationshipsToOmit.has('RegisteredPlatform') ? {} as RegisteredPlatform : mockRegisteredPlatform({}, relationshipsToOmit)],
        registeredProductVersions: overrides && overrides.hasOwnProperty('registeredProductVersions') ? overrides.registeredProductVersions! : [relationshipsToOmit.has('RegisteredProductVersion') ? {} as RegisteredProductVersion : mockRegisteredProductVersion({}, relationshipsToOmit)],
        seoServiceInstance: overrides && overrides.hasOwnProperty('seoServiceInstance') ? overrides.seoServiceInstance! : relationshipsToOmit.has('SeoServiceInstance') ? {} as SeoServiceInstance : mockSeoServiceInstance({}, relationshipsToOmit),
        seoServiceInstanceMetadata: overrides && overrides.hasOwnProperty('seoServiceInstanceMetadata') ? overrides.seoServiceInstanceMetadata! : [relationshipsToOmit.has('SeoServiceInstanceMetadata') ? {} as SeoServiceInstanceMetadata : mockSeoServiceInstanceMetadata({}, relationshipsToOmit)],
        seoServiceInstances: overrides && overrides.hasOwnProperty('seoServiceInstances') ? overrides.seoServiceInstances! : [relationshipsToOmit.has('SeoServiceInstance') ? {} as SeoServiceInstance : mockSeoServiceInstance({}, relationshipsToOmit)],
        serviceGroups: overrides && overrides.hasOwnProperty('serviceGroups') ? overrides.serviceGroups! : [relationshipsToOmit.has('ServiceGroup') ? {} as ServiceGroup : mockServiceGroup({}, relationshipsToOmit)],
        serviceInstanceById: overrides && overrides.hasOwnProperty('serviceInstanceById') ? overrides.serviceInstanceById! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        serviceInstanceLinksByTags: overrides && overrides.hasOwnProperty('serviceInstanceLinksByTags') ? overrides.serviceInstanceLinksByTags! : [relationshipsToOmit.has('SeoServiceInstance') ? {} as SeoServiceInstance : mockSeoServiceInstance({}, relationshipsToOmit)],
        serviceInstances: overrides && overrides.hasOwnProperty('serviceInstances') ? overrides.serviceInstances! : relationshipsToOmit.has('ServiceConnection') ? {} as ServiceConnection : mockServiceConnection({}, relationshipsToOmit),
        settings: overrides && overrides.hasOwnProperty('settings') ? overrides.settings! : relationshipsToOmit.has('Settings') ? {} as Settings : mockSettings({}, relationshipsToOmit),
        solutionCategories: overrides && overrides.hasOwnProperty('solutionCategories') ? overrides.solutionCategories! : relationshipsToOmit.has('SolutionCategoryConnection') ? {} as SolutionCategoryConnection : mockSolutionCategoryConnection({}, relationshipsToOmit),
        subscriptionById: overrides && overrides.hasOwnProperty('subscriptionById') ? overrides.subscriptionById! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        subscriptions: overrides && overrides.hasOwnProperty('subscriptions') ? overrides.subscriptions! : relationshipsToOmit.has('SubscriptionConnection') ? {} as SubscriptionConnection : mockSubscriptionConnection({}, relationshipsToOmit),
        trialDeployments: overrides && overrides.hasOwnProperty('trialDeployments') ? overrides.trialDeployments! : relationshipsToOmit.has('TrialsDeployments') ? {} as TrialsDeployments : mockTrialsDeployments({}, relationshipsToOmit),
        updateOpenCTIManifest: overrides && overrides.hasOwnProperty('updateOpenCTIManifest') ? overrides.updateOpenCTIManifest! : relationshipsToOmit.has('Success') ? {} as Success : mockSuccess({}, relationshipsToOmit),
        useCases: overrides && overrides.hasOwnProperty('useCases') ? overrides.useCases! : relationshipsToOmit.has('UseCaseConnection') ? {} as UseCaseConnection : mockUseCaseConnection({}, relationshipsToOmit),
        userOrganizations: overrides && overrides.hasOwnProperty('userOrganizations') ? overrides.userOrganizations! : [relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit)],
        userServiceCapabilities: overrides && overrides.hasOwnProperty('userServiceCapabilities') ? overrides.userServiceCapabilities! : relationshipsToOmit.has('UserServiceCapabilitiesResponse') ? {} as UserServiceCapabilitiesResponse : mockUserServiceCapabilitiesResponse({}, relationshipsToOmit),
        userServiceFromSubscription: overrides && overrides.hasOwnProperty('userServiceFromSubscription') ? overrides.userServiceFromSubscription! : relationshipsToOmit.has('UserServiceConnection') ? {} as UserServiceConnection : mockUserServiceConnection({}, relationshipsToOmit),
        users: overrides && overrides.hasOwnProperty('users') ? overrides.users! : relationshipsToOmit.has('UserConnection') ? {} as UserConnection : mockUserConnection({}, relationshipsToOmit),
        usersWithCapabilitiesInOrganization: overrides && overrides.hasOwnProperty('usersWithCapabilitiesInOrganization') ? overrides.usersWithCapabilitiesInOrganization! : [relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit)],
        votingRound: overrides && overrides.hasOwnProperty('votingRound') ? overrides.votingRound! : relationshipsToOmit.has('VotingRound') ? {} as VotingRound : mockVotingRound({}, relationshipsToOmit),
        votingRoundResults: overrides && overrides.hasOwnProperty('votingRoundResults') ? overrides.votingRoundResults! : relationshipsToOmit.has('VotingRoundResults') ? {} as VotingRoundResults : mockVotingRoundResults({}, relationshipsToOmit),
        votingRounds: overrides && overrides.hasOwnProperty('votingRounds') ? overrides.votingRounds! : [relationshipsToOmit.has('VotingRound') ? {} as VotingRound : mockVotingRound({}, relationshipsToOmit)],
        xtmPlatformBundle: overrides && overrides.hasOwnProperty('xtmPlatformBundle') ? overrides.xtmPlatformBundle! : relationshipsToOmit.has('DeploymentRequest') ? {} as DeploymentRequest : mockDeploymentRequest({}, relationshipsToOmit),
        xtmonePlatformIntegrationStatus: overrides && overrides.hasOwnProperty('xtmonePlatformIntegrationStatus') ? overrides.xtmonePlatformIntegrationStatus! : relationshipsToOmit.has('XtmoneIntegrationStatus') ? {} as XtmoneIntegrationStatus : mockXtmoneIntegrationStatus({}, relationshipsToOmit),
    };
};

export const mockRefreshPlatformRegistrationConnectivityStatusAllTenantsInput = (overrides?: Partial<RefreshPlatformRegistrationConnectivityStatusAllTenantsInput>, _relationshipsToOmit: Set<string> = new Set()): RefreshPlatformRegistrationConnectivityStatusAllTenantsInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RefreshPlatformRegistrationConnectivityStatusAllTenantsInput');
    return {
        platformId: overrides && overrides.hasOwnProperty('platformId') ? overrides.platformId! : 'cursim',
        platformIdentifier: overrides && overrides.hasOwnProperty('platformIdentifier') ? overrides.platformIdentifier! : PlatformIdentifier.Openaev,
        platformVersion: overrides && overrides.hasOwnProperty('platformVersion') ? overrides.platformVersion! : 'quidem',
        tenants: overrides && overrides.hasOwnProperty('tenants') ? overrides.tenants! : [relationshipsToOmit.has('TenantDetails') ? {} as TenantDetails : mockTenantDetails({}, relationshipsToOmit)],
    };
};

export const mockRefreshPlatformRegistrationConnectivityStatusAllTenantsResponse = (overrides?: Partial<RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse' } & RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse');
    return {
        __typename: 'RefreshPlatformRegistrationConnectivityStatusAllTenantsResponse',
        statuses: overrides && overrides.hasOwnProperty('statuses') ? overrides.statuses! : [relationshipsToOmit.has('TenantStatus') ? {} as TenantStatus : mockTenantStatus({}, relationshipsToOmit)],
    };
};

export const mockRefreshPlatformRegistrationConnectivityStatusInput = (overrides?: Partial<RefreshPlatformRegistrationConnectivityStatusInput>, _relationshipsToOmit: Set<string> = new Set()): RefreshPlatformRegistrationConnectivityStatusInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RefreshPlatformRegistrationConnectivityStatusInput');
    return {
        platformId: overrides && overrides.hasOwnProperty('platformId') ? overrides.platformId! : 'blandior',
        platformIdentifier: overrides && overrides.hasOwnProperty('platformIdentifier') ? overrides.platformIdentifier! : PlatformIdentifier.Openaev,
        platformVersion: overrides && overrides.hasOwnProperty('platformVersion') ? overrides.platformVersion! : 'stabilis',
        token: overrides && overrides.hasOwnProperty('token') ? overrides.token! : 'aegrotatio',
    };
};

export const mockRefreshPlatformRegistrationConnectivityStatusResponse = (overrides?: Partial<RefreshPlatformRegistrationConnectivityStatusResponse>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'RefreshPlatformRegistrationConnectivityStatusResponse' } & RefreshPlatformRegistrationConnectivityStatusResponse => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RefreshPlatformRegistrationConnectivityStatusResponse');
    return {
        __typename: 'RefreshPlatformRegistrationConnectivityStatusResponse',
        status: overrides && overrides.hasOwnProperty('status') ? overrides.status! : PlatformRegistrationConnectivityStatus.Active,
    };
};

export const mockRefreshPlatformRegistrationConnectivityStatusSingleTenantInput = (overrides?: Partial<RefreshPlatformRegistrationConnectivityStatusSingleTenantInput>, _relationshipsToOmit: Set<string> = new Set()): RefreshPlatformRegistrationConnectivityStatusSingleTenantInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RefreshPlatformRegistrationConnectivityStatusSingleTenantInput');
    return {
        platformId: overrides && overrides.hasOwnProperty('platformId') ? overrides.platformId! : 'molestiae',
        platformIdentifier: overrides && overrides.hasOwnProperty('platformIdentifier') ? overrides.platformIdentifier! : PlatformIdentifier.Openaev,
        platformVersion: overrides && overrides.hasOwnProperty('platformVersion') ? overrides.platformVersion! : 'verto',
        tenantId: overrides && overrides.hasOwnProperty('tenantId') ? overrides.tenantId! : 'creo',
        tenantName: overrides && overrides.hasOwnProperty('tenantName') ? overrides.tenantName! : 'alo',
        token: overrides && overrides.hasOwnProperty('token') ? overrides.token! : 'deinde',
        url: overrides && overrides.hasOwnProperty('url') ? overrides.url! : 'dolor',
    };
};

export const mockRefreshUserPlatformTokenResponse = (overrides?: Partial<RefreshUserPlatformTokenResponse>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'RefreshUserPlatformTokenResponse' } & RefreshUserPlatformTokenResponse => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RefreshUserPlatformTokenResponse');
    return {
        __typename: 'RefreshUserPlatformTokenResponse',
        token: overrides && overrides.hasOwnProperty('token') ? overrides.token! : 'articulus',
    };
};

export const mockRegisterPlatformInput = (overrides?: Partial<RegisterPlatformInput>, _relationshipsToOmit: Set<string> = new Set()): RegisterPlatformInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RegisterPlatformInput');
    return {
        identifier: overrides && overrides.hasOwnProperty('identifier') ? overrides.identifier! : PlatformIdentifier.Openaev,
        organizationId: overrides && overrides.hasOwnProperty('organizationId') ? overrides.organizationId! : 'dbbeaee4-dfc3-4531-92ed-06f6747a3f39',
        platform: overrides && overrides.hasOwnProperty('platform') ? overrides.platform! : relationshipsToOmit.has('PlatformInput') ? {} as PlatformInput : mockPlatformInput({}, relationshipsToOmit),
    };
};

export const mockRegisteredPlatform = (overrides?: Partial<RegisteredPlatform>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'RegisteredPlatform' } & RegisteredPlatform => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RegisteredPlatform');
    return {
        __typename: 'RegisteredPlatform',
        contract: overrides && overrides.hasOwnProperty('contract') ? overrides.contract! : PlatformContract.Ce,
        deployment_request: overrides && overrides.hasOwnProperty('deployment_request') ? overrides.deployment_request! : relationshipsToOmit.has('DeploymentRequest') ? {} as DeploymentRequest : mockDeploymentRequest({}, relationshipsToOmit),
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '9944b8a0-4c4a-4f05-bf08-5a17aa0b0833',
        identifier: overrides && overrides.hasOwnProperty('identifier') ? overrides.identifier! : ServiceDefinitionIdentifier.Link,
        illustration_document_id: overrides && overrides.hasOwnProperty('illustration_document_id') ? overrides.illustration_document_id! : 'pecco',
        last_connectivity_check: overrides && overrides.hasOwnProperty('last_connectivity_check') ? overrides.last_connectivity_check! : '2021-04-29T07:16:30.680Z',
        myGroups: overrides && overrides.hasOwnProperty('myGroups') ? overrides.myGroups! : [relationshipsToOmit.has('ServiceGroup') ? {} as ServiceGroup : mockServiceGroup({}, relationshipsToOmit)],
        platform_id: overrides && overrides.hasOwnProperty('platform_id') ? overrides.platform_id! : 'cogito',
        status: overrides && overrides.hasOwnProperty('status') ? overrides.status! : PlatformConfigurationStatus.Active,
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        tenant_id: overrides && overrides.hasOwnProperty('tenant_id') ? overrides.tenant_id! : 'acsi',
        tenant_name: overrides && overrides.hasOwnProperty('tenant_name') ? overrides.tenant_name! : 'cubo',
        title: overrides && overrides.hasOwnProperty('title') ? overrides.title! : 'attollo',
        url: overrides && overrides.hasOwnProperty('url') ? overrides.url! : 'asporto',
        version: overrides && overrides.hasOwnProperty('version') ? overrides.version! : 'denuncio',
    };
};

export const mockRegisteredPlatformInput = (overrides?: Partial<RegisteredPlatformInput>, _relationshipsToOmit: Set<string> = new Set()): RegisteredPlatformInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RegisteredPlatformInput');
    return {
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'vicinus',
    };
};

export const mockRegisteredPlatformsInput = (overrides?: Partial<RegisteredPlatformsInput>, _relationshipsToOmit: Set<string> = new Set()): RegisteredPlatformsInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RegisteredPlatformsInput');
    return {
        hasDeployedResources: overrides && overrides.hasOwnProperty('hasDeployedResources') ? overrides.hasDeployedResources! : true,
        identifier: overrides && overrides.hasOwnProperty('identifier') ? overrides.identifier! : PlatformIdentifier.Openaev,
        onlyActive: overrides && overrides.hasOwnProperty('onlyActive') ? overrides.onlyActive! : false,
        onlyTrial: overrides && overrides.hasOwnProperty('onlyTrial') ? overrides.onlyTrial! : false,
    };
};

export const mockRegisteredProductVersion = (overrides?: Partial<RegisteredProductVersion>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'RegisteredProductVersion' } & RegisteredProductVersion => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RegisteredProductVersion');
    return {
        __typename: 'RegisteredProductVersion',
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-01-15T03:18:26.145Z',
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : PlatformIdentifier.Openaev,
        version: overrides && overrides.hasOwnProperty('version') ? overrides.version! : 'agnitio',
    };
};

export const mockRegistrationResponse = (overrides?: Partial<RegistrationResponse>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'RegistrationResponse' } & RegistrationResponse => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RegistrationResponse');
    return {
        __typename: 'RegistrationResponse',
        token: overrides && overrides.hasOwnProperty('token') ? overrides.token! : 'cedo',
    };
};

export const mockReorderDeploymentRequestInQueueInput = (overrides?: Partial<ReorderDeploymentRequestInQueueInput>, _relationshipsToOmit: Set<string> = new Set()): ReorderDeploymentRequestInQueueInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ReorderDeploymentRequestInQueueInput');
    return {
        direction: overrides && overrides.hasOwnProperty('direction') ? overrides.direction! : ReorderDeploymentRequestInQueueDirection.Top,
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'via',
    };
};

export const mockRolePortal = (overrides?: Partial<RolePortal>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'RolePortal' } & RolePortal => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RolePortal');
    return {
        __typename: 'RolePortal',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '5d18ad0e-e617-4770-923b-8c5f9553c42a',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'culpo',
    };
};

export const mockRssFeed = (overrides?: Partial<RssFeed>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'RssFeed' } & RssFeed => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('RssFeed');
    return {
        __typename: 'RssFeed',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : false,
        blogpost_url: overrides && overrides.hasOwnProperty('blogpost_url') ? overrides.blogpost_url! : 'atavus',
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-08-14T14:48:23.932Z',
        datasheet_url: overrides && overrides.hasOwnProperty('datasheet_url') ? overrides.datasheet_url! : 'pectus',
        demo_url: overrides && overrides.hasOwnProperty('demo_url') ? overrides.demo_url! : 'solvo',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'admiratio',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 4723,
        feed_url: overrides && overrides.hasOwnProperty('feed_url') ? overrides.feed_url! : 'bellicus',
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'clibanus',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'c4bd9278-8c64-441a-828e-7d9151c951fe',
        integration_type: overrides && overrides.hasOwnProperty('integration_type') ? overrides.integration_type! : IntegrationType.Connector,
        license_type: overrides && overrides.hasOwnProperty('license_type') ? overrides.license_type! : LicenseType.Commercial,
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'cubicularis',
        remover_id: overrides && overrides.hasOwnProperty('remover_id') ? overrides.remover_id! : '89150907-57c5-4b6e-a6ae-43b9078e8af2',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'aspernatur',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 9837,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'nisi',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'sulum',
        solution_categories: overrides && overrides.hasOwnProperty('solution_categories') ? overrides.solution_categories! : [relationshipsToOmit.has('SolutionCategory') ? {} as SolutionCategory : mockSolutionCategory({}, relationshipsToOmit)],
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'bis',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-08-19T10:57:26.490Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'delectatio',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
    };
};

export const mockSendTelemetryMutation = (overrides?: Partial<SendTelemetryMutation>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'SendTelemetryMutation' } & SendTelemetryMutation => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('SendTelemetryMutation');
    return {
        __typename: 'SendTelemetryMutation',
        oneClickDeploy: overrides && overrides.hasOwnProperty('oneClickDeploy') ? overrides.oneClickDeploy! : relationshipsToOmit.has('TelemetryResponse') ? {} as TelemetryResponse : mockTelemetryResponse({}, relationshipsToOmit),
    };
};

export const mockSeoServiceInstance = (overrides?: Partial<SeoServiceInstance>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'SeoServiceInstance' } & SeoServiceInstance => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('SeoServiceInstance');
    return {
        __typename: 'SeoServiceInstance',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'caries',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '81dff399-85da-4a81-8c6c-dc9fdc4b825f',
        illustration_document_id: overrides && overrides.hasOwnProperty('illustration_document_id') ? overrides.illustration_document_id! : 'vir',
        links: overrides && overrides.hasOwnProperty('links') ? overrides.links! : [relationshipsToOmit.has('ServiceLink') ? {} as ServiceLink : mockServiceLink({}, relationshipsToOmit)],
        logo_document_id: overrides && overrides.hasOwnProperty('logo_document_id') ? overrides.logo_document_id! : 'quasi',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'vulariter',
        service_definition: overrides && overrides.hasOwnProperty('service_definition') ? overrides.service_definition! : relationshipsToOmit.has('ServiceDefinition') ? {} as ServiceDefinition : mockServiceDefinition({}, relationshipsToOmit),
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'bene',
        tags: overrides && overrides.hasOwnProperty('tags') ? overrides.tags! : [ServiceInstanceTag.OpenAev],
    };
};

export const mockSeoServiceInstanceMetadata = (overrides?: Partial<SeoServiceInstanceMetadata>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'SeoServiceInstanceMetadata' } & SeoServiceInstanceMetadata => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('SeoServiceInstanceMetadata');
    return {
        __typename: 'SeoServiceInstanceMetadata',
        language: overrides && overrides.hasOwnProperty('language') ? overrides.language! : SeoServiceInstanceLanguage.En,
        meta_description: overrides && overrides.hasOwnProperty('meta_description') ? overrides.meta_description! : 'valetudo',
        meta_title: overrides && overrides.hasOwnProperty('meta_title') ? overrides.meta_title! : 'convoco',
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'cubicularis',
    };
};

export const mockServiceCapability = (overrides?: Partial<ServiceCapability>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'ServiceCapability' } & ServiceCapability => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ServiceCapability');
    return {
        __typename: 'ServiceCapability',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'ventosus',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '57db8e51-cf02-453c-abf0-5d8880028bdc',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'calamitas',
        service_definition_id: overrides && overrides.hasOwnProperty('service_definition_id') ? overrides.service_definition_id! : '2938e3df-9bc3-4126-9a59-deb9f489abe2',
    };
};

export const mockServiceConnection = (overrides?: Partial<ServiceConnection>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'ServiceConnection' } & ServiceConnection => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ServiceConnection');
    return {
        __typename: 'ServiceConnection',
        edges: overrides && overrides.hasOwnProperty('edges') ? overrides.edges! : [relationshipsToOmit.has('ServiceInstanceEdge') ? {} as ServiceInstanceEdge : mockServiceInstanceEdge({}, relationshipsToOmit)],
        pageInfo: overrides && overrides.hasOwnProperty('pageInfo') ? overrides.pageInfo! : relationshipsToOmit.has('PageInfo') ? {} as PageInfo : mockPageInfo({}, relationshipsToOmit),
        totalCount: overrides && overrides.hasOwnProperty('totalCount') ? overrides.totalCount! : 5737,
    };
};

export const mockServiceDefinition = (overrides?: Partial<ServiceDefinition>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'ServiceDefinition' } & ServiceDefinition => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ServiceDefinition');
    return {
        __typename: 'ServiceDefinition',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'adaugeo',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '0746e085-798d-493c-b4ea-7d28e8f1bc78',
        identifier: overrides && overrides.hasOwnProperty('identifier') ? overrides.identifier! : ServiceDefinitionIdentifier.Link,
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'valens',
        public: overrides && overrides.hasOwnProperty('public') ? overrides.public! : true,
        service_capability: overrides && overrides.hasOwnProperty('service_capability') ? overrides.service_capability! : [relationshipsToOmit.has('ServiceCapability') ? {} as ServiceCapability : mockServiceCapability({}, relationshipsToOmit)],
    };
};

export const mockServiceGroup = (overrides?: Partial<ServiceGroup>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'ServiceGroup' } & ServiceGroup => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ServiceGroup');
    return {
        __typename: 'ServiceGroup',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'a2fdf645-ec92-4d15-844d-40aaf5ff5de0',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : ServiceGroupName.Admin,
        users: overrides && overrides.hasOwnProperty('users') ? overrides.users! : [relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit)],
    };
};

export const mockServiceInstance = (overrides?: Partial<ServiceInstance>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'ServiceInstance' } & ServiceInstance => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ServiceInstance');
    return {
        __typename: 'ServiceInstance',
        capabilities: overrides && overrides.hasOwnProperty('capabilities') ? overrides.capabilities! : ['supra'],
        creation_status: overrides && overrides.hasOwnProperty('creation_status') ? overrides.creation_status! : ServiceInstanceCreationStatus.Created,
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'sunt',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'a5526fb2-d70b-4de8-b75e-e1fca8a27604',
        illustration_document_id: overrides && overrides.hasOwnProperty('illustration_document_id') ? overrides.illustration_document_id! : 'tamquam',
        links: overrides && overrides.hasOwnProperty('links') ? overrides.links! : [relationshipsToOmit.has('ServiceLink') ? {} as ServiceLink : mockServiceLink({}, relationshipsToOmit)],
        logo_document_id: overrides && overrides.hasOwnProperty('logo_document_id') ? overrides.logo_document_id! : 'tenuis',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'autus',
        ordering: overrides && overrides.hasOwnProperty('ordering') ? overrides.ordering! : 7841,
        organization: overrides && overrides.hasOwnProperty('organization') ? overrides.organization! : [relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit)],
        organization_subscribed: overrides && overrides.hasOwnProperty('organization_subscribed') ? overrides.organization_subscribed! : true,
        public: overrides && overrides.hasOwnProperty('public') ? overrides.public! : true,
        service_definition: overrides && overrides.hasOwnProperty('service_definition') ? overrides.service_definition! : relationshipsToOmit.has('ServiceDefinition') ? {} as ServiceDefinition : mockServiceDefinition({}, relationshipsToOmit),
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'demergo',
        subscriptions: overrides && overrides.hasOwnProperty('subscriptions') ? overrides.subscriptions! : [relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit)],
        tags: overrides && overrides.hasOwnProperty('tags') ? overrides.tags! : [ServiceInstanceTag.OpenAev],
        user_joined: overrides && overrides.hasOwnProperty('user_joined') ? overrides.user_joined! : true,
    };
};

export const mockServiceInstanceEdge = (overrides?: Partial<ServiceInstanceEdge>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'ServiceInstanceEdge' } & ServiceInstanceEdge => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ServiceInstanceEdge');
    return {
        __typename: 'ServiceInstanceEdge',
        cursor: overrides && overrides.hasOwnProperty('cursor') ? overrides.cursor! : 'vinco',
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
    };
};

export const mockServiceInstanceFilter = (overrides?: Partial<ServiceInstanceFilter>, _relationshipsToOmit: Set<string> = new Set()): ServiceInstanceFilter => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ServiceInstanceFilter');
    return {
        key: overrides && overrides.hasOwnProperty('key') ? overrides.key! : ServiceInstanceFilterKey.Id,
        value: overrides && overrides.hasOwnProperty('value') ? overrides.value! : ['aeternus'],
    };
};

export const mockServiceInstanceSubscription = (overrides?: Partial<ServiceInstanceSubscription>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'ServiceInstanceSubscription' } & ServiceInstanceSubscription => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ServiceInstanceSubscription');
    return {
        __typename: 'ServiceInstanceSubscription',
        add: overrides && overrides.hasOwnProperty('add') ? overrides.add! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        delete: overrides && overrides.hasOwnProperty('delete') ? overrides.delete! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        edit: overrides && overrides.hasOwnProperty('edit') ? overrides.edit! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
    };
};

export const mockServiceLink = (overrides?: Partial<ServiceLink>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'ServiceLink' } & ServiceLink => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ServiceLink');
    return {
        __typename: 'ServiceLink',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '0734368f-853d-4805-ac53-3ffca386ac51',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'triduana',
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : '13984980-0b9b-4a51-9715-d56f1d527518',
        url: overrides && overrides.hasOwnProperty('url') ? overrides.url! : 'deludo',
    };
};

export const mockSettings = (overrides?: Partial<Settings>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Settings' } & Settings => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Settings');
    return {
        __typename: 'Settings',
        base_url_front: overrides && overrides.hasOwnProperty('base_url_front') ? overrides.base_url_front! : 'sumo',
        environment: overrides && overrides.hasOwnProperty('environment') ? overrides.environment! : 'vicinus',
        platform_feature_flags: overrides && overrides.hasOwnProperty('platform_feature_flags') ? overrides.platform_feature_flags! : [FeatureFlag.DecouplingConnectors],
        platform_providers: overrides && overrides.hasOwnProperty('platform_providers') ? overrides.platform_providers! : [relationshipsToOmit.has('PlatformProvider') ? {} as PlatformProvider : mockPlatformProvider({}, relationshipsToOmit)],
    };
};

export const mockShareableResource = (overrides?: Partial<ShareableResource>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'ShareableResource' } & ShareableResource => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ShareableResource');
    return {
        __typename: 'ShareableResource',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : false,
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-07-22T04:58:28.807Z',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'barba',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 4426,
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'depulso',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '827cd7e4-7580-4597-8709-caa65b9657a3',
        image_type: overrides && overrides.hasOwnProperty('image_type') ? overrides.image_type! : DocumentImageType.Image,
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'caelum',
        source_type: overrides && overrides.hasOwnProperty('source_type') ? overrides.source_type! : DocumentSourceType.External,
    };
};

export const mockSolutionCategory = (overrides?: Partial<SolutionCategory>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'SolutionCategory' } & SolutionCategory => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('SolutionCategory');
    return {
        __typename: 'SolutionCategory',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'aa9c4cd1-f0fd-4c7a-b3be-e7c972fdb801',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'nihil',
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : [FiligranProduct.Openaev],
    };
};

export const mockSolutionCategoryConnection = (overrides?: Partial<SolutionCategoryConnection>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'SolutionCategoryConnection' } & SolutionCategoryConnection => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('SolutionCategoryConnection');
    return {
        __typename: 'SolutionCategoryConnection',
        edges: overrides && overrides.hasOwnProperty('edges') ? overrides.edges! : [relationshipsToOmit.has('SolutionCategoryEdge') ? {} as SolutionCategoryEdge : mockSolutionCategoryEdge({}, relationshipsToOmit)],
        pageInfo: overrides && overrides.hasOwnProperty('pageInfo') ? overrides.pageInfo! : relationshipsToOmit.has('PageInfo') ? {} as PageInfo : mockPageInfo({}, relationshipsToOmit),
        totalCount: overrides && overrides.hasOwnProperty('totalCount') ? overrides.totalCount! : 5161,
    };
};

export const mockSolutionCategoryEdge = (overrides?: Partial<SolutionCategoryEdge>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'SolutionCategoryEdge' } & SolutionCategoryEdge => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('SolutionCategoryEdge');
    return {
        __typename: 'SolutionCategoryEdge',
        cursor: overrides && overrides.hasOwnProperty('cursor') ? overrides.cursor! : 'tero',
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('SolutionCategory') ? {} as SolutionCategory : mockSolutionCategory({}, relationshipsToOmit),
    };
};

export const mockStream = (overrides?: Partial<Stream>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Stream' } & Stream => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Stream');
    return {
        __typename: 'Stream',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : false,
        blogpost_url: overrides && overrides.hasOwnProperty('blogpost_url') ? overrides.blogpost_url! : 'ocer',
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-06-20T00:56:06.636Z',
        datasheet_url: overrides && overrides.hasOwnProperty('datasheet_url') ? overrides.datasheet_url! : 'demum',
        demo_url: overrides && overrides.hasOwnProperty('demo_url') ? overrides.demo_url! : 'sol',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'dolore',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 2309,
        feed_url: overrides && overrides.hasOwnProperty('feed_url') ? overrides.feed_url! : 'desino',
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'charisma',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '03d37e79-4d02-465a-b00e-ee374ba0da82',
        integration_type: overrides && overrides.hasOwnProperty('integration_type') ? overrides.integration_type! : IntegrationType.Connector,
        license_type: overrides && overrides.hasOwnProperty('license_type') ? overrides.license_type! : LicenseType.Commercial,
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'exercitationem',
        remover_id: overrides && overrides.hasOwnProperty('remover_id') ? overrides.remover_id! : '09b846f8-59aa-4ec0-9e60-023c58270448',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'absens',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 2935,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'argentum',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'cotidie',
        solution_categories: overrides && overrides.hasOwnProperty('solution_categories') ? overrides.solution_categories! : [relationshipsToOmit.has('SolutionCategory') ? {} as SolutionCategory : mockSolutionCategory({}, relationshipsToOmit)],
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'curia',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-04-28T20:02:03.270Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'comedo',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
    };
};

export const mockSubscribedServiceInstanceConfiguration = (overrides?: Partial<SubscribedServiceInstanceConfiguration>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'SubscribedServiceInstanceConfiguration' } & SubscribedServiceInstanceConfiguration => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('SubscribedServiceInstanceConfiguration');
    return {
        __typename: 'SubscribedServiceInstanceConfiguration',
        platform_contract: overrides && overrides.hasOwnProperty('platform_contract') ? overrides.platform_contract! : PlatformContract.Ce,
        platform_id: overrides && overrides.hasOwnProperty('platform_id') ? overrides.platform_id! : 'versus',
        platform_title: overrides && overrides.hasOwnProperty('platform_title') ? overrides.platform_title! : 'suscipio',
        platform_url: overrides && overrides.hasOwnProperty('platform_url') ? overrides.platform_url! : 'animi',
        registerer_id: overrides && overrides.hasOwnProperty('registerer_id') ? overrides.registerer_id! : 'verus',
        token: overrides && overrides.hasOwnProperty('token') ? overrides.token! : 'adopto',
    };
};

export const mockSubscription = (overrides?: Partial<Subscription>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Subscription' } & Subscription => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Subscription');
    return {
        __typename: 'Subscription',
        MeUser: overrides && overrides.hasOwnProperty('MeUser') ? overrides.MeUser! : relationshipsToOmit.has('MeUserSubscription') ? {} as MeUserSubscription : mockMeUserSubscription({}, relationshipsToOmit),
        ServiceInstance: overrides && overrides.hasOwnProperty('ServiceInstance') ? overrides.ServiceInstance! : relationshipsToOmit.has('ServiceInstanceSubscription') ? {} as ServiceInstanceSubscription : mockServiceInstanceSubscription({}, relationshipsToOmit),
        User: overrides && overrides.hasOwnProperty('User') ? overrides.User! : relationshipsToOmit.has('UserSubscription') ? {} as UserSubscription : mockUserSubscription({}, relationshipsToOmit),
        UserPending: overrides && overrides.hasOwnProperty('UserPending') ? overrides.UserPending! : relationshipsToOmit.has('UserPendingSubscription') ? {} as UserPendingSubscription : mockUserPendingSubscription({}, relationshipsToOmit),
    };
};

export const mockSubscriptionCapability = (overrides?: Partial<SubscriptionCapability>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'SubscriptionCapability' } & SubscriptionCapability => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('SubscriptionCapability');
    return {
        __typename: 'SubscriptionCapability',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '906c377e-32ab-4e91-93ec-69d203e622f0',
        service_capability: overrides && overrides.hasOwnProperty('service_capability') ? overrides.service_capability! : relationshipsToOmit.has('ServiceCapability') ? {} as ServiceCapability : mockServiceCapability({}, relationshipsToOmit),
    };
};

export const mockSubscriptionConnection = (overrides?: Partial<SubscriptionConnection>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'SubscriptionConnection' } & SubscriptionConnection => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('SubscriptionConnection');
    return {
        __typename: 'SubscriptionConnection',
        edges: overrides && overrides.hasOwnProperty('edges') ? overrides.edges! : [relationshipsToOmit.has('SubscriptionEdge') ? {} as SubscriptionEdge : mockSubscriptionEdge({}, relationshipsToOmit)],
        pageInfo: overrides && overrides.hasOwnProperty('pageInfo') ? overrides.pageInfo! : relationshipsToOmit.has('PageInfo') ? {} as PageInfo : mockPageInfo({}, relationshipsToOmit),
        totalCount: overrides && overrides.hasOwnProperty('totalCount') ? overrides.totalCount! : 8065,
    };
};

export const mockSubscriptionEdge = (overrides?: Partial<SubscriptionEdge>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'SubscriptionEdge' } & SubscriptionEdge => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('SubscriptionEdge');
    return {
        __typename: 'SubscriptionEdge',
        cursor: overrides && overrides.hasOwnProperty('cursor') ? overrides.cursor! : 'exercitationem',
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
    };
};

export const mockSubscriptionFilter = (overrides?: Partial<SubscriptionFilter>, _relationshipsToOmit: Set<string> = new Set()): SubscriptionFilter => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('SubscriptionFilter');
    return {
        key: overrides && overrides.hasOwnProperty('key') ? overrides.key! : SubscriptionFilterKey.OrganizationId,
        value: overrides && overrides.hasOwnProperty('value') ? overrides.value! : ['admiratio'],
    };
};

export const mockSubscriptionModel = (overrides?: Partial<SubscriptionModel>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'SubscriptionModel' } & SubscriptionModel => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('SubscriptionModel');
    return {
        __typename: 'SubscriptionModel',
        end_date: overrides && overrides.hasOwnProperty('end_date') ? overrides.end_date! : '2021-04-04T16:14:49.523Z',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'dc995801-8e13-4345-9f89-7520f716ba66',
        organization: overrides && overrides.hasOwnProperty('organization') ? overrides.organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        organization_id: overrides && overrides.hasOwnProperty('organization_id') ? overrides.organization_id! : 'deleniti',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'suasoria',
        service_url: overrides && overrides.hasOwnProperty('service_url') ? overrides.service_url! : 'circumvenio',
        start_date: overrides && overrides.hasOwnProperty('start_date') ? overrides.start_date! : '2021-06-19T18:40:30.137Z',
        subscription_capability: overrides && overrides.hasOwnProperty('subscription_capability') ? overrides.subscription_capability! : [relationshipsToOmit.has('SubscriptionCapability') ? {} as SubscriptionCapability : mockSubscriptionCapability({}, relationshipsToOmit)],
        user_service: overrides && overrides.hasOwnProperty('user_service') ? overrides.user_service! : [relationshipsToOmit.has('UserService') ? {} as UserService : mockUserService({}, relationshipsToOmit)],
    };
};

export const mockSuccess = (overrides?: Partial<Success>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'Success' } & Success => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('Success');
    return {
        __typename: 'Success',
        success: overrides && overrides.hasOwnProperty('success') ? overrides.success! : false,
    };
};

export const mockTaxiiFeed = (overrides?: Partial<TaxiiFeed>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'TaxiiFeed' } & TaxiiFeed => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('TaxiiFeed');
    return {
        __typename: 'TaxiiFeed',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : true,
        blogpost_url: overrides && overrides.hasOwnProperty('blogpost_url') ? overrides.blogpost_url! : 'advoco',
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-11-08T19:45:38.037Z',
        datasheet_url: overrides && overrides.hasOwnProperty('datasheet_url') ? overrides.datasheet_url! : 'ustilo',
        demo_url: overrides && overrides.hasOwnProperty('demo_url') ? overrides.demo_url! : 'nostrum',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'verus',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 7919,
        feed_url: overrides && overrides.hasOwnProperty('feed_url') ? overrides.feed_url! : 'verto',
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'abstergo',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '8e14ddb2-6450-4a95-9c0d-e1550ed99847',
        integration_type: overrides && overrides.hasOwnProperty('integration_type') ? overrides.integration_type! : IntegrationType.Connector,
        license_type: overrides && overrides.hasOwnProperty('license_type') ? overrides.license_type! : LicenseType.Commercial,
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'amoveo',
        remover_id: overrides && overrides.hasOwnProperty('remover_id') ? overrides.remover_id! : '5ec89279-382b-41f6-bdae-13da4e1fd36f',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'conculco',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 3290,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'crebro',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'cariosus',
        solution_categories: overrides && overrides.hasOwnProperty('solution_categories') ? overrides.solution_categories! : [relationshipsToOmit.has('SolutionCategory') ? {} as SolutionCategory : mockSolutionCategory({}, relationshipsToOmit)],
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'aurum',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-12-09T06:29:05.997Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'vergo',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
    };
};

export const mockTelemetryResponse = (overrides?: Partial<TelemetryResponse>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'TelemetryResponse' } & TelemetryResponse => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('TelemetryResponse');
    return {
        __typename: 'TelemetryResponse',
        message: overrides && overrides.hasOwnProperty('message') ? overrides.message! : 'congregatio',
        result: overrides && overrides.hasOwnProperty('result') ? overrides.result! : true,
    };
};

export const mockTenantDetails = (overrides?: Partial<TenantDetails>, _relationshipsToOmit: Set<string> = new Set()): TenantDetails => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('TenantDetails');
    return {
        tenantId: overrides && overrides.hasOwnProperty('tenantId') ? overrides.tenantId! : 'cruciamentum',
        tenantName: overrides && overrides.hasOwnProperty('tenantName') ? overrides.tenantName! : 'eos',
        token: overrides && overrides.hasOwnProperty('token') ? overrides.token! : 'tantillus',
        url: overrides && overrides.hasOwnProperty('url') ? overrides.url! : 'venio',
    };
};

export const mockTenantStatus = (overrides?: Partial<TenantStatus>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'TenantStatus' } & TenantStatus => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('TenantStatus');
    return {
        __typename: 'TenantStatus',
        status: overrides && overrides.hasOwnProperty('status') ? overrides.status! : PlatformRegistrationConnectivityStatus.Active,
        tenantId: overrides && overrides.hasOwnProperty('tenantId') ? overrides.tenantId! : 'volubilis',
    };
};

export const mockThirdPartyIntegration = (overrides?: Partial<ThirdPartyIntegration>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'ThirdPartyIntegration' } & ThirdPartyIntegration => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('ThirdPartyIntegration');
    return {
        __typename: 'ThirdPartyIntegration',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : false,
        blogpost_url: overrides && overrides.hasOwnProperty('blogpost_url') ? overrides.blogpost_url! : 'damnatio',
        children_documents: overrides && overrides.hasOwnProperty('children_documents') ? overrides.children_documents! : [relationshipsToOmit.has('ShareableResource') ? {} as ShareableResource : mockShareableResource({}, relationshipsToOmit)],
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-02-21T08:27:31.113Z',
        datasheet_url: overrides && overrides.hasOwnProperty('datasheet_url') ? overrides.datasheet_url! : 'qui',
        demo_url: overrides && overrides.hasOwnProperty('demo_url') ? overrides.demo_url! : 'sono',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'sulum',
        download_number: overrides && overrides.hasOwnProperty('download_number') ? overrides.download_number! : 913,
        file_name: overrides && overrides.hasOwnProperty('file_name') ? overrides.file_name! : 'delectatio',
        github_url: overrides && overrides.hasOwnProperty('github_url') ? overrides.github_url! : 'calamitas',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '046b24da-f077-4b15-a666-1ebafe26e331',
        integration_type: overrides && overrides.hasOwnProperty('integration_type') ? overrides.integration_type! : IntegrationType.Connector,
        license_type: overrides && overrides.hasOwnProperty('license_type') ? overrides.license_type! : LicenseType.Commercial,
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'cedo',
        product_version: overrides && overrides.hasOwnProperty('product_version') ? overrides.product_version! : 'tergeo',
        remover_id: overrides && overrides.hasOwnProperty('remover_id') ? overrides.remover_id! : '2ba58a8e-ed99-41f7-bd16-753cc73ae89d',
        service_instance: overrides && overrides.hasOwnProperty('service_instance') ? overrides.service_instance! : relationshipsToOmit.has('ServiceInstance') ? {} as ServiceInstance : mockServiceInstance({}, relationshipsToOmit),
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'ciminatio',
        share_number: overrides && overrides.hasOwnProperty('share_number') ? overrides.share_number! : 5630,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'undique',
        slug: overrides && overrides.hasOwnProperty('slug') ? overrides.slug! : 'sint',
        solution_categories: overrides && overrides.hasOwnProperty('solution_categories') ? overrides.solution_categories! : [relationshipsToOmit.has('SolutionCategory') ? {} as SolutionCategory : mockSolutionCategory({}, relationshipsToOmit)],
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        type: overrides && overrides.hasOwnProperty('type') ? overrides.type! : 'congregatio',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-10-25T15:55:58.117Z',
        updater_id: overrides && overrides.hasOwnProperty('updater_id') ? overrides.updater_id! : 'ulciscor',
        uploader: overrides && overrides.hasOwnProperty('uploader') ? overrides.uploader! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        uploader_organization: overrides && overrides.hasOwnProperty('uploader_organization') ? overrides.uploader_organization! : relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit),
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
        vendor_url: overrides && overrides.hasOwnProperty('vendor_url') ? overrides.vendor_url! : 'temporibus',
    };
};

export const mockTrialDeploymentsInput = (overrides?: Partial<TrialDeploymentsInput>, _relationshipsToOmit: Set<string> = new Set()): TrialDeploymentsInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('TrialDeploymentsInput');
    return {
        organizationId: overrides && overrides.hasOwnProperty('organizationId') ? overrides.organizationId! : 'derideo',
        platformIdentifiers: overrides && overrides.hasOwnProperty('platformIdentifiers') ? overrides.platformIdentifiers! : [PlatformIdentifier.Openaev],
    };
};

export const mockTrialsDeployments = (overrides?: Partial<TrialsDeployments>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'TrialsDeployments' } & TrialsDeployments => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('TrialsDeployments');
    return {
        __typename: 'TrialsDeployments',
        availableTrials: overrides && overrides.hasOwnProperty('availableTrials') ? overrides.availableTrials! : [PlatformIdentifier.Openaev],
        deployed: overrides && overrides.hasOwnProperty('deployed') ? overrides.deployed! : [relationshipsToOmit.has('DeployedPlatform') ? {} as DeployedPlatform : mockDeployedPlatform({}, relationshipsToOmit)],
        isBlacklisted: overrides && overrides.hasOwnProperty('isBlacklisted') ? overrides.isBlacklisted! : false,
    };
};

export const mockUnregisterPlatformInput = (overrides?: Partial<UnregisterPlatformInput>, _relationshipsToOmit: Set<string> = new Set()): UnregisterPlatformInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UnregisterPlatformInput');
    return {
        identifier: overrides && overrides.hasOwnProperty('identifier') ? overrides.identifier! : PlatformIdentifier.Openaev,
        platformId: overrides && overrides.hasOwnProperty('platformId') ? overrides.platformId! : 'patria',
        tenantId: overrides && overrides.hasOwnProperty('tenantId') ? overrides.tenantId! : 'vindico',
    };
};

export const mockUpdateBundleUserGroupsInput = (overrides?: Partial<UpdateBundleUserGroupsInput>, _relationshipsToOmit: Set<string> = new Set()): UpdateBundleUserGroupsInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UpdateBundleUserGroupsInput');
    return {
        roles: overrides && overrides.hasOwnProperty('roles') ? overrides.roles! : [relationshipsToOmit.has('UpdateBundleUserGroupsRoleInput') ? {} as UpdateBundleUserGroupsRoleInput : mockUpdateBundleUserGroupsRoleInput({}, relationshipsToOmit)],
        userIds: overrides && overrides.hasOwnProperty('userIds') ? overrides.userIds! : ['textilis'],
    };
};

export const mockUpdateBundleUserGroupsRoleInput = (overrides?: Partial<UpdateBundleUserGroupsRoleInput>, _relationshipsToOmit: Set<string> = new Set()): UpdateBundleUserGroupsRoleInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UpdateBundleUserGroupsRoleInput');
    return {
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : PlatformIdentifier.Openaev,
        role: overrides && overrides.hasOwnProperty('role') ? overrides.role! : ServiceGroupName.Admin,
    };
};

export const mockUpdateCompetitorInput = (overrides?: Partial<UpdateCompetitorInput>, _relationshipsToOmit: Set<string> = new Set()): UpdateCompetitorInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UpdateCompetitorInput');
    return {
        domain: overrides && overrides.hasOwnProperty('domain') ? overrides.domain! : 'aliquam',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'sequi',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'sui',
        tier: overrides && overrides.hasOwnProperty('tier') ? overrides.tier! : CompetitorTier.Tier1,
    };
};

export const mockUpdateDeploymentQuotaCapacityInput = (overrides?: Partial<UpdateDeploymentQuotaCapacityInput>, _relationshipsToOmit: Set<string> = new Set()): UpdateDeploymentQuotaCapacityInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UpdateDeploymentQuotaCapacityInput');
    return {
        newCapacity: overrides && overrides.hasOwnProperty('newCapacity') ? overrides.newCapacity! : 7870,
        platformIdentifier: overrides && overrides.hasOwnProperty('platformIdentifier') ? overrides.platformIdentifier! : PlatformIdentifier.Openaev,
        region: overrides && overrides.hasOwnProperty('region') ? overrides.region! : DeploymentRequestPlatformRegion.ApacAu,
    };
};

export const mockUpdateDeploymentRequestInput = (overrides?: Partial<UpdateDeploymentRequestInput>, _relationshipsToOmit: Set<string> = new Set()): UpdateDeploymentRequestInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UpdateDeploymentRequestInput');
    return {
        actual_state: overrides && overrides.hasOwnProperty('actual_state') ? overrides.actual_state! : DeploymentRequestPlatformState.Active,
        end_date: overrides && overrides.hasOwnProperty('end_date') ? overrides.end_date! : '2021-09-22T16:53:51.991Z',
        failure_reason: overrides && overrides.hasOwnProperty('failure_reason') ? overrides.failure_reason! : 'cultellus',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'blandior',
        ordering: overrides && overrides.hasOwnProperty('ordering') ? overrides.ordering! : 1432,
        platform_id: overrides && overrides.hasOwnProperty('platform_id') ? overrides.platform_id! : 'coaegresco',
        start_date: overrides && overrides.hasOwnProperty('start_date') ? overrides.start_date! : '2021-06-08T15:40:58.723Z',
        url: overrides && overrides.hasOwnProperty('url') ? overrides.url! : 'capio',
    };
};

export const mockUpdateDocumentInput = (overrides?: Partial<UpdateDocumentInput>, _relationshipsToOmit: Set<string> = new Set()): UpdateDocumentInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UpdateDocumentInput');
    return {
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : true,
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'porro',
        entity_types: overrides && overrides.hasOwnProperty('entity_types') ? overrides.entity_types! : ['annus'],
        license_type: overrides && overrides.hasOwnProperty('license_type') ? overrides.license_type! : LicenseType.Commercial,
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'pel',
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'contra',
        solution_categories: overrides && overrides.hasOwnProperty('solution_categories') ? overrides.solution_categories! : ['desolo'],
        uploader_id: overrides && overrides.hasOwnProperty('uploader_id') ? overrides.uploader_id! : 'adstringo',
        uploader_organization_id: overrides && overrides.hasOwnProperty('uploader_organization_id') ? overrides.uploader_organization_id! : 'caute',
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : ['abduco'],
    };
};

export const mockUpdateEpicInput = (overrides?: Partial<UpdateEpicInput>, _relationshipsToOmit: Set<string> = new Set()): UpdateEpicInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UpdateEpicInput');
    return {
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : false,
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'adfectus',
        edition_type: overrides && overrides.hasOwnProperty('edition_type') ? overrides.edition_type! : EditionType.CommunityEdition,
        illustration_document: overrides && overrides.hasOwnProperty('illustration_document') ? overrides.illustration_document! : 'venustas',
        is_integration: overrides && overrides.hasOwnProperty('is_integration') ? overrides.is_integration! : false,
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : FiligranProduct.Openaev,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'corrigo',
        timeline: overrides && overrides.hasOwnProperty('timeline') ? overrides.timeline! : Timeline.Finished,
        title: overrides && overrides.hasOwnProperty('title') ? overrides.title! : 'tabella',
    };
};

export const mockUpdatePlatformServiceMetadataInput = (overrides?: Partial<UpdatePlatformServiceMetadataInput>, _relationshipsToOmit: Set<string> = new Set()): UpdatePlatformServiceMetadataInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UpdatePlatformServiceMetadataInput');
    return {
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'arcesso',
        serviceInstanceId: overrides && overrides.hasOwnProperty('serviceInstanceId') ? overrides.serviceInstanceId! : 'angulus',
    };
};

export const mockUpdateServiceGroupsInput = (overrides?: Partial<UpdateServiceGroupsInput>, _relationshipsToOmit: Set<string> = new Set()): UpdateServiceGroupsInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UpdateServiceGroupsInput');
    return {
        groups: overrides && overrides.hasOwnProperty('groups') ? overrides.groups! : [relationshipsToOmit.has('UpdateServiceGroupsInputGroup') ? {} as UpdateServiceGroupsInputGroup : mockUpdateServiceGroupsInputGroup({}, relationshipsToOmit)],
    };
};

export const mockUpdateServiceGroupsInputGroup = (overrides?: Partial<UpdateServiceGroupsInputGroup>, _relationshipsToOmit: Set<string> = new Set()): UpdateServiceGroupsInputGroup => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UpdateServiceGroupsInputGroup');
    return {
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'terreo',
        userIds: overrides && overrides.hasOwnProperty('userIds') ? overrides.userIds! : ['territo'],
    };
};

export const mockUpdateSubscriptionInput = (overrides?: Partial<UpdateSubscriptionInput>, _relationshipsToOmit: Set<string> = new Set()): UpdateSubscriptionInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UpdateSubscriptionInput');
    return {
        capability_ids: overrides && overrides.hasOwnProperty('capability_ids') ? overrides.capability_ids! : ['cenaculum'],
        end_date: overrides && overrides.hasOwnProperty('end_date') ? overrides.end_date! : '2021-11-27T02:19:37.763Z',
        start_date: overrides && overrides.hasOwnProperty('start_date') ? overrides.start_date! : '2021-03-13T10:17:34.634Z',
    };
};

export const mockUpdateVotableFeatureInput = (overrides?: Partial<UpdateVotableFeatureInput>, _relationshipsToOmit: Set<string> = new Set()): UpdateVotableFeatureInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UpdateVotableFeatureInput');
    return {
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : true,
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'amitto',
        illustration_document_id: overrides && overrides.hasOwnProperty('illustration_document_id') ? overrides.illustration_document_id! : 'trado',
        position: overrides && overrides.hasOwnProperty('position') ? overrides.position! : 2723,
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : FiligranProduct.Openaev,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'viduo',
        title: overrides && overrides.hasOwnProperty('title') ? overrides.title! : 'deinde',
        use_case_ids: overrides && overrides.hasOwnProperty('use_case_ids') ? overrides.use_case_ids! : ['tricesimus'],
    };
};

export const mockUpdateVotingRoundInput = (overrides?: Partial<UpdateVotingRoundInput>, _relationshipsToOmit: Set<string> = new Set()): UpdateVotingRoundInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UpdateVotingRoundInput');
    return {
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'illum',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'decens',
        theme: overrides && overrides.hasOwnProperty('theme') ? overrides.theme! : VotingRoundTheme.Default,
    };
};

export const mockUseCase = (overrides?: Partial<UseCase>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UseCase' } & UseCase => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UseCase');
    return {
        __typename: 'UseCase',
        color: overrides && overrides.hasOwnProperty('color') ? overrides.color! : 'spoliatio',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '493b625d-7763-46eb-92f0-b603171f51a1',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'adopto',
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : [FiligranProduct.Openaev],
    };
};

export const mockUseCaseConnection = (overrides?: Partial<UseCaseConnection>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UseCaseConnection' } & UseCaseConnection => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UseCaseConnection');
    return {
        __typename: 'UseCaseConnection',
        edges: overrides && overrides.hasOwnProperty('edges') ? overrides.edges! : [relationshipsToOmit.has('UseCaseEdge') ? {} as UseCaseEdge : mockUseCaseEdge({}, relationshipsToOmit)],
        pageInfo: overrides && overrides.hasOwnProperty('pageInfo') ? overrides.pageInfo! : relationshipsToOmit.has('PageInfo') ? {} as PageInfo : mockPageInfo({}, relationshipsToOmit),
        totalCount: overrides && overrides.hasOwnProperty('totalCount') ? overrides.totalCount! : 3750,
    };
};

export const mockUseCaseEdge = (overrides?: Partial<UseCaseEdge>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UseCaseEdge' } & UseCaseEdge => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UseCaseEdge');
    return {
        __typename: 'UseCaseEdge',
        cursor: overrides && overrides.hasOwnProperty('cursor') ? overrides.cursor! : 'derelinquo',
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit),
    };
};

export const mockUser = (overrides?: Partial<User>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'User' } & User => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('User');
    return {
        __typename: 'User',
        capabilities: overrides && overrides.hasOwnProperty('capabilities') ? overrides.capabilities! : [relationshipsToOmit.has('Capability') ? {} as Capability : mockCapability({}, relationshipsToOmit)],
        country: overrides && overrides.hasOwnProperty('country') ? overrides.country! : 'ars',
        disabled: overrides && overrides.hasOwnProperty('disabled') ? overrides.disabled! : true,
        email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : 'natus',
        first_name: overrides && overrides.hasOwnProperty('first_name') ? overrides.first_name! : 'comis',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'b7605a2a-ad1e-4667-801e-5e47e5de933b',
        last_login: overrides && overrides.hasOwnProperty('last_login') ? overrides.last_login! : '2021-06-21T14:08:26.031Z',
        last_name: overrides && overrides.hasOwnProperty('last_name') ? overrides.last_name! : 'sulum',
        organization_capabilities: overrides && overrides.hasOwnProperty('organization_capabilities') ? overrides.organization_capabilities! : [relationshipsToOmit.has('OrganizationCapabilities') ? {} as OrganizationCapabilities : mockOrganizationCapabilities({}, relationshipsToOmit)],
        organizations: overrides && overrides.hasOwnProperty('organizations') ? overrides.organizations! : [relationshipsToOmit.has('Organization') ? {} as Organization : mockOrganization({}, relationshipsToOmit)],
        pending_organization_id: overrides && overrides.hasOwnProperty('pending_organization_id') ? overrides.pending_organization_id! : 'sint',
        picture: overrides && overrides.hasOwnProperty('picture') ? overrides.picture! : 'addo',
        roles_portal: overrides && overrides.hasOwnProperty('roles_portal') ? overrides.roles_portal! : [relationshipsToOmit.has('RolePortal') ? {} as RolePortal : mockRolePortal({}, relationshipsToOmit)],
        selected_language: overrides && overrides.hasOwnProperty('selected_language') ? overrides.selected_language! : 'eligendi',
        selected_org_capabilities: overrides && overrides.hasOwnProperty('selected_org_capabilities') ? overrides.selected_org_capabilities! : [OrganizationCapability.AdministrateOrganization],
        selected_organization_id: overrides && overrides.hasOwnProperty('selected_organization_id') ? overrides.selected_organization_id! : 'terreo',
    };
};

export const mockUserConnection = (overrides?: Partial<UserConnection>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UserConnection' } & UserConnection => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserConnection');
    return {
        __typename: 'UserConnection',
        edges: overrides && overrides.hasOwnProperty('edges') ? overrides.edges! : [relationshipsToOmit.has('UserEdge') ? {} as UserEdge : mockUserEdge({}, relationshipsToOmit)],
        pageInfo: overrides && overrides.hasOwnProperty('pageInfo') ? overrides.pageInfo! : relationshipsToOmit.has('PageInfo') ? {} as PageInfo : mockPageInfo({}, relationshipsToOmit),
        totalCount: overrides && overrides.hasOwnProperty('totalCount') ? overrides.totalCount! : 3509,
    };
};

export const mockUserEdge = (overrides?: Partial<UserEdge>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UserEdge' } & UserEdge => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserEdge');
    return {
        __typename: 'UserEdge',
        cursor: overrides && overrides.hasOwnProperty('cursor') ? overrides.cursor! : 'subiungo',
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
    };
};

export const mockUserPendingSubscription = (overrides?: Partial<UserPendingSubscription>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UserPendingSubscription' } & UserPendingSubscription => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserPendingSubscription');
    return {
        __typename: 'UserPendingSubscription',
        delete: overrides && overrides.hasOwnProperty('delete') ? overrides.delete! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        invalidate: overrides && overrides.hasOwnProperty('invalidate') ? overrides.invalidate! : relationshipsToOmit.has('OrganizationRef') ? {} as OrganizationRef : mockOrganizationRef({}, relationshipsToOmit),
    };
};

export const mockUserPlatformGroup = (overrides?: Partial<UserPlatformGroup>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UserPlatformGroup' } & UserPlatformGroup => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserPlatformGroup');
    return {
        __typename: 'UserPlatformGroup',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : ServiceGroupName.Admin,
        platformIdentifier: overrides && overrides.hasOwnProperty('platformIdentifier') ? overrides.platformIdentifier! : PlatformIdentifier.Openaev,
    };
};

export const mockUserService = (overrides?: Partial<UserService>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UserService' } & UserService => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserService');
    return {
        __typename: 'UserService',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'c20430c1-7008-4ddc-828b-a5de43e7e5a1',
        ordering: overrides && overrides.hasOwnProperty('ordering') ? overrides.ordering! : 7673,
        subscription: overrides && overrides.hasOwnProperty('subscription') ? overrides.subscription! : relationshipsToOmit.has('SubscriptionModel') ? {} as SubscriptionModel : mockSubscriptionModel({}, relationshipsToOmit),
        subscription_id: overrides && overrides.hasOwnProperty('subscription_id') ? overrides.subscription_id! : '58c02576-3ed7-419a-b53e-ddba468c7bbe',
        user: overrides && overrides.hasOwnProperty('user') ? overrides.user! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        user_id: overrides && overrides.hasOwnProperty('user_id') ? overrides.user_id! : 'e920e2c7-769a-46ec-a952-dee7e9c0f887',
        user_service_capability: overrides && overrides.hasOwnProperty('user_service_capability') ? overrides.user_service_capability! : [relationshipsToOmit.has('UserServiceCapability') ? {} as UserServiceCapability : mockUserServiceCapability({}, relationshipsToOmit)],
    };
};

export const mockUserServiceAddInput = (overrides?: Partial<UserServiceAddInput>, _relationshipsToOmit: Set<string> = new Set()): UserServiceAddInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserServiceAddInput');
    return {
        capabilities: overrides && overrides.hasOwnProperty('capabilities') ? overrides.capabilities! : ['avaritia'],
        email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : ['caveo'],
        subscription_id: overrides && overrides.hasOwnProperty('subscription_id') ? overrides.subscription_id! : 'blanditiis',
    };
};

export const mockUserServiceAddYourselfInput = (overrides?: Partial<UserServiceAddYourselfInput>, _relationshipsToOmit: Set<string> = new Set()): UserServiceAddYourselfInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserServiceAddYourselfInput');
    return {
        email: overrides && overrides.hasOwnProperty('email') ? overrides.email! : ['suadeo'],
        serviceInstanceId: overrides && overrides.hasOwnProperty('serviceInstanceId') ? overrides.serviceInstanceId! : 'synagoga',
    };
};

export const mockUserServiceCapabilitiesResponse = (overrides?: Partial<UserServiceCapabilitiesResponse>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UserServiceCapabilitiesResponse' } & UserServiceCapabilitiesResponse => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserServiceCapabilitiesResponse');
    return {
        __typename: 'UserServiceCapabilitiesResponse',
        subscription_id: overrides && overrides.hasOwnProperty('subscription_id') ? overrides.subscription_id! : 'iste',
        userServiceCapabilities: overrides && overrides.hasOwnProperty('userServiceCapabilities') ? overrides.userServiceCapabilities! : [relationshipsToOmit.has('UserServiceCapability') ? {} as UserServiceCapability : mockUserServiceCapability({}, relationshipsToOmit)],
    };
};

export const mockUserServiceCapability = (overrides?: Partial<UserServiceCapability>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UserServiceCapability' } & UserServiceCapability => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserServiceCapability');
    return {
        __typename: 'UserServiceCapability',
        generic_service_capability: overrides && overrides.hasOwnProperty('generic_service_capability') ? overrides.generic_service_capability! : relationshipsToOmit.has('GenericServiceCapability') ? {} as GenericServiceCapability : mockGenericServiceCapability({}, relationshipsToOmit),
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : '4b3020a6-d085-466d-8db7-3ca4c4b383fe',
        subscription_capability: overrides && overrides.hasOwnProperty('subscription_capability') ? overrides.subscription_capability! : relationshipsToOmit.has('SubscriptionCapability') ? {} as SubscriptionCapability : mockSubscriptionCapability({}, relationshipsToOmit),
        user_service_id: overrides && overrides.hasOwnProperty('user_service_id') ? overrides.user_service_id! : '90cafcef-0c3b-4c84-9592-1beb4bc23d12',
    };
};

export const mockUserServiceConnection = (overrides?: Partial<UserServiceConnection>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UserServiceConnection' } & UserServiceConnection => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserServiceConnection');
    return {
        __typename: 'UserServiceConnection',
        edges: overrides && overrides.hasOwnProperty('edges') ? overrides.edges! : [relationshipsToOmit.has('UserServiceEdge') ? {} as UserServiceEdge : mockUserServiceEdge({}, relationshipsToOmit)],
        pageInfo: overrides && overrides.hasOwnProperty('pageInfo') ? overrides.pageInfo! : relationshipsToOmit.has('PageInfo') ? {} as PageInfo : mockPageInfo({}, relationshipsToOmit),
        totalCount: overrides && overrides.hasOwnProperty('totalCount') ? overrides.totalCount! : 2086,
    };
};

export const mockUserServiceDeleted = (overrides?: Partial<UserServiceDeleted>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UserServiceDeleted' } & UserServiceDeleted => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserServiceDeleted');
    return {
        __typename: 'UserServiceDeleted',
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'cf2c0003-39de-4595-9584-3f59aa983954',
        subscription_id: overrides && overrides.hasOwnProperty('subscription_id') ? overrides.subscription_id! : '480496d7-bfec-4838-81ba-24671873a19d',
        user_id: overrides && overrides.hasOwnProperty('user_id') ? overrides.user_id! : '70606533-02be-47e6-a40f-e2f531592338',
    };
};

export const mockUserServiceEdge = (overrides?: Partial<UserServiceEdge>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UserServiceEdge' } & UserServiceEdge => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserServiceEdge');
    return {
        __typename: 'UserServiceEdge',
        cursor: overrides && overrides.hasOwnProperty('cursor') ? overrides.cursor! : 'spoliatio',
        node: overrides && overrides.hasOwnProperty('node') ? overrides.node! : relationshipsToOmit.has('UserService') ? {} as UserService : mockUserService({}, relationshipsToOmit),
    };
};

export const mockUserServiceEditInput = (overrides?: Partial<UserServiceEditInput>, _relationshipsToOmit: Set<string> = new Set()): UserServiceEditInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserServiceEditInput');
    return {
        capabilities: overrides && overrides.hasOwnProperty('capabilities') ? overrides.capabilities! : ['derelinquo'],
        userServiceId: overrides && overrides.hasOwnProperty('userServiceId') ? overrides.userServiceId! : 'abscido',
    };
};

export const mockUserServicesAddCapabilitiesInput = (overrides?: Partial<UserServicesAddCapabilitiesInput>, _relationshipsToOmit: Set<string> = new Set()): UserServicesAddCapabilitiesInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserServicesAddCapabilitiesInput');
    return {
        capabilities: overrides && overrides.hasOwnProperty('capabilities') ? overrides.capabilities! : ['aiunt'],
        userServiceIds: overrides && overrides.hasOwnProperty('userServiceIds') ? overrides.userServiceIds! : ['sit'],
    };
};

export const mockUserServicesDeleteInput = (overrides?: Partial<UserServicesDeleteInput>, _relationshipsToOmit: Set<string> = new Set()): UserServicesDeleteInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserServicesDeleteInput');
    return {
        userServiceIds: overrides && overrides.hasOwnProperty('userServiceIds') ? overrides.userServiceIds! : ['absorbeo'],
    };
};

export const mockUserSubscription = (overrides?: Partial<UserSubscription>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'UserSubscription' } & UserSubscription => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UserSubscription');
    return {
        __typename: 'UserSubscription',
        add: overrides && overrides.hasOwnProperty('add') ? overrides.add! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        delete: overrides && overrides.hasOwnProperty('delete') ? overrides.delete! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        edit: overrides && overrides.hasOwnProperty('edit') ? overrides.edit! : relationshipsToOmit.has('User') ? {} as User : mockUser({}, relationshipsToOmit),
        merge: overrides && overrides.hasOwnProperty('merge') ? overrides.merge! : relationshipsToOmit.has('MergeEvent') ? {} as MergeEvent : mockMergeEvent({}, relationshipsToOmit),
    };
};

export const mockUsersWithCapabilitiesInOrganizationInput = (overrides?: Partial<UsersWithCapabilitiesInOrganizationInput>, _relationshipsToOmit: Set<string> = new Set()): UsersWithCapabilitiesInOrganizationInput => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('UsersWithCapabilitiesInOrganizationInput');
    return {
        capabilities: overrides && overrides.hasOwnProperty('capabilities') ? overrides.capabilities! : [OrganizationCapability.AdministrateOrganization],
        organizationId: overrides && overrides.hasOwnProperty('organizationId') ? overrides.organizationId! : 'xiphias',
    };
};

export const mockVotableFeature = (overrides?: Partial<VotableFeature>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'VotableFeature' } & VotableFeature => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('VotableFeature');
    return {
        __typename: 'VotableFeature',
        active: overrides && overrides.hasOwnProperty('active') ? overrides.active! : false,
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-08-16T19:49:45.318Z',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'absens',
        has_my_vote: overrides && overrides.hasOwnProperty('has_my_vote') ? overrides.has_my_vote! : false,
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'b74a85ce-5e15-4d3b-a103-2124060ee36a',
        illustration_document: overrides && overrides.hasOwnProperty('illustration_document') ? overrides.illustration_document! : relationshipsToOmit.has('Document') ? {} as Document : mockDocument({}, relationshipsToOmit),
        illustration_document_id: overrides && overrides.hasOwnProperty('illustration_document_id') ? overrides.illustration_document_id! : 'ager',
        position: overrides && overrides.hasOwnProperty('position') ? overrides.position! : 1999,
        product: overrides && overrides.hasOwnProperty('product') ? overrides.product! : FiligranProduct.Openaev,
        short_description: overrides && overrides.hasOwnProperty('short_description') ? overrides.short_description! : 'absconditus',
        title: overrides && overrides.hasOwnProperty('title') ? overrides.title! : 'thesis',
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-06-23T10:40:12.999Z',
        use_cases: overrides && overrides.hasOwnProperty('use_cases') ? overrides.use_cases! : [relationshipsToOmit.has('UseCase') ? {} as UseCase : mockUseCase({}, relationshipsToOmit)],
        voting_round_id: overrides && overrides.hasOwnProperty('voting_round_id') ? overrides.voting_round_id! : 'deduco',
    };
};

export const mockVotableFeatureResult = (overrides?: Partial<VotableFeatureResult>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'VotableFeatureResult' } & VotableFeatureResult => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('VotableFeatureResult');
    return {
        __typename: 'VotableFeatureResult',
        feature: overrides && overrides.hasOwnProperty('feature') ? overrides.feature! : relationshipsToOmit.has('VotableFeature') ? {} as VotableFeature : mockVotableFeature({}, relationshipsToOmit),
        vote_count: overrides && overrides.hasOwnProperty('vote_count') ? overrides.vote_count! : 6780,
    };
};

export const mockVotingRound = (overrides?: Partial<VotingRound>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'VotingRound' } & VotingRound => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('VotingRound');
    return {
        __typename: 'VotingRound',
        closed_at: overrides && overrides.hasOwnProperty('closed_at') ? overrides.closed_at! : '2021-07-31T22:31:47.510Z',
        created_at: overrides && overrides.hasOwnProperty('created_at') ? overrides.created_at! : '2021-06-02T15:52:07.194Z',
        description: overrides && overrides.hasOwnProperty('description') ? overrides.description! : 'conforto',
        feature_count: overrides && overrides.hasOwnProperty('feature_count') ? overrides.feature_count! : 5525,
        features: overrides && overrides.hasOwnProperty('features') ? overrides.features! : [relationshipsToOmit.has('VotableFeature') ? {} as VotableFeature : mockVotableFeature({}, relationshipsToOmit)],
        id: overrides && overrides.hasOwnProperty('id') ? overrides.id! : 'a95c3939-5c47-4e86-b4df-3f6f4e731430',
        name: overrides && overrides.hasOwnProperty('name') ? overrides.name! : 'adhuc',
        opened_at: overrides && overrides.hasOwnProperty('opened_at') ? overrides.opened_at! : '2021-01-24T21:58:48.382Z',
        service_instance_id: overrides && overrides.hasOwnProperty('service_instance_id') ? overrides.service_instance_id! : 'cur',
        status: overrides && overrides.hasOwnProperty('status') ? overrides.status! : VotingRoundStatus.Closed,
        theme: overrides && overrides.hasOwnProperty('theme') ? overrides.theme! : VotingRoundTheme.Default,
        updated_at: overrides && overrides.hasOwnProperty('updated_at') ? overrides.updated_at! : '2021-07-04T14:54:28.592Z',
    };
};

export const mockVotingRoundResults = (overrides?: Partial<VotingRoundResults>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'VotingRoundResults' } & VotingRoundResults => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('VotingRoundResults');
    return {
        __typename: 'VotingRoundResults',
        results: overrides && overrides.hasOwnProperty('results') ? overrides.results! : [relationshipsToOmit.has('VotableFeatureResult') ? {} as VotableFeatureResult : mockVotableFeatureResult({}, relationshipsToOmit)],
        round: overrides && overrides.hasOwnProperty('round') ? overrides.round! : relationshipsToOmit.has('VotingRound') ? {} as VotingRound : mockVotingRound({}, relationshipsToOmit),
        total_voters: overrides && overrides.hasOwnProperty('total_voters') ? overrides.total_voters! : 2413,
    };
};

export const mockXtmoneIntegrationStatus = (overrides?: Partial<XtmoneIntegrationStatus>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'XtmoneIntegrationStatus' } & XtmoneIntegrationStatus => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('XtmoneIntegrationStatus');
    return {
        __typename: 'XtmoneIntegrationStatus',
        last_checked_at: overrides && overrides.hasOwnProperty('last_checked_at') ? overrides.last_checked_at! : 'certe',
        linked: overrides && overrides.hasOwnProperty('linked') ? overrides.linked! : true,
        openaev: overrides && overrides.hasOwnProperty('openaev') ? overrides.openaev! : relationshipsToOmit.has('XtmoneIntegrationStatusEntry') ? {} as XtmoneIntegrationStatusEntry : mockXtmoneIntegrationStatusEntry({}, relationshipsToOmit),
        opencti: overrides && overrides.hasOwnProperty('opencti') ? overrides.opencti! : relationshipsToOmit.has('XtmoneIntegrationStatusEntry') ? {} as XtmoneIntegrationStatusEntry : mockXtmoneIntegrationStatusEntry({}, relationshipsToOmit),
    };
};

export const mockXtmoneIntegrationStatusEntry = (overrides?: Partial<XtmoneIntegrationStatusEntry>, _relationshipsToOmit: Set<string> = new Set()): { __typename: 'XtmoneIntegrationStatusEntry' } & XtmoneIntegrationStatusEntry => {
    const relationshipsToOmit: Set<string> = new Set(_relationshipsToOmit);
    relationshipsToOmit.add('XtmoneIntegrationStatusEntry');
    return {
        __typename: 'XtmoneIntegrationStatusEntry',
        connected: overrides && overrides.hasOwnProperty('connected') ? overrides.connected! : true,
        last_checked_at: overrides && overrides.hasOwnProperty('last_checked_at') ? overrides.last_checked_at! : 'spargo',
        status: overrides && overrides.hasOwnProperty('status') ? overrides.status! : 'tres',
    };
};
