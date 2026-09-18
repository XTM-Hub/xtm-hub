import PrivateNavigation from '@/components/menu/navigation/private/PrivateNavigation';
import { usePrivateNavigation } from '@/components/menu/navigation/private/use-private-navigation';
import { APP_PATH } from '@/utils/path/constant';
import testRender, { testRenderHook } from '@/utils/test/test-render';
import {
  OrganizationCapability,
  PlatformTrialStatusQuery,
  PortalCapability,
  RegisteredPlatformsListQuery,
  ServiceDefinitionIdentifier,
  ServiceInstancesListQuery,
} from '@graphql/generated';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const graphqlMocks = vi.hoisted(() => ({
  useServiceInstancesListQuery: Object.assign(vi.fn(), {
    getKey: vi.fn((_variables: unknown) => ['ServiceInstancesList']),
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
  usePlatformTrialStatusQuery: Object.assign(vi.fn(), {
    getKey: vi.fn((_variables: unknown) => ['PlatformTrialStatus']),
    getRootKey: vi.fn(() => ['PlatformTrialStatus']),
  }),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();

  return {
    ...actual,
    useServiceInstancesListQuery: graphqlMocks.useServiceInstancesListQuery,
    useRegisteredPlatformsListQuery:
      graphqlMocks.useRegisteredPlatformsListQuery,
    usePlatformTrialStatusQuery: graphqlMocks.usePlatformTrialStatusQuery,
  };
});

const privateNavigationServiceInstancesResponse: ServiceInstancesListQuery = {
  __typename: 'Query',
  serviceInstances: {
    __typename: 'ServiceConnection',
    edges: [
      {
        __typename: 'ServiceInstanceEdge',
        node: {
          __typename: 'ServiceInstance',
          id: 'service-instance-custom-dashboards',
          name: 'Custom dashboards',
          service_definition: {
            __typename: 'ServiceDefinition',
            identifier: ServiceDefinitionIdentifier.OpenctiCustomDashboards,
          },
          links: [],
        },
      },
      {
        __typename: 'ServiceInstanceEdge',
        node: {
          __typename: 'ServiceInstance',
          id: 'service-instance-integrations',
          name: 'Integrations',
          service_definition: {
            __typename: 'ServiceDefinition',
            identifier: ServiceDefinitionIdentifier.OpenctiIntegrations,
          },
          links: [],
        },
      },
      {
        __typename: 'ServiceInstanceEdge',
        node: {
          __typename: 'ServiceInstance',
          id: 'service-instance-openaev-scenarios',
          name: 'Scenarios',
          service_definition: {
            __typename: 'ServiceDefinition',
            identifier: ServiceDefinitionIdentifier.OpenaevScenarios,
          },
          links: [],
        },
      },
    ],
  },
};

const privateNavigationRegisteredPlatformsResponse: RegisteredPlatformsListQuery =
  {
    __typename: 'Query',
    registeredPlatforms: [
      {
        __typename: 'RegisteredPlatform',
        title: 'OpenCTI Alpha Platform',
        url: 'https://opencti.example.com',
        identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
        subscription: {
          __typename: 'SubscriptionModel',
          service_instance: {
            __typename: 'ServiceInstance',
            id: 'service-instance-opencti-alpha',
          },
        },
      },
      {
        __typename: 'RegisteredPlatform',
        title: 'OpenAEV Alpha Platform',
        url: 'https://openaev.example.com',
        identifier: ServiceDefinitionIdentifier.OpenaevRegistration,
        subscription: {
          __typename: 'SubscriptionModel',
          service_instance: {
            __typename: 'ServiceInstance',
            id: 'service-instance-openaev-alpha',
          },
        },
      },
    ],
  };

const privateNavigationPlatformTrialStatusResponse: PlatformTrialStatusQuery = {
  platformTrialStatus: {
    __typename: 'PlatformTrialStatus',
    isBlacklisted: false,
    hub_status: null,
    end_date: null,
    ongoingStandaloneTrials: [],
  },
};

const TEST_SELECTED_ORGANIZATION_ID = 'org-test-456';

const expandSection = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string
) => {
  const trigger = screen.getByRole('button', { name });
  await user.click(trigger);
  await waitFor(() => {
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
  return trigger;
};

describe('PrivateNavigation component — open={true}', () => {
  beforeEach(() => {
    graphqlMocks.useServiceInstancesListQuery.mockReturnValue({
      data: privateNavigationServiceInstancesResponse,
    });
    graphqlMocks.useRegisteredPlatformsListQuery.mockReturnValue({
      data: privateNavigationRegisteredPlatformsResponse,
    });
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: privateNavigationPlatformTrialStatusResponse,
      isLoading: false,
      isPending: false,
    });
  });

  it('renders section labels and bottom links in accordion mode', () => {
    const { container } = testRender(<PrivateNavigation open={true} />);

    expect(screen.getByText('XTMPlatform')).toBeInTheDocument();
    expect(screen.getByText('OpenCTI')).toBeInTheDocument();
    expect(screen.getByText('OpenAEV')).toBeInTheDocument();
    expect(screen.getByText('XTM One')).toBeInTheDocument();

    expect(screen.getByText('FiligranAcademy')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();

    expect(
      container.querySelectorAll('div.bg-elevation-border-strong')
    ).toHaveLength(1);
  });

  it('renders Users and Settings after Slack with a dedicated separator when user is authorized', async () => {
    const user = userEvent.setup();

    const { container } = testRender(<PrivateNavigation open={true} />, {
      me: {
        capabilities: [{ name: PortalCapability.Bypass } as never],
        selected_org_capabilities: [
          OrganizationCapability.AdministrateOrganization,
        ],
      },
    });

    const slackLink = screen.getByRole('link', { name: 'Slack' });
    const usersLink = screen.getByRole('link', {
      name: 'Users',
    });

    expect(
      slackLink.compareDocumentPosition(usersLink) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(usersLink).toHaveAttribute('href', `/${APP_PATH}/manage/user`);
    expect(
      container.querySelectorAll('div.bg-elevation-border-strong')
    ).toHaveLength(2);

    await expandSection(user, 'Settings');

    expect(screen.getByText('Parameter')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('renders XTM Platform as a link, not as an accordion trigger', () => {
    testRender(<PrivateNavigation open={true} />);

    const xtmPlatformLink = screen.getByRole('link', {
      name: 'XTMPlatform',
    });
    expect(xtmPlatformLink).toBeInTheDocument();
    expect(xtmPlatformLink).not.toHaveAttribute('aria-expanded');
  });

  it('expands OpenCTI accordion and renders expected sub-links', async () => {
    const user = userEvent.setup();
    testRender(<PrivateNavigation open={true} />);

    await expandSection(user, 'OpenCTI');

    expect(screen.getByText('CustomDashboards')).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    expect(screen.getByText('LiveDemo')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('omits services the user cannot access instead of rendering a disabled entry', async () => {
    const user = userEvent.setup();
    testRender(<PrivateNavigation open={true} />);

    await expandSection(user, 'OpenCTI');

    expect(screen.queryByText('Playbooks')).not.toBeInTheDocument();
    expect(screen.queryByText('CustomViews')).not.toBeInTheDocument();
  });

  it('renders external OpenCTI links with target and rel attributes', async () => {
    const user = userEvent.setup();
    testRender(<PrivateNavigation open={true} />);

    await expandSection(user, 'OpenCTI');

    const liveDemoLink = screen.getByRole('link', { name: 'LiveDemo' });
    expect(liveDemoLink).toHaveAttribute('target', '_blank');
    expect(liveDemoLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('applies active style when current pathname matches XTM Platform link', () => {
    vi.mocked(usePathname).mockReturnValue(`/${APP_PATH}`);
    testRender(<PrivateNavigation open={true} />);

    const xtmPlatformLink = screen.getByRole('link', {
      name: 'XTMPlatform',
    });
    expect(xtmPlatformLink.className).toContain('bg-primary/10');
  });

  it('renders nested MyProduct dropdown links for OpenCTI with tooltip url', async () => {
    const user = userEvent.setup();
    testRender(<PrivateNavigation open={true} />);

    await expandSection(user, 'OpenCTI');

    const myProductTrigger = screen.getByRole('button', {
      name: 'MyProduct',
    });
    expect(within(myProductTrigger).getByText('1')).toBeInTheDocument();

    await user.click(myProductTrigger);

    const platformLink = await screen.findByRole('link', {
      name: 'OpenCTI Alpha Platform',
    });
    expect(platformLink).toHaveAttribute(
      'href',
      '/app/service/opencti_registration/service-instance-opencti-alpha'
    );

    await user.hover(platformLink);
    expect(
      (await screen.findAllByText('https://opencti.example.com')).length
    ).toBeGreaterThan(0);
  });
});

describe('PrivateNavigation component — open={false}', () => {
  beforeEach(() => {
    graphqlMocks.useServiceInstancesListQuery.mockReturnValue({
      data: privateNavigationServiceInstancesResponse,
    });
    graphqlMocks.useRegisteredPlatformsListQuery.mockReturnValue({
      data: privateNavigationRegisteredPlatformsResponse,
    });
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: privateNavigationPlatformTrialStatusResponse,
      isLoading: false,
      isPending: false,
    });
  });

  it('renders section buttons and keeps XTM Platform as link', () => {
    testRender(<PrivateNavigation open={false} />);

    expect(screen.getByRole('button', { name: 'OpenCTI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OpenAEV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'XTM One' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'XTMPlatform' })
    ).toBeInTheDocument();
  });

  it('renders bottom link labels as sr-only in closed mode', () => {
    testRender(<PrivateNavigation open={false} />);

    const academyLabel = screen.getByText('FiligranAcademy');
    expect(academyLabel.className).toContain('sr-only');
  });

  it('keeps footer settings as popover section in closed mode when visible', async () => {
    const user = userEvent.setup();
    testRender(<PrivateNavigation open={false} />, {
      me: {
        capabilities: [{ name: PortalCapability.Bypass } as never],
      },
    });

    const settingsButton = screen.getByRole('button', { name: 'Settings' });
    await user.hover(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Parameter')).toBeInTheDocument();
    });

    await user.unhover(settingsButton);

    await waitFor(() => {
      expect(screen.queryByText('Parameter')).not.toBeInTheDocument();
    });
  });

  it('shows and hides OpenCTI popover links on hover/unhover', async () => {
    const user = userEvent.setup();
    testRender(<PrivateNavigation open={false} />);

    const openctiButton = screen.getByRole('button', { name: 'OpenCTI' });
    await user.hover(openctiButton);

    await waitFor(() => {
      expect(screen.getByText('CustomDashboards')).toBeInTheDocument();
    });

    await user.unhover(openctiButton);

    await waitFor(() => {
      expect(screen.queryByText('CustomDashboards')).not.toBeInTheDocument();
    });
  });
});

describe('PrivateNavigation hook behavior', () => {
  beforeEach(() => {
    graphqlMocks.useServiceInstancesListQuery.mockReturnValue({
      data: privateNavigationServiceInstancesResponse,
    });
    graphqlMocks.useRegisteredPlatformsListQuery.mockReturnValue({
      data: privateNavigationRegisteredPlatformsResponse,
    });
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: privateNavigationPlatformTrialStatusResponse,
      isLoading: false,
      isPending: false,
    });
  });

  it('should not render admin panel without capabilities', async () => {
    const { container } = testRender(<PrivateNavigation open={true} />);

    expect(container).toBeTruthy();
    expect(screen.queryByText('MenuLinks.Settings')).not.toBeInTheDocument();
  });

  it('builds private service links using fetched service instance ids', () => {
    const { result } = testRenderHook(() => usePrivateNavigation(), {
      me: { selected_organization_id: TEST_SELECTED_ORGANIZATION_ID },
    });

    const openctiSection = result.current.sections.find(
      (section) => section.key === 'opencti'
    );
    const openaevSection = result.current.sections.find(
      (section) => section.key === 'openaev'
    );

    const customDashboardsLink = openctiSection?.links.find((link) =>
      link.href?.includes('opencti_custom_dashboards')
    );
    const integrationsLink = openctiSection?.links.find((link) =>
      link.href?.includes('opencti_integrations')
    );
    const scenariosLink = openaevSection?.links.find((link) =>
      link.href?.includes('openaev_scenarios')
    );

    expect(customDashboardsLink?.href).toBe(
      '/app/service/opencti_custom_dashboards/service-instance-custom-dashboards'
    );
    expect(integrationsLink?.href).toBe(
      '/app/service/opencti_integrations/service-instance-integrations'
    );
    expect(scenariosLink?.href).toBe(
      '/app/service/openaev_scenarios/service-instance-openaev-scenarios'
    );
  });

  it('builds MyProduct nested entries with subLinks', () => {
    const { result } = testRenderHook(() => usePrivateNavigation(), {
      me: { selected_organization_id: TEST_SELECTED_ORGANIZATION_ID },
    });

    const openctiSection = result.current.sections.find(
      (section) => section.key === 'opencti'
    );

    const myProductLink = openctiSection?.links.find(
      (link) => link.label === 'MyProduct'
    );

    expect(myProductLink?.subLinks?.[0]).toEqual({
      label: 'OpenCTI Alpha Platform',
      href: '/app/service/opencti_registration/service-instance-opencti-alpha',
      tooltip: 'https://opencti.example.com',
    });
  });

  it('shows MyProduct numeric badges are rendered in both opened navigation and closed popover flows', async () => {
    const user = userEvent.setup();
    testRender(<PrivateNavigation open={false} />);

    const openctiButton = screen.getByRole('button', { name: 'OpenCTI' });
    await user.hover(openctiButton);

    const myProductTrigger = await screen.findByRole('button', {
      name: 'MyProduct',
    });
    expect(within(myProductTrigger).getByText('1')).toBeInTheDocument();

    await user.click(myProductTrigger);

    expect(
      await screen.findByText('OpenCTI Alpha Platform')
    ).toBeInTheDocument();
  });

  it('renders plural MyProduct label when a section has more than one linked platform', async () => {
    const user = userEvent.setup();

    graphqlMocks.useServiceInstancesListQuery.mockReturnValue({
      data: {
        ...privateNavigationServiceInstancesResponse,
      },
    });
    graphqlMocks.useRegisteredPlatformsListQuery.mockReturnValue({
      data: {
        ...privateNavigationRegisteredPlatformsResponse,
        registeredPlatforms: [
          ...privateNavigationRegisteredPlatformsResponse.registeredPlatforms,
          {
            __typename: 'RegisteredPlatform',
            title: 'OpenCTI Beta Platform',
            url: 'https://opencti-beta.example.com',
            identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
            subscription: {
              __typename: 'SubscriptionModel',
              service_instance: {
                __typename: 'ServiceInstance',
                id: 'service-instance-opencti-beta',
              },
            },
          },
        ],
      },
    });

    testRender(<PrivateNavigation open={true} />);

    await expandSection(user, 'OpenCTI');

    const myProductsTrigger = await screen.findByRole('button', {
      name: 'MyProducts',
    });
    expect(within(myProductsTrigger).getByText('2')).toBeInTheDocument();
  });
});
