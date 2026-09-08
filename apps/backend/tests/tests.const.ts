import { GraphQLResolveInfo } from 'graphql';
import {
  DeploymentRequestActivitySector,
  DeploymentRequestDeploymentType,
  DeploymentRequestJobTitle,
  DeploymentRequestPlatformRegion,
  DeploymentRequestSource,
  DeploymentRequestUseCase,
  PlatformIdentifier,
  PortalCapability,
} from '../src/__generated__/resolvers-types';
import CapabilityPortal, {
  CapabilityPortalId,
} from '../src/model/kanel/public/CapabilityPortal';
import { OrganizationId } from '../src/model/kanel/public/Organization';
import { ServiceCapabilityId } from '../src/model/kanel/public/ServiceCapability';
import { ServiceDefinitionId } from '../src/model/kanel/public/ServiceDefinition';
import { ServiceInstanceId } from '../src/model/kanel/public/ServiceInstance';
import { UseCaseId } from '../src/model/kanel/public/UseCase';
import { UserId } from '../src/model/kanel/public/User';
import { PortalContext } from '../src/model/portal-context';
import type { DeploymentRequestDataLoaders } from '../src/modules/deployment/deployment.dataloader';
import type { DocumentDataLoaders } from '../src/modules/document/document.dataloader';
import type { NewsFeedDataLoaders } from '../src/modules/news-feed/news-feed.dataloader';
import type { ServiceInstanceDataLoaders } from '../src/modules/service/instance/service-instance.dataloader';
import {
  CAPABILITY_BYPASS,
  PLATFORM_ORGANIZATION_UUID,
  SYSTEM_USER_CONTEXT,
} from '../src/portal.const';

export const GRAPHQL_RESOLVE_INFO = {} as GraphQLResolveInfo;

export const TEST_ORGANIZATIONS = {
  FILIGRAN: {
    ID: 'ba091095-418f-4b4f-b150-6c9295e232c4' as OrganizationId,
    NAME: 'Filigran',
    DOMAINS: {
      FIRST: 'filigran.io',
      SECOND: 'internal.com',
    },
    USERS: {
      BYPASS: {
        ID: 'ba091095-418f-4b4f-b150-6c9295e232c3' as UserId,
        EMAIL: 'admin@filigran.io',
        PASSWORD: 'admin',
        FIRST_NAME: 'Al',
        LAST_NAME: 'Beback',
      },
      SIMPLE: {
        ID: 'e389e507-f1cd-4f2f-bfb2-274140d87d28' as UserId,
      },
      SIMPLE2: {
        ID: '77b4b845-4ab4-4df8-8e12-0651da813ebb' as UserId,
        EMAIL: 'access-subscription@filigran.io',
        FIRST_NAME: 'access',
        LAST_NAME: 'subscription',
      },
    },
  },
  SECOND_ORGANIZATION: {
    ID: '681fb117-e2c3-46d3-945a-0e921b5d4b6c' as OrganizationId,
    NAME: 'SECOND ORGA',
    USERS: {
      ADMIN_ORGA: {
        ID: '015c0488-848d-4c89-95e3-8a243971f594' as UserId,
        EMAIL: 'admin@second-orga.com',
        PERSONAL_SPACE_ID:
          '015c0488-848d-4c89-95e3-8a243971f594' as OrganizationId,
      },
      SIMPLE: {
        ID: '154006e2-f24b-42da-b39c-e0fb17bead00' as UserId,
        EMAIL: 'user@second-orga.com',
        FIRST_NAME: 'Justin',
        LAST_NAME: 'Time',
        PERSONAL_SPACE_ID:
          '154006e2-f24b-42da-b39c-e0fb17bead00' as OrganizationId,
        COUNTRY: 'FRANCE',
        PICTURE: '',
      },
      REGISTERER: {
        ID: 'b2d22bec-182c-47b3-bf4e-ba8e0d3e6a40' as UserId,
        EMAIL: 'user.registerer@second-orga.com',
        FIRST_NAME: 'Anita',
        LAST_NAME: 'Break',
        PERSONAL_SPACE_ID:
          'b2d22bec-182c-47b3-bf4e-ba8e0d3e6a40' as OrganizationId,
      },
    },
    DOMAINS: {
      FIRST: { NAME: 'second-orga.com' },
      SECOND: { NAME: 'second-orga.fr' },
    },
  },
};

