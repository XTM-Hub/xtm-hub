import { PortalContext } from '@/components/me/AppPortalContext';
import {
  getPrivateNavigationRegisteredPlatformsByIdentifier,
  getPrivateNavigationServiceHrefs,
} from '@/components/menu/navigation/private/private-navigation.utils';
import { usePrivateNavigation } from '@/components/menu/navigation/private/use-private-navigation';
import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { APP_PATH } from '@/utils/path/constant';
import { meContext_fragment$data } from '@generated/meContext_fragment.graphql';
import {
  OrderingMode,
  OrganizationCapability,
  PlatformIdentifier,
  PortalCapability,
  ServiceDefinitionIdentifier,
  ServiceInstanceFilterKey,
  ServiceInstanceOrdering,
} from '@graphql/generated';
import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const graphqlMocks = vi.hoisted(() => ({
  useServiceInstancesListQuery: Object.assign(vi.fn(), {
    getKey: vi.fn((variables: unknown) => ['ServiceInstancesList', variables]),
    getRootKey: vi.fn(() => ['ServiceInstancesList']),
  }),
  useRegisteredPlatformsListQuery: Object.assign(vi.fn(), {
    getKey: vi.fn((variables?: unknown) =>
      variables === undefined
        ? ['RegisteredPlatformsList']
        : ['RegisteredPlatformsList', variables]
    ),
    getRootKey: vi.fn(() => ['RegisteredPlatformsList']),
  }),
  useTrialDeploymentsEligibilityQuery: Object.assign(vi.fn(), {
    getKey: vi.fn((variables: unknown) => [
      'TrialDeploymentsEligibility',
      variables,
    ]),
    getRootKey: vi.fn(() => ['TrialDeploymentsEligibility']),
  }),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();

  return {
    ...actual,
    useServiceInstancesListQuery: graphqlMocks.useServiceInstancesListQuery,
    useRegisteredPlatformsListQuery:
      graphqlMocks.useRegisteredPlatformsListQuery,
    useTrialDeploymentsEligibilityQuery:
      graphqlMocks.useTrialDeploymentsEligibilityQuery,
  };
});

vi.mock(
  '@/components/menu/navigation/private/private-navigation.utils',
  () => ({
    getPrivateNavigationServiceHrefs: vi.fn(),
    getPrivateNavigationRegisteredPlatformsByIdentifier: vi.fn(),
  })
);

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

type RenderOptions = {
  selectedOrganizationId?: string;
  capabilities?: PortalCapability[];
  organizationCapabilities?: OrganizationCapability[];
  selectedOrganizationPersonalSpace?: boolean;
};

const buildHasCapability = (capabilities: PortalCapability[]) => {
  return (capability: PortalCapability) =>
    capabilities.includes(PortalCapability.Bypass) ||
    capabilities.includes(capability);
};

const buildHasOrganizationCapability = (
  capabilities: OrganizationCapability[]
) => {
  return (capability: OrganizationCapability) =>
    capabilities.includes(capability);
};

const renderUsePrivateNavigation = ({
  selectedOrganizationId,
  capabilities = [],
  organizationCapabilities = [],
  selectedOrganizationPersonalSpace = false,
}: RenderOptions = {}) => {
  const me = selectedOrganizationId
    ? ({
        selected_organization_id: selectedOrganizationId,
        organizations: [
          {
            id: selectedOrganizationId,
            personal_space: selectedOrganizationPersonalSpace,
          },
        ],
      } as Partial<meContext_fragment$data> as meContext_fragment$data)
    : undefined;

  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(
      PortalContext.Provider,
      {
        value: {
          me,
          hasCapability: buildHasCapability(capabilities),
          hasOrganizationCapability: buildHasOrganizationCapability(
            organizationCapabilities
          ),
        },
      },
      children
    );

  return renderHook(() => usePrivateNavigation(), { wrapper });
};

const getSection = (
  sections: ReturnType<typeof usePrivateNavigation>['sections'],
  key: string
) => sections.find((section) => section.key === key);

const getFooterSection = (
  footerSections: ReturnType<
    typeof usePrivateNavigation
  >['footerSections'] = [],
  key: string
) => footerSections.find((section) => section.key === key);

describe('usePrivateNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
    vi.mocked(getPrivateNavigationServiceHrefs).mockReturnValue(new Map());
    vi.mocked(
      getPrivateNavigationRegisteredPlatformsByIdentifier
    ).mockReturnValue([]);

    graphqlMocks.useServiceInstancesListQuery.mockReturnValue({
      data: undefined,
    });

    graphqlMocks.useRegisteredPlatformsListQuery.mockReturnValue({
      data: undefined,
    });

    graphqlMocks.useTrialDeploymentsEligibilityQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isPending: false,
    });
  });

  it('returns base sections and bottom links with translated labels', () => {
    const { result } = renderUsePrivateNavigation({
      selectedOrganizationId: 'org-1',
    });

    expect(result.current.sections.map((section) => section.key)).toEqual([
      'xtm-platform',
      'opencti',
      'openaev',
      'xtm-one',
    ]);
    expect(result.current.footerSections).toEqual([]);
    expect(result.current.bottomLinks).toEqual([
      {
        key: 'filigran-academy',
        href: 'https://academy.filigran.io/',
        icon: expect.any(Function),
        label: 'FiligranAcademy',
        external: true,
      },
      {
        key: 'filigran-blog',
        href: 'https://filigran.io/our-blog/',
        icon: expect.any(Function),
        label: 'Blog',
        external: true,
      },
      {
        key: 'slack',
        href: 'https://filigran-community.slack.com',
        icon: expect.any(Function),
        label: 'Slack',
        external: true,
      },
      {
        key: 'xtm-platform-trial',
        href: `/${APP_PATH}/service/xtm-platform-trial`,
        icon: expect.any(Function),
        label: 'XTMPlatformTrial',
        highlight: true,
      },
    ]);
  });

  it('hides the xtm-platform-trial bottom link when the feature flag is off', () => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue(false);

    const { result } = renderUsePrivateNavigation({
      selectedOrganizationId: 'org-1',
    });

    expect(result.current.bottomLinks.map((link) => link.key)).not.toContain(
      'xtm-platform-trial'
    );
  });

  it('adds settings as a footer section when user is authorized', () => {
    const { result } = renderUsePrivateNavigation({
      selectedOrganizationId: 'org-1',
      capabilities: [PortalCapability.Bypass],
    });

    expect(result.current.sections.map((section) => section.key)).toEqual([
      'xtm-platform',
      'opencti',
      'openaev',
      'xtm-one',
    ]);
    expect(
      result.current.footerSections?.map((section) => section.key)
    ).toEqual(['settings']);
  });

  it('hides settings footer section when user has no authorized settings links', () => {
    const { result } = renderUsePrivateNavigation({
      selectedOrganizationId: 'org-1',
      capabilities: [],
    });

    expect(
      getFooterSection(result.current.footerSections, 'settings')
    ).toBeUndefined();
  });

  it.each`
    capabilities                                                         | expectedSettingsLabels
    ${[PortalCapability.Bypass]}                                         | ${['Parameter', 'Security', 'UseCase', 'SolutionCategory', 'VotingRound', 'Organization', 'Service', 'ManageTrials', 'OpenCTITrial', 'OpenAEVTrial', 'Competitor', 'NewsFeed']}
    ${[PortalCapability.ReadTrials]}                                     | ${['ManageTrials', 'OpenCTITrial', 'OpenAEVTrial']}
    ${[PortalCapability.ModifyCompetitors]}                              | ${['Competitor']}
    ${[PortalCapability.ReadTrials, PortalCapability.ModifyCompetitors]} | ${['ManageTrials', 'OpenCTITrial', 'OpenAEVTrial', 'Competitor']}
  `(
    'filters settings links according to portal capabilities $capabilities',
    ({ capabilities, expectedSettingsLabels }) => {
      const { result } = renderUsePrivateNavigation({
        selectedOrganizationId: 'org-1',
        capabilities,
      });

      const settingsSection = getSection(result.current.sections, 'settings');
      const settingsFooterSection = getFooterSection(
        result.current.footerSections,
        'settings'
      );

      expect(settingsSection).toBeUndefined();
      expect(settingsFooterSection?.links.map((link) => link.label)).toEqual(
        expectedSettingsLabels
      );
    }
  );

  it('renders roadmap bottom link when roadmap service href exists', () => {
    const roadmapHref = '/app/service/xtm-platform-map';
    const serviceHrefs = new Map<ServiceDefinitionIdentifier, string>([
      [ServiceDefinitionIdentifier.XtmPlatformRoadmap, roadmapHref],
    ]);
    vi.mocked(getPrivateNavigationServiceHrefs).mockReturnValue(serviceHrefs);

    const { result } = renderUsePrivateNavigation({
      selectedOrganizationId: 'org-1',
    });

    expect(result.current.bottomLinks).toContainEqual({
      key: 'xtm-platform-roadmap',
      href: roadmapHref,
      icon: expect.any(Function),
      label: 'XTMRoadmap',
    });
  });

  it('does not render roadmap bottom link when roadmap service href is missing', () => {
    vi.mocked(getPrivateNavigationServiceHrefs).mockReturnValue(
      new Map<ServiceDefinitionIdentifier, string>()
    );

    const { result } = renderUsePrivateNavigation({
      selectedOrganizationId: 'org-1',
    });

    expect(
      result.current.bottomLinks.find(
        (link) => link.key === 'xtm-platform-roadmap'
      )
    ).toBeUndefined();
    expect(result.current.bottomLinks).toEqual([
      {
        key: 'filigran-academy',
        href: 'https://academy.filigran.io/',
        icon: expect.any(Function),
        label: 'FiligranAcademy',
        external: true,
      },
      {
        key: 'filigran-blog',
        href: 'https://filigran.io/our-blog/',
        icon: expect.any(Function),
        label: 'Blog',
        external: true,
      },
      {
        key: 'slack',
        href: 'https://filigran-community.slack.com',
        icon: expect.any(Function),
        label: 'Slack',
        external: true,
      },
      {
        key: 'xtm-platform-trial',
        href: `/${APP_PATH}/service/xtm-platform-trial`,
        icon: expect.any(Function),
        label: 'XTMPlatformTrial',
        highlight: true,
      },
    ]);
  });

  it('does not include StartFreeTrial links when the XTM Platform trial flag is enabled', () => {
    const { result } = renderUsePrivateNavigation({
      selectedOrganizationId: 'org-1',
    });

    const openctiSection = getSection(result.current.sections, 'opencti');
    const openaevSection = getSection(result.current.sections, 'openaev');

    expect(
      openctiSection?.links.some((link) => link.label === 'StartFreeTrial')
    ).toBe(false);
    expect(
      openaevSection?.links.some((link) => link.label === 'StartFreeTrial')
    ).toBe(false);
  });

  it('includes StartFreeTrial links when the XTM Platform trial flag is disabled', () => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue(false);
    graphqlMocks.useTrialDeploymentsEligibilityQuery.mockReturnValue({
      data: {
        trialDeployments: {
          availableTrials: [
            PlatformIdentifier.Opencti,
            PlatformIdentifier.Openaev,
          ],
          isBlacklisted: false,
        },
      },
      isLoading: false,
      isPending: false,
    });

    const { result } = renderUsePrivateNavigation({
      selectedOrganizationId: 'org-1',
    });

    const openctiSection = getSection(result.current.sections, 'opencti');
    const openaevSection = getSection(result.current.sections, 'openaev');

    expect(
      openctiSection?.links.some(
        (link) => link.href === '/app/service/opencti-free-trial'
      )
    ).toBe(true);
    expect(
      openaevSection?.links.some(
        (link) => link.href === '/app/service/openaev-free-trial'
      )
    ).toBe(true);
  });

  it.each([
    {
      selectedOrganizationId: 'org-1',
      isXtmPlatformTrialEnabled: true,
      expectedEnabled: false,
      expectedOrganizationId: 'org-1',
    },
    {
      selectedOrganizationId: 'org-1',
      isXtmPlatformTrialEnabled: false,
      expectedEnabled: true,
      expectedOrganizationId: 'org-1',
    },
    {
      selectedOrganizationId: undefined,
      isXtmPlatformTrialEnabled: false,
      expectedEnabled: false,
      expectedOrganizationId: '',
    },
  ])(
    'calls GraphQL hooks with expected variables for selected org $selectedOrganizationId when the XTM Platform trial flag is $isXtmPlatformTrialEnabled',
    ({
      selectedOrganizationId,
      isXtmPlatformTrialEnabled,
      expectedEnabled,
      expectedOrganizationId,
    }) => {
      vi.mocked(useIsFeatureEnabled).mockReturnValue(isXtmPlatformTrialEnabled);
      renderUsePrivateNavigation({ selectedOrganizationId });

      const expectedServiceVariables = {
        count: 50,
        orderBy: ServiceInstanceOrdering.Ordering,
        orderMode: OrderingMode.Asc,
        filters: [
          {
            key: ServiceInstanceFilterKey.ServiceDefinitionIdentifier,
            value: [
              ServiceDefinitionIdentifier.OpenctiCustomDashboards,
              ServiceDefinitionIdentifier.OpenctiCustomViews,
              ServiceDefinitionIdentifier.OpenctiIntegrations,
              ServiceDefinitionIdentifier.OpenctiPlaybooks,
              ServiceDefinitionIdentifier.OpenaevScenarios,
              ServiceDefinitionIdentifier.XtmPlatformRoadmap,
            ],
          },
        ],
        searchTerm: null,
      };
      const expectedTrialVariables = {
        input: {
          organizationId: expectedOrganizationId,
          platformIdentifiers: [
            PlatformIdentifier.Opencti,
            PlatformIdentifier.Openaev,
          ],
        },
      };

      expect(graphqlMocks.useServiceInstancesListQuery).toHaveBeenCalledWith(
        portalGraphqlClient,
        expectedServiceVariables,
        {
          queryKey: ['ServiceInstancesList', expectedServiceVariables],
        }
      );

      expect(graphqlMocks.useRegisteredPlatformsListQuery).toHaveBeenCalledWith(
        portalGraphqlClient,
        {
          input: {
            identifier: null,
            onlyActive: null,
            onlyTrial: null,
            hasDeployedResources: null,
          },
        },
        {
          queryKey: [
            'RegisteredPlatformsList',
            {
              input: {
                identifier: null,
                onlyActive: null,
                onlyTrial: null,
                hasDeployedResources: null,
              },
            },
          ],
        }
      );

      expect(
        graphqlMocks.useTrialDeploymentsEligibilityQuery
      ).toHaveBeenCalledWith(portalGraphqlClient, expectedTrialVariables, {
        enabled: expectedEnabled,
        queryKey: ['TrialDeploymentsEligibility', expectedTrialVariables],
      });
    }
  );

  it('includes MyProduct nested links as first link in OpenCTI and OpenAEV sections when registrations exist', () => {
    vi.mocked(getPrivateNavigationRegisteredPlatformsByIdentifier)
      .mockReturnValueOnce([
        {
          serviceInstanceId: 'opencti-service-instance-id',
          title: 'OpenCTI Production Platform',
          url: 'https://opencti.example.com',
        },
      ])
      .mockReturnValueOnce([
        {
          serviceInstanceId: 'openaev-service-instance-id',
          title: 'OpenAEV Production Platform',
          url: 'https://openaev.example.com',
        },
      ]);

    const { result } = renderUsePrivateNavigation({
      selectedOrganizationId: 'org-1',
    });

    const openctiSection = getSection(result.current.sections, 'opencti');
    const openaevSection = getSection(result.current.sections, 'openaev');

    expect(openctiSection?.links[0]).toEqual({
      label: 'MyProduct',
      badge: '1',
      subLinks: [
        {
          label: 'OpenCTI Production Platform',
          href: '/app/service/opencti_registration/opencti-service-instance-id',
          tooltip: 'https://opencti.example.com',
        },
      ],
    });

    expect(openaevSection?.links[0]).toEqual({
      label: 'MyProduct',
      badge: '1',
      subLinks: [
        {
          label: 'OpenAEV Production Platform',
          href: '/app/service/openaev_registration/openaev-service-instance-id',
          tooltip: 'https://openaev.example.com',
        },
      ],
    });
  });

  it('uses plural MyProduct label when more than one platform is linked', () => {
    vi.mocked(getPrivateNavigationRegisteredPlatformsByIdentifier)
      .mockReturnValueOnce([
        {
          serviceInstanceId: 'opencti-service-instance-id-1',
          title: 'OpenCTI Production Platform 1',
          url: 'https://opencti-1.example.com',
        },
        {
          serviceInstanceId: 'opencti-service-instance-id-2',
          title: 'OpenCTI Production Platform 2',
          url: 'https://opencti-2.example.com',
        },
      ])
      .mockReturnValueOnce([]);

    const { result } = renderUsePrivateNavigation({
      selectedOrganizationId: 'org-1',
    });

    const openctiSection = getSection(result.current.sections, 'opencti');

    expect(openctiSection?.links[0]).toMatchObject({
      label: 'MyProducts',
      badge: '2',
    });
  });

  it('hides MyProduct links when no registration exists for a section', () => {
    const { result } = renderUsePrivateNavigation({
      selectedOrganizationId: 'org-1',
    });

    const openctiSection = getSection(result.current.sections, 'opencti');
    const openaevSection = getSection(result.current.sections, 'openaev');

    expect(
      openctiSection?.links.some((link) => link.label === 'MyProduct')
    ).toBe(false);
    expect(
      openctiSection?.links.some((link) => link.label === 'MyProducts')
    ).toBe(false);
    expect(
      openaevSection?.links.some((link) => link.label === 'MyProduct')
    ).toBe(false);
    expect(
      openaevSection?.links.some((link) => link.label === 'MyProducts')
    ).toBe(false);
  });

  it.each`
    organizationCapabilities
    ${[OrganizationCapability.AdministrateOrganization]}
    ${[OrganizationCapability.ManageAccess]}
  `(
    'shows Users and Settings as footer sections when org capability allows it',
    ({ organizationCapabilities }) => {
      const { result } = renderUsePrivateNavigation({
        selectedOrganizationId: 'org-1',
        capabilities: [PortalCapability.Bypass],
        organizationCapabilities,
        selectedOrganizationPersonalSpace: false,
      });

      expect(result.current.sections.map((section) => section.key)).toEqual([
        'xtm-platform',
        'opencti',
        'openaev',
        'xtm-one',
      ]);
      expect(
        result.current.footerSections?.map((section) => section.key)
      ).toEqual(['users', 'settings']);

      const usersSection = getFooterSection(
        result.current.footerSections,
        'users'
      );
      const settingsSection = getFooterSection(
        result.current.footerSections,
        'settings'
      );

      expect(usersSection).toMatchObject({
        key: 'users',
        label: 'Users',
        href: `/${APP_PATH}/manage/user`,
        pathPrefix: `/${APP_PATH}/manage/user`,
      });
      expect(getSection(result.current.sections, 'users')).toBeUndefined();
      expect(
        settingsSection?.links.some((link) => link.label === 'Users')
      ).toBe(false);
    }
  );

  it('hides Users footer section when selected organization is a personal space', () => {
    const { result } = renderUsePrivateNavigation({
      selectedOrganizationId: 'org-1',
      organizationCapabilities: [
        OrganizationCapability.AdministrateOrganization,
      ],
      selectedOrganizationPersonalSpace: true,
      capabilities: [PortalCapability.Bypass],
    });

    expect(
      getFooterSection(result.current.footerSections, 'users')
    ).toBeUndefined();
  });

  it('hides Users footer section when organization capabilities are missing', () => {
    const { result } = renderUsePrivateNavigation({
      selectedOrganizationId: 'org-1',
      organizationCapabilities: [],
      selectedOrganizationPersonalSpace: false,
      capabilities: [PortalCapability.Bypass],
    });

    expect(
      getFooterSection(result.current.footerSections, 'users')
    ).toBeUndefined();
  });
});
