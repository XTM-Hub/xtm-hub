import { PortalContext } from '@/components/me/AppPortalContext';
import {
  getPrivateNavigationRegisteredPlatformsByIdentifier,
  getPrivateNavigationServiceHrefs,
} from '@/components/menu/navigation/private/private-navigation.utils';
import {
  FILIGRAN_BLOG_URL,
  OPENCRQ_ABOUT_URL,
  XTM_ONE_ABOUT_URL,
} from '@/components/menu/navigation/shared/navigation-external-links';
import {
  BottomLink,
  NavigationConfig,
  SectionConfig,
  SectionLink,
  SectionSubLink,
} from '@/components/menu/navigation/shared/navigation.type';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { APP_PATH, XTM_PLATFORM_TRIAL_PATH } from '@/utils/path/constant';
import {
  DiamondOutlinedIcon,
  HomeIcon,
  IndividualIcon,
  LogoXtmOneIcon,
  OpenAevIconIcon,
  OpenCtiIconIcon,
  OpenGrcIcon,
  PapermapIcon,
  PostIcon,
  SchoolIcon,
  SettingsIcon,
  SlackIcon,
} from '@filigran/icon';
import {
  OrderingMode,
  OrganizationCapability,
  PlatformIdentifier,
  PlatformTrialStatusQueryVariables,
  PortalCapability,
  ServiceDefinitionIdentifier,
  ServiceInstanceFilterKey,
  ServiceInstanceOrdering,
  ServiceInstancesListQueryVariables,
  usePlatformTrialStatusQuery,
  useRegisteredPlatformsListQuery,
  useServiceInstancesListQuery,
} from '@graphql/generated';
import { registeredPlatformsKeys } from '@graphql/registered-platforms/registered-platforms.keys';
import { serviceInstancesKeys } from '@graphql/service-instances/service-instances.keys';
import { platformTrialKeys } from '@graphql/trial/trial.keys';
import { useLocale } from 'next-intl';
import { useContext, useMemo } from 'react';