export const SERVICES = {
  DEFINITIONS: {
    OPENCTI_INTEGRATIONS: {
      ID: '42007953-4dbc-480a-8693-8c05f1123460' as ServiceDefinitionId,
    },
    OPENAEV_REGISTRATION: {
      ID: 'e66a6b50-1f92-4f62-b84c-88ed6b871790' as ServiceDefinitionId,
    },
    OPENCTI_REGISTRATION: {
      ID: '5f769173-5ace-4ef3-b04f-2c95609c5b59' as ServiceDefinitionId,
    },
    VAULT: {
      ID: '2634d52b-f061-4ebc-bed2-c6cc94297ad1' as ServiceDefinitionId,
    },
  },
  INSTANCES: {
    VAULT: {
      ID: 'e88e8f80-ba9e-480b-ab27-8613a1565eff' as ServiceInstanceId,
    },
    INTEGRATIONS: {
      NAME: 'integrations',
      ID: '0f4aad4b-bdd6-4084-8b1f-82c9c66578cc' as ServiceInstanceId,
      CAPABILITIES: {
        UPLOAD: {
          ID: '26611d56-e443-45fb-9f6c-cc6b9b8a5de9' as ServiceCapabilityId,
        },
        DELETE: {
          ID: '283e06b2-2d64-42c7-b432-890e69ac8b8f' as ServiceCapabilityId,
        },
      },
    },
    OPENAEV_SCENARIOS: {
      NAME: 'open aev scenarios',
      ID: 'f61ee5ca-4b4f-4f94-9cb7-69b1b1c885a2' as ServiceInstanceId,
    },
    OPENCTI_PLAYBOOKS: {
      NAME: 'opencti playbooks',
      ID: '01345f38-8a2b-4f3a-a731-9bd0cbb5fa58' as ServiceInstanceId,
    },
    CUSTOM_DASHBOARDS: {
      ID: 'e1fb0d3f-a090-41c7-b183-8d949f6c2ba4' as ServiceInstanceId,
      SLUG: 'opencti-custom-dashboards',
    },
    CUSTOM_VIEWS: {
      ID: '9785fa07-309f-47ab-bcc0-c0c3447f7e29' as ServiceInstanceId,
      SLUG: 'opencti-custom-views',
    },
    EPIC: {
      ID: '3260f536-49b8-4c6f-8e87-61c8be1ae103' as ServiceInstanceId,
    },
  },
};

// Reusable use cases seeded in tests/seeds/04-insert-use-cases.js, to avoid
// ad hoc creation in every test file. Names are not significant to the
// features under test.
export const TEST_USE_CASES = {
  AUTOMATION: {
    ID: '9d3a9c3d-3b9a-4b5b-8b0a-1a2b3c4d5e01' as UseCaseId,
    NAME: 'Automation',
  },
  INTEGRATION: {
    ID: '9d3a9c3d-3b9a-4b5b-8b0a-1a2b3c4d5e02' as UseCaseId,
    NAME: 'Integration',
  },
  MONITORING: {
    ID: '9d3a9c3d-3b9a-4b5b-8b0a-1a2b3c4d5e03' as UseCaseId,
    NAME: 'Monitoring',
  },
  DETECTION: {
    ID: '9d3a9c3d-3b9a-4b5b-8b0a-1a2b3c4d5e04' as UseCaseId,
    NAME: 'Detection',
  },
  RESPONSE: {
    ID: '9d3a9c3d-3b9a-4b5b-8b0a-1a2b3c4d5e05' as UseCaseId,
    NAME: 'Response',
  },
};

