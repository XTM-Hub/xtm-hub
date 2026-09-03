import { PortalContext } from '@/components/me/AppPortalContext';
import {
  getPrivateNavigationRegisteredPlatformsByIdentifier,
  getPrivateNavigationServiceHrefs,
} from '@/components/menu/navigation/private/private-navigation.utils';
import {
  BottomLink,
  NavigationConfig,
  SectionConfig,
  SectionLink,
} from '@/components/menu/navigation/shared/navigation.type';
import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { APP_PATH, XTM_PLATFORM_TRIAL_PATH } from '@/utils/path/constant';
import {
  DiamondOutlinedIcon,
  HomeIcon,
  IndividualIcon,
  LogoXtmOneIcon,
  OpenAevIconIcon,
  OpenCtiIconIcon,
  PapermapIcon,
  PostIcon,
  SchoolIcon,
  SettingsIcon,
  SlackIcon,
} from '@filigran/icon';
import {
  FeatureFlag,
  OrderingMode,
  OrganizationCapability,
  PlatformIdentifier,
  PortalCapability,
  ServiceDefinitionIdentifier,
  ServiceInstanceFilterKey,
  ServiceInstanceOrdering,
  ServiceInstancesListQueryVariables,
  TrialDeploymentsEligibilityQueryVariables,
  useRegisteredPlatformsListQuery,
  useServiceInstancesListQuery,
  useTrialDeploymentsEligibilityQuery,
} from '@graphql/generated';
import { registeredPlatformsKeys } from '@graphql/registered-platforms/registered-platforms.keys';
import { serviceInstancesKeys } from '@graphql/service-instances/service-instances.keys';
import { trialKeys } from '@graphql/trial/trial.keys';
import { useLocale, useTranslations } from 'next-intl';
import { useContext, useMemo } from 'react';

const PRIVATE_NAVIGATION_REGISTERED_PLATFORMS_VARIABLES = {
  input: {
    identifier: null,
    onlyActive: null,
    onlyTrial: null,
    hasDeployedResources: null,
  },
};

const SERVICE_LINKS = [
  [ServiceDefinitionIdentifier.OpenctiCustomDashboards, 'CustomDashboards'],
  [ServiceDefinitionIdentifier.OpenctiCustomViews, 'CustomViews'],
  [ServiceDefinitionIdentifier.OpenctiIntegrations, 'Integrations'],
  [ServiceDefinitionIdentifier.OpenctiPlaybooks, 'Playbooks'],
  [ServiceDefinitionIdentifier.OpenaevScenarios, 'Scenarios'],
  [ServiceDefinitionIdentifier.XtmPlatformRoadmap, 'XTMRoadmap'],
] as const;

const SERVICE_LINK_LABEL_KEYS = Object.fromEntries(SERVICE_LINKS);

const PRIVATE_NAVIGATION_SERVICE_IDENTIFIERS = SERVICE_LINKS.map(
  ([identifier]) => identifier
);

const PRIVATE_NAVIGATION_SERVICE_INSTANCES_VARIABLES: ServiceInstancesListQueryVariables =
  {
    count: 50,
    orderBy: ServiceInstanceOrdering.Ordering,
    orderMode: OrderingMode.Asc,
    filters: [
      {
        key: ServiceInstanceFilterKey.ServiceDefinitionIdentifier,
        value: PRIVATE_NAVIGATION_SERVICE_IDENTIFIERS,
      },
    ],
    searchTerm: null,
  };
interface SettingsLinkConfig extends SectionLink {
  restriction?: PortalCapability[];
  isVisible?: boolean;
  skipPortalCapabilityCheck?: boolean;
}