const PRIVATE_NAVIGATION_REGISTERED_PLATFORMS_VARIABLES = {
  input: {
    identifier: null,
    onlyActive: true,
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
type SettingsLinkConfig = SectionSubLink & {
  restriction?: PortalCapability[];
  isVisible?: boolean;
  skipPortalCapabilityCheck?: boolean;
};

export const usePrivateNavigation = (): NavigationConfig => {
  const { me, hasCapability, hasOrganizationCapability } =
    useContext(PortalContext);
  const tMenu = useTranslate('Menu');
  const tMenuLinks = useTranslate('MenuLinks');
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
      analyticsId: 'nav_admin_parameters_open',
      label: tMenuLinks('Parameter'),
    },
    {
      href: `/${APP_PATH}/admin/user`,
      analyticsId: 'nav_admin_users_open',
      label: tMenuLinks('Security'),
    },
    {
      href: `/${APP_PATH}/admin/roles`,
      analyticsId: 'nav_admin_roles_open',
      label: tMenuLinks('Roles'),
      restriction: [PortalCapability.Bypass],
    },
    {
      href: `/${APP_PATH}/admin/use-case`,
      analyticsId: 'nav_admin_use_cases_open',
      label: tMenuLinks('UseCase'),
    },
    {
      href: `/${APP_PATH}/admin/solution-category`,
      analyticsId: 'nav_admin_solution_categories_open',
      label: tMenuLinks('SolutionCategory'),
    },
    {
      href: `/${APP_PATH}/admin/voting-rounds`,
      analyticsId: 'nav_admin_voting_rounds_open',
      label: tMenuLinks('VotingRound'),
    },
    {
      href: `/${APP_PATH}/admin/organizations`,
      analyticsId: 'nav_admin_organizations_open',
      label: tMenuLinks('Organization'),
    },
    {
      href: `/${APP_PATH}/admin/service`,
      analyticsId: 'nav_admin_services_open',
      label: tMenuLinks('Service'),
    },
    {
      href: `/${APP_PATH}/admin/manage-trials`,
      analyticsId: 'nav_admin_trials_open',
      label: tMenuLinks('ManageTrials'),
      restriction: [PortalCapability.ReadTrials],
    },
    {
      href: `/${APP_PATH}/admin/csm-board`,
      analyticsId: 'nav_admin_csm_board_open',
      label: tMenuLinks('CSMBoard'),
      restriction: [PortalCapability.ReadSaasMetrics],
    },
    {
      href: `/${APP_PATH}/admin/competitors`,
      analyticsId: 'nav_admin_competitors_open',
      label: tMenuLinks('Competitor'),
      restriction: [PortalCapability.ModifyCompetitors],
    },
    {
      href: `/${APP_PATH}/admin/news-feed`,
      analyticsId: 'nav_admin_news_feed_open',
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
  const platformTrialStatusVariables: PlatformTrialStatusQueryVariables = {
    organizationId: selectedOrganizationId ?? '',
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
  const { data: platformTrialStatusData } = usePlatformTrialStatusQuery(
    portalGraphqlClient,
    platformTrialStatusVariables,
    {
      enabled: !!selectedOrganizationId,
      queryKey: platformTrialKeys.platformTrialStatus(
        platformTrialStatusVariables
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
  const xtmoneRegisteredPlatforms = useMemo(
    () =>
      getPrivateNavigationRegisteredPlatformsByIdentifier(
        registeredPlatformsQueryData,
        PlatformIdentifier.Xtmone
      ),
    [registeredPlatformsQueryData]
  );
  const canShowXtmPlatformTrialLink =
    !platformTrialStatusData?.platformTrialStatus.isBlacklisted;
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
        analyticsId: 'nav_library_open',
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
            analyticsId: 'nav_my_products_section_toggle',
            badge: `${openctiRegisteredPlatforms.length}`,
            subLinks: openctiRegisteredPlatforms.map((platform) => ({
              label: platform.title,
              href: `/${APP_PATH}/service/opencti_registration/${platform.serviceInstanceId}`,
              analyticsId: 'nav_connected_platform_open',
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
            analyticsId: 'nav_my_products_section_toggle',
            badge: `${openaevRegisteredPlatforms.length}`,
            subLinks: openaevRegisteredPlatforms.map((platform) => ({
              label: platform.title,
              href: `/${APP_PATH}/service/openaev_registration/${platform.serviceInstanceId}`,
              analyticsId: 'nav_connected_platform_open',
              tooltip: platform.url,
            })),
          },
        ]
      : [];
  const xtmoneMyProductLinks: SectionLink[] =
    xtmoneRegisteredPlatforms.length > 0
      ? [
          {
            label: getMyProductLabel(xtmoneRegisteredPlatforms.length),
            analyticsId: 'nav_my_products_section_toggle',
            badge: `${xtmoneRegisteredPlatforms.length}`,
            subLinks: xtmoneRegisteredPlatforms.map((platform) => ({
              label: platform.title,
              href: `/${APP_PATH}/service/xtmone_registration/${platform.serviceInstanceId}`,
              analyticsId: 'nav_connected_platform_open',
              tooltip: platform.url,
            })),
          },
        ]
      : [];
  const sections: SectionConfig[] = [
    {
      key: 'xtm-platform',
      analyticsId: 'nav_xtm_platform_open',
      label: tMenu('XTMPlatform'),
      icon: HomeIcon,
      pathPrefix: `/${APP_PATH}`,
      href: `/${APP_PATH}`,
      links: [],
    },
    {
      key: 'opencti',
      analyticsId: 'nav_opencti_section_toggle',
      product: PlatformIdentifier.Opencti,
      label: 'OpenCTI',
      icon: OpenCtiIconIcon,
      pathPrefix: `/${APP_PATH}/service/opencti`,
      links: [
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
          analyticsId: 'nav_live_demo_open',
        },
        {
          href: 'https://docs.opencti.io/latest/',
          label: tMenu('Documentation'),
          external: true,
          analyticsId: 'nav_documentation_open',
        },
      ],
    },
    {
      key: 'openaev',
      analyticsId: 'nav_openaev_section_toggle',
      product: PlatformIdentifier.Openaev,
      label: 'OpenAEV',
      icon: OpenAevIconIcon,
      pathPrefix: `/${APP_PATH}/service/openaev`,
      links: [
        ...openaevMyProductLinks,
        ...buildServiceLink(ServiceDefinitionIdentifier.OpenaevScenarios),
        {
          href: 'https://demo.openaev.io',
          label: tMenu('LiveDemo'),
          external: true,
          analyticsId: 'nav_live_demo_open',
        },
        {
          href: 'https://docs.openaev.io/latest',
          label: tMenu('Documentation'),
          external: true,
          analyticsId: 'nav_documentation_open',
        },
      ],
    },
    {
      key: 'xtm-one',
      analyticsId: 'nav_xtm_one_section_toggle',
      product: PlatformIdentifier.Xtmone,
      label: 'XTM One',
      icon: LogoXtmOneIcon,
      pathPrefix: `/${APP_PATH}/service/xtmone`,
      links: [
        ...xtmoneMyProductLinks,
        {
          href: 'https://demo.xtmone.io/login',
          label: tMenu('LiveDemo'),
          external: true,
          analyticsId: 'nav_live_demo_open',
        },
        {
          href: 'https://docs.xtmone.io/',
          label: tMenu('Documentation'),
          external: true,
          analyticsId: 'nav_documentation_open',
        },
        {
          href: XTM_ONE_ABOUT_URL,
          label: tMenu('About'),
          external: true,
          analyticsId: 'nav_product_about_open',
        },
        { label: tMenu('AICatalog'), badge: tMenu('ComingSoon') },
      ],
    },
    {
      key: 'opencrq',
      analyticsId: 'nav_opencrq_section_toggle',
      label: 'OpenCRQ',
      icon: OpenGrcIcon,
      pathPrefix: `/${locale}/cybersecurity-solutions/opencrq`,
      links: [
        {
          href: OPENCRQ_ABOUT_URL,
          label: tMenu('About'),
          external: true,
          analyticsId: 'nav_product_about_open',
          badge: tMenu('ComingSoon'),
        },
      ],
    },
  ];
  const footerSections: SectionConfig[] = [
    ...(canManageUser
      ? ([
          {
            key: 'users',
            analyticsId: 'nav_users_open',
            label: tMenuLinks('Users'),
            icon: IndividualIcon,
            pathPrefix: `/${APP_PATH}/manage/user`,
            href: `/${APP_PATH}/manage/user`,
            links: [],
          },
        ] satisfies SectionConfig[])
      : []),
    ...(settingsLinks.length > 0
      ? ([
          {
            key: 'settings',
            analyticsId: 'nav_settings_section_toggle',
            label: tMenuLinks('Settings'),
            icon: SettingsIcon,
            pathPrefix: `/${APP_PATH}/admin/`,
            links: settingsLinks,
          },
        ] satisfies SectionConfig[])
      : []),
  ];
  const bottomLinks: BottomLink[] = [
    ...(xtmPlatformRoadmapHref
      ? ([
          {
            key: 'xtm-platform-roadmap',
            analyticsId: 'nav_roadmap_open',
            href: xtmPlatformRoadmapHref,
            icon: PapermapIcon,
            label: tMenu('XTMRoadmap'),
          },
        ] satisfies BottomLink[])
      : []),
    {
      key: 'filigran-academy',
      analyticsId: 'nav_academy_open',
      href: 'https://academy.filigran.io/',
      icon: SchoolIcon,
      label: tMenu('FiligranAcademy'),
      external: true,
    },
    {
      key: 'filigran-blog',
      analyticsId: 'nav_blog_open',
      href: FILIGRAN_BLOG_URL,
      icon: PostIcon,
      label: tMenu('Blog'),
      external: true,
    },
    {
      key: 'slack',
      analyticsId: 'nav_slack_join',
      href: 'https://filigran-community.slack.com',
      icon: SlackIcon,
      label: tMenu('Slack'),
      external: true,
    },
    ...(canShowXtmPlatformTrialLink
      ? ([
          {
            key: 'xtm-platform-trial',
            analyticsId: 'nav_trial_open',
            href: XTM_PLATFORM_TRIAL_PATH,
            icon: DiamondOutlinedIcon,
            label: tMenu('XTMPlatformTrial'),
            highlight: true,
          },
        ] satisfies BottomLink[])
      : []),
  ];
  return { sections, bottomLinks, footerSections };
};