export const CAPABILITY_READ_TRIALS: CapabilityPortal = {
  id: 'bb8cadfe-8853-486c-993e-ab0026348fec' as CapabilityPortalId,
  name: PortalCapability.ReadTrials,
};

export const CAPABILITY_MODIFY_TRIALS: CapabilityPortal = {
  id: '9faa68f2-a274-403b-b07f-3c8502239df5' as CapabilityPortalId,
  name: PortalCapability.ModifyTrials,
};

export const CAPABILITY_MANAGE_DEPLOYMENT: CapabilityPortal = {
  id: 'system-token-MANAGE_DEPLOYMENT' as CapabilityPortalId,
  name: PortalCapability.ManageDeployment,
};

export const TEST_DEPLOYMENT = {
  activity_sector: DeploymentRequestActivitySector.ComputerNetworkSecurity,
  job_title: DeploymentRequestJobTitle.CLevel,
  use_cases_by_product: [
    {
      platform_identifier: PlatformIdentifier.Opencti,
      use_case: DeploymentRequestUseCase.ThreatHunting,
    },
  ],
  products: [PlatformIdentifier.Opencti],
  region: DeploymentRequestPlatformRegion.UsEast,
  type: DeploymentRequestDeploymentType.Trial,
  source: DeploymentRequestSource.Xtmhub,
};

export const contextBypassUser: PortalContext = {
  user: {
    id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
    email: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
    password: null,
    salt: null,
    first_name: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
    last_name: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.LAST_NAME,
    selected_organization_id: PLATFORM_ORGANIZATION_UUID,
    organizations: [
      {
        id: PLATFORM_ORGANIZATION_UUID,
        name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
        personal_space: false,
        domains: [],
      },
    ],
    capabilities: [CAPABILITY_BYPASS],
    roles_portal: [],
  },
} as unknown as PortalContext;

export const requestContextAdminUser = {
  user: contextBypassUser.user,
  portalContext: contextBypassUser,
};

export const contextSystemUserManageDeployment: PortalContext = {
  ...SYSTEM_USER_CONTEXT,
  user: {
    ...SYSTEM_USER_CONTEXT.user,
    capabilities: [CAPABILITY_MANAGE_DEPLOYMENT],
  },
};

export const requestContextSystemUserManageDeployment = {
  user: contextSystemUserManageDeployment.user,
  portalContext: contextSystemUserManageDeployment,
};

export const contextAdminSecondOrga: PortalContext = {
  user: {
    id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
    email: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.EMAIL,
    password: null,
    salt: null,
    first_name: null,
    last_name: null,
    selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
    selected_org_capabilities: ['ADMINISTRATE_ORGANIZATION'],
    organizations: [
      {
        id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
        personal_space: false,
        domains: [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.DOMAINS.FIRST],
      },
      {
        id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA
          .PERSONAL_SPACE_ID,
        name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.EMAIL,
        personal_space: true,
        domains: [],
      },
    ],
    capabilities: [],
    roles_portal: [],
    organization_capabilities: [
      {
        id: 12,
        organization: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        capabilities: ['ADMINISTRATE_ORGANIZATION'],
      },
      {
        id: 13,
        organization:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA
            .PERSONAL_SPACE_ID,
        capabilities: ['ADMINISTRATE_ORGANIZATION'],
      },
    ],
  },
} as unknown as PortalContext;

export const requestContextAdminSecondOrga = {
  user: contextAdminSecondOrga.user,
  portalContext: contextAdminSecondOrga,
};

export const contextRegistererUserSecondOrga: PortalContext = {
  user: {
    id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
    email: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.EMAIL,
    password: null,
    salt: null,
    first_name:
      TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.FIRST_NAME,
    last_name:
      TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.LAST_NAME,
    selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
    selected_org_capabilities: ['MANAGE_PLATFORM_REGISTRATION'],
    organizations: [
      {
        id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
        personal_space: false,
        domains: [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.DOMAINS.FIRST],
      },
      {
        id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER
          .PERSONAL_SPACE_ID,
        name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.EMAIL,
        personal_space: true,
        domains: [],
      },
    ],
    capabilities: [],
    roles_portal: [],
    organization_capabilities: [
      {
        id: 14,
        organization: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        capabilities: ['MANAGE_PLATFORM_REGISTRATION'],
      },
    ],
  },
  dataLoaders: {
    deploymentRequest: {
      childrenByParentLoader: { load: () => Promise.resolve([]) },
    } as unknown as DeploymentRequestDataLoaders,
  },
} as unknown as PortalContext;