export const usePrivateNavigation = (): NavigationConfig => {
  const { me, hasCapability, hasOrganizationCapability } =
    useContext(PortalContext);
  const tMenu = useTranslations('Menu');
  const tMenuLinks = useTranslations('MenuLinks');
  const isXtmPlatformTrialEnabled = useIsFeatureEnabled(
    FeatureFlag.XtmPlatformTrial
  );
  const locale = useLocale();
  const selectedOrganizationId = me?.selected_organization_id;
  const currentOrganization = me?.organizations.find(
    (organization) => organization.id === selectedOrganizationId
  );
  const canManageUser =
    !!hasOrganizationCapability &&
    !currentOrganization?.personal_space &&
    (hasOrganizationCapability(
      OrganizationCapability.AdministrateOrganization
    ) ||
      hasOrganizationCapability(OrganizationCapability.ManageAccess));
  const isBypass = hasCapability?.(PortalCapability.Bypass) ?? false;
  const settingsLinksConfig: SettingsLinkConfig[] = [
    {
      href: `/${APP_PATH}/admin/parameters`,
      label: tMenuLinks('Parameter'),
    },
    {
      href: `/${APP_PATH}/admin/user`,
      label: tMenuLinks('Security'),
    },
    {
      href: `/${APP_PATH}/admin/use-case`,
      label: tMenuLinks('UseCase'),
    },
    {
      href: `/${APP_PATH}/admin/solution-category`,
      label: tMenuLinks('SolutionCategory'),
    },
    {
      href: `/${APP_PATH}/admin/voting-rounds`,
      label: tMenuLinks('VotingRound'),
    },
    {
      href: `/${APP_PATH}/admin/organizations`,
      label: tMenuLinks('Organization'),
    },
    {
      href: `/${APP_PATH}/admin/service`,
      label: tMenuLinks('Service'),
    },
    ...(isXtmPlatformTrialEnabled
      ? [
          {
            href: `/${APP_PATH}/admin/manage-trials`,
            label: tMenuLinks('ManageTrials'),
            restriction: [PortalCapability.ReadTrials],
          },
        ]
      : []),
    {
      href: `/${APP_PATH}/admin/opencti-trials`,
      label: tMenuLinks('OpenCTITrial'),
      restriction: [PortalCapability.ReadTrials],
    },
    {
      href: `/${APP_PATH}/admin/openaev-trials`,
      label: tMenuLinks('OpenAEVTrial'),
      restriction: [PortalCapability.ReadTrials],
    },
    {
      href: `/${APP_PATH}/admin/competitors`,
      label: tMenuLinks('Competitor'),
      restriction: [PortalCapability.ModifyCompetitors],
    },
    {
      href: `/${APP_PATH}/admin/news-feed`,
      label: tMenuLinks('NewsFeed'),
      restriction: [PortalCapability.Bypass],
    },
  ];
  const settingsLinks = settingsLinksConfig
    .filter(
      ({
        restriction = [],
        isVisible = true,
        skipPortalCapabilityCheck = false,
      }) => {
        if (!isVisible) {
          return false;
        }

        if (skipPortalCapabilityCheck) {
          return true;
        }

        if (!hasCapability) {
          return false;
        }

        return (
          restriction.some((capability) => hasCapability(capability)) ||
          isBypass
        );
      }
    )
    .map(
      ({
        restriction: _restriction,
        isVisible: _isVisible,
        skipPortalCapabilityCheck: _skipPortalCapabilityCheck,
        ...link
      }) => link
    );
  const privateNavigationTrialEligibilityVariables: TrialDeploymentsEligibilityQueryVariables =
    {
      input: {
        organizationId: selectedOrganizationId ?? '',
        platformIdentifiers: [
          PlatformIdentifier.Opencti,
          PlatformIdentifier.Openaev,
        ],
      },
    };
  const { data: serviceInstancesQueryData } = useServiceInstancesListQuery(
    portalGraphqlClient,
    PRIVATE_NAVIGATION_SERVICE_INSTANCES_VARIABLES,
    {
      queryKey: serviceInstancesKeys.list(
        PRIVATE_NAVIGATION_SERVICE_INSTANCES_VARIABLES
      ),
    }
  );
  const { data: registeredPlatformsQueryData } =
    useRegisteredPlatformsListQuery(
      portalGraphqlClient,
      PRIVATE_NAVIGATION_REGISTERED_PLATFORMS_VARIABLES,
      {
        queryKey: registeredPlatformsKeys.list(
          PRIVATE_NAVIGATION_REGISTERED_PLATFORMS_VARIABLES
        ),
      }
    );
  const {
    data: trialEligibilityData,
    isLoading: isTrialEligibilityLoading,
    isPending: isTrialEligibilityPending,
  } = useTrialDeploymentsEligibilityQuery(
    portalGraphqlClient,
    privateNavigationTrialEligibilityVariables,
    {
      enabled: !isXtmPlatformTrialEnabled && !!selectedOrganizationId,
      queryKey: trialKeys.trialDeploymentsEligibility(
        privateNavigationTrialEligibilityVariables
      ),
    }
  );
  const serviceHrefs = useMemo(
    () => getPrivateNavigationServiceHrefs(serviceInstancesQueryData),
    [serviceInstancesQueryData]
  );
  const openctiRegisteredPlatforms = useMemo(
    () =>
      getPrivateNavigationRegisteredPlatformsByIdentifier(
        registeredPlatformsQueryData,
        PlatformIdentifier.Opencti
      ),
    [registeredPlatformsQueryData]
  );
  const openaevRegisteredPlatforms = useMemo(
    () =>
      getPrivateNavigationRegisteredPlatformsByIdentifier(
        registeredPlatformsQueryData,
        PlatformIdentifier.Openaev
      ),
    [registeredPlatformsQueryData]
  );
  const trialDeployments = trialEligibilityData?.trialDeployments;
  const getStartFreeTrialLinks = (
    platformIdentifier: PlatformIdentifier,
    href: string
  ): SectionLink[] => {
    if (isXtmPlatformTrialEnabled) {
      return [];
    }
    if (trialDeployments) {
      if (trialDeployments.isBlacklisted) {
        return [];
      }
      const availableTrials = trialDeployments.availableTrials.map((trial) =>
        trial.toLowerCase()
      );
      if (!availableTrials.includes(platformIdentifier.toLowerCase())) {
        return [];
      }
      return [
        {
          href,
          label: tMenu('StartFreeTrial'),
          highlight: true,
        },
      ];
    }
    if (
      !selectedOrganizationId ||
      isTrialEligibilityLoading ||
      isTrialEligibilityPending
    ) {
      return [
        {
          label: tMenu('StartFreeTrial'),
          highlight: true,
        },
      ];
    }
    return [];
  };
  const buildServiceLink = (
    identifier: ServiceDefinitionIdentifier
  ): SectionLink[] => {
    const href = serviceHrefs.get(identifier);
    if (!href) {
      return [];
    }
    return [
      {
        href,
        label: tMenu(SERVICE_LINK_LABEL_KEYS[identifier] ?? identifier),
      },
    ];
  };
  const xtmPlatformRoadmapHref = serviceHrefs.get(
    ServiceDefinitionIdentifier.XtmPlatformRoadmap
  );
  const getMyProductLabel = (linkedPlatformsCount: number): string =>
    linkedPlatformsCount === 1 ? tMenu('MyProduct') : tMenu('MyProducts');
  const openctiMyProductLinks: SectionLink[] =
    openctiRegisteredPlatforms.length > 0
      ? [
          {
            label: getMyProductLabel(openctiRegisteredPlatforms.length),
            badge: `${openctiRegisteredPlatforms.length}`,
            subLinks: openctiRegisteredPlatforms.map((platform) => ({
              label: platform.title,
              href: `/${APP_PATH}/service/opencti_registration/${platform.serviceInstanceId}`,
              tooltip: platform.url,
            })),
          },
        ]
      : [];
  const openaevMyProductLinks: SectionLink[] =
    openaevRegisteredPlatforms.length > 0
      ? [
          {
            label: getMyProductLabel(openaevRegisteredPlatforms.length),
            badge: `${openaevRegisteredPlatforms.length}`,
            subLinks: openaevRegisteredPlatforms.map((platform) => ({
              label: platform.title,
              href: `/${APP_PATH}/service/openaev_registration/${platform.serviceInstanceId}`,
              tooltip: platform.url,
            })),
          },
        ]
      : [];
  const sections: SectionConfig[] = [
    {
      key: 'xtm-platform',
      label: tMenu('XTMPlatform'),
      icon: HomeIcon,
      pathPrefix: `/${APP_PATH}`,
      href: `/${APP_PATH}`,
      links: [],
    },
    {
      key: 'opencti',
      label: 'OpenCTI',
      icon: OpenCtiIconIcon,
      pathPrefix: `/${APP_PATH}/service/opencti`,
      links: [
        ...getStartFreeTrialLinks(
          PlatformIdentifier.Opencti,
          `/${APP_PATH}/service/opencti-free-trial`
        ),
        ...openctiMyProductLinks,
        ...buildServiceLink(
          ServiceDefinitionIdentifier.OpenctiCustomDashboards
        ),
        ...buildServiceLink(ServiceDefinitionIdentifier.OpenctiCustomViews),
        ...buildServiceLink(ServiceDefinitionIdentifier.OpenctiIntegrations),
        ...buildServiceLink(ServiceDefinitionIdentifier.OpenctiPlaybooks),
        {
          href: 'https://demo.opencti.io',
          label: tMenu('LiveDemo'),
          external: true,
        },
        {
          href: 'https://docs.opencti.io/latest/',
          label: tMenu('Documentation'),
          external: true,
        },
      ],
    },
    {
      key: 'openaev',
      label: 'OpenAEV',
      icon: OpenAevIconIcon,
      pathPrefix: `/${APP_PATH}/service/openaev`,
      links: [
        ...getStartFreeTrialLinks(
          PlatformIdentifier.Openaev,
          `/${APP_PATH}/service/openaev-free-trial`
        ),
        ...openaevMyProductLinks,
        ...buildServiceLink(ServiceDefinitionIdentifier.OpenaevScenarios),
        {
          href: 'https://demo.openaev.io',
          label: tMenu('LiveDemo'),
          external: true,
        },
        {
          href: 'https://docs.openaev.io/latest',
          label: tMenu('Documentation'),
          external: true,
        },
      ],
    },
    {
      key: 'xtm-one',
      label: 'XTM One',
      icon: LogoXtmOneIcon,
      pathPrefix: `/${locale}/cybersecurity-solutions/xtm-one`,
      links: [
        {
          href: 'https://filigran.io/platform/xtm-one/',
          label: tMenu('About'),
          external: true,
        },
        { label: tMenu('AICatalog'), badge: tMenu('ComingSoon') },
      ],
    },
  ];
  const footerSections: SectionConfig[] = [
    ...(canManageUser
      ? [
          {
            key: 'users',
            label: tMenuLinks('Users'),
            icon: IndividualIcon,
            pathPrefix: `/${APP_PATH}/manage/user`,
            href: `/${APP_PATH}/manage/user`,
            links: [],
          },
        ]
      : []),
    ...(settingsLinks.length > 0
      ? [
          {
            key: 'settings',
            label: tMenuLinks('Settings'),
            icon: SettingsIcon,
            pathPrefix: `/${APP_PATH}/admin/`,
            links: settingsLinks,
          },
        ]
      : []),
  ];
  const bottomLinks: BottomLink[] = [
    ...(xtmPlatformRoadmapHref
      ? [
          {
            key: 'xtm-platform-roadmap',
            href: xtmPlatformRoadmapHref,
            icon: PapermapIcon,
            label: tMenu('XTMRoadmap'),
          },
        ]
      : []),
    {
      key: 'filigran-academy',
      href: 'https://academy.filigran.io/',
      icon: SchoolIcon,
      label: tMenu('FiligranAcademy'),
      external: true,
    },
    {
      key: 'filigran-blog',
      href: 'https://filigran.io/our-blog/',
      icon: PostIcon,
      label: tMenu('Blog'),
      external: true,
    },
    {
      key: 'slack',
      href: 'https://filigran-community.slack.com',
      icon: SlackIcon,
      label: tMenu('Slack'),
      external: true,
    },
    ...(isXtmPlatformTrialEnabled
      ? [
          {
            key: 'xtm-platform-trial',
            href: XTM_PLATFORM_TRIAL_PATH,
            icon: DiamondOutlinedIcon,
            label: tMenu('XTMPlatformTrial'),
            highlight: true,
          },
        ]
      : []),
  ];
  return { sections, bottomLinks, footerSections };
};