export const requestContextRegistererUserSecondOrga = {
  user: contextRegistererUserSecondOrga.user,
  portalContext: contextRegistererUserSecondOrga,
};
export const contextSimpleUserSecondOrga: PortalContext = {
  user: {
    id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
    email: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.EMAIL,
    password: null,
    salt: null,
    first_name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.FIRST_NAME,
    last_name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.LAST_NAME,
    selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
    organizations: [
      {
        id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
        personal_space: false,
        domains: [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.DOMAINS.FIRST],
      },
      {
        id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA
          .PERSONAL_SPACE_ID,
        name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.EMAIL,
        personal_space: true,
        domains: [],
      },
    ],
    capabilities: [],
    roles_portal: [],
  },
} as unknown as PortalContext;

export const requestContextSimpleUserSecondOrga = {
  user: contextSimpleUserSecondOrga.user,
  portalContext: contextSimpleUserSecondOrga,
};

export const contextSimpleUserFiligran2: PortalContext = {
  user: {
    id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
    email: 'access-subscription@filigran.io',
    password: null,
    salt: null,
    first_name: 'access',
    last_name: 'subscription',
    selected_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
    organizations: [
      {
        id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
        personal_space: false,
        domains: [
          TEST_ORGANIZATIONS.FILIGRAN.DOMAINS.FIRST,
          TEST_ORGANIZATIONS.FILIGRAN.DOMAINS.SECOND,
        ],
      },
      {
        id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2
          .ID as unknown as OrganizationId,
        name: 'access-subscription@filigran.io',
        personal_space: true,
        domains: [],
      },
    ],
    capabilities: [],
    roles_portal: [],
  },
  dataLoaders: {
    deploymentRequest: {
      childrenByParentLoader: { load: () => Promise.resolve([]) },
    } as unknown as DeploymentRequestDataLoaders,
    document: {
      uploaderLoader: { load: () => Promise.resolve(null) },
      uploaderOrganizationLoader: { load: () => Promise.resolve(null) },
      childrenDocumentsLoader: { load: () => Promise.resolve([]) },
      imagesByDocumentIdLoader: { load: () => Promise.resolve([]) },
      useCasesByDocumentIdLoader: { load: () => Promise.resolve([]) },
      solutionCategoriesByDocumentIdLoader: { load: () => Promise.resolve([]) },
      integrationTypeLoader: { load: () => Promise.resolve(null) },
      serviceInstanceByIdLoader: { load: () => Promise.resolve(undefined) },
      subscriptionByServiceInstanceLoader: {
        load: () => Promise.resolve(null),
      },
    } as unknown as DocumentDataLoaders,
    newsFeed: {
      metadataByNewsFeedItemIdLoader: { load: () => Promise.resolve([]) },
    } as unknown as NewsFeedDataLoaders,
    serviceInstance: {
      linksByServiceInstanceLoader: { load: () => Promise.resolve([]) },
      serviceDefinitionByServiceInstanceLoader: {
        load: () => Promise.resolve(undefined),
      },
      organizationSubscribedLoader: { load: () => Promise.resolve(false) },
      capabilitiesLoader: { load: () => Promise.resolve([]) },
      userJoinedLoader: { load: () => Promise.resolve(false) },
      subscriptionsByServiceInstanceLoader: {
        load: () => Promise.resolve([]),
      },
    } as unknown as ServiceInstanceDataLoaders,
  },
} as unknown as PortalContext;

export const requestContextSimpleUserFiligran2 = {
  user: contextSimpleUserFiligran2.user,
  portalContext: contextSimpleUserFiligran2,
};
