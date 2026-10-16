import ServiceListHeaderButtons from '@/components/service/components/header/ServiceListHeaderButtons';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import {
  IntegrationType,
  OrganizationCapability,
  PortalCapability,
  ServiceRestriction,
} from '@graphql/generated';
import { createMockEnvironment } from 'relay-test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const DASHBOARDS_TRANSLATION_KEY = 'Service.OpenctiCustomDashboards';
const INTEGRATIONS_TRANSLATION_KEY = 'Service.OpenctiIntegrations';

const { mockUseServiceContext, mockSetIntegrationType } = vi.hoisted(() => ({
  mockUseServiceContext: vi.fn(),
  mockSetIntegrationType: vi.fn(),
}));
const { mockUseServiceCapability } = vi.hoisted(() => ({
  mockUseServiceCapability: vi.fn(),
}));
const { mockUseServiceCapabilityWithSubscriptionId } = vi.hoisted(() => ({
  mockUseServiceCapabilityWithSubscriptionId: vi.fn(),
}));

vi.mock('@/components/service/components/ServiceContext', () => ({
  useServiceContext: mockUseServiceContext,
}));
vi.mock('@/hooks/use-service-capability', () => ({
  default: mockUseServiceCapability,
  useServiceCapabilityWithSubscriptionId:
    mockUseServiceCapabilityWithSubscriptionId,
}));

const buildServiceContext = (overrides = {}) => ({
  serviceInstance: {
    id: 'service-1',
    capabilities: [],
  },
  translationKey: 'Service.OpenctiCustomDashboards',
  type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
  setIntegrationType: mockSetIntegrationType,
  ...overrides,
});

describe('ServiceListHeaderButtons', () => {
  beforeEach(() => {
    mockUseServiceContext.mockReturnValue(buildServiceContext());
    mockUseServiceCapability.mockImplementation(
      (
        capability: ServiceRestriction,
        serviceInstance?: { capabilities?: ServiceRestriction[] }
      ) => {
        return serviceInstance?.capabilities?.includes(capability) ?? false;
      }
    );
    mockUseServiceCapabilityWithSubscriptionId.mockImplementation(
      (
        capability: ServiceRestriction,
        serviceInstance?: { capabilities?: ServiceRestriction[] }
      ) => ({
        hasCapability:
          serviceInstance?.capabilities?.includes(capability) ?? false,
        subscriptionId: 'subscription-1',
      })
    );
  });

  it.each`
    portalCapabilities                     | serviceCapabilities                  | organizationCapabilities                             | shouldRender
    ${[]}                                  | ${[ServiceRestriction.ManageAccess]} | ${[]}                                                | ${true}
    ${[]}                                  | ${[ServiceRestriction.ManageAccess]} | ${[OrganizationCapability.AdministrateOrganization]} | ${true}
    ${[]}                                  | ${[]}                                | ${[OrganizationCapability.AdministrateOrganization]} | ${true}
    ${[]}                                  | ${[]}                                | ${[OrganizationCapability.ManageSubscription]}       | ${true}
    ${[]}                                  | ${[]}                                | ${[]}                                                | ${false}
    ${[{ name: PortalCapability.Bypass }]} | ${[]}                                | ${[]}                                                | ${true}
  `(
    'renders manage access button when shouldRender=$shouldRender',
    ({
      portalCapabilities,
      serviceCapabilities,
      organizationCapabilities,
      shouldRender,
    }) => {
      // Given
      const environment = createMockEnvironment();
      mockUseServiceContext.mockReturnValue(
        buildServiceContext({
          serviceInstance: {
            id: 'service-1',
            capabilities: serviceCapabilities,
          },
        })
      );

      // When
      const { queryByRole } = testRender(<ServiceListHeaderButtons />, {
        relayConfig: environment,
        me: {
          capabilities: portalCapabilities,
          selected_org_capabilities: organizationCapabilities,
        },
      });

      // Then
      const manageLink = queryByRole('link', {
        name: 'Service.Capabilities.ManageAccessName',
      });

      if (!shouldRender) {
        expect(manageLink).toBeNull();
        return;
      }

      expect(manageLink).toBeInTheDocument();
      expect(manageLink).toHaveAttribute(
        'href',
        '/app/manage/service/service-1/subscription/subscription-1'
      );
    }
  );

  it('does not render update actions when user cannot upload', () => {
    // Given
    const environment = createMockEnvironment();

    // When
    const { queryByRole, queryByText, queryByTestId } = testRender(
      <ServiceListHeaderButtons />,
      {
        relayConfig: environment,
        me: {
          capabilities: [],
        },
      }
    );

    // Then
    expect(
      queryByRole('button', {
        name: 'Service.OpenctiCustomDashboards.AddService',
      })
    ).toBeNull();
    expect(queryByText('integration-dropdown')).toBeNull();
    expect(queryByTestId('service-manage-sheet')).toBeNull();
  });

  it('should open the add sheet when the user clicks the add button of a service', async () => {
    // Given
    mockUseServiceContext.mockReturnValue(
      buildServiceContext({
        serviceInstance: {
          id: 'service-1',
          capabilities: [ServiceRestriction.Upload],
        },
        translationKey: DASHBOARDS_TRANSLATION_KEY,
        ServiceForm: () => null,
      })
    );
    const { user, getByRole } = testRender(<ServiceListHeaderButtons />);

    // When
    await user.click(
      getByRole('button', {
        name: `${DASHBOARDS_TRANSLATION_KEY}.AddService`,
      })
    );

    // Then
    expect(
      getByRole('dialog', {
        name: `${DASHBOARDS_TRANSLATION_KEY}.AddService`,
      })
    ).toBeInTheDocument();
  });

  it('should select the integration type and open the add sheet when the user picks a type to add', async () => {
    // Given
    mockUseServiceContext.mockReturnValue(
      buildServiceContext({
        serviceInstance: {
          id: 'service-1',
          capabilities: [ServiceRestriction.Upload],
        },
        translationKey: INTEGRATIONS_TRANSLATION_KEY,
        type: ShareableResourceType.OPENCTI_INTEGRATION,
        ServiceForm: () => null,
      })
    );
    const { user, getByRole } = testRender(<ServiceListHeaderButtons />);

    // When
    await user.click(
      getByRole('button', {
        name: `${INTEGRATIONS_TRANSLATION_KEY}.AddService`,
      })
    );
    await user.click(
      getByRole('menuitem', {
        name: `${INTEGRATIONS_TRANSLATION_KEY}.Type.${IntegrationType.TaxiiFeed}`,
      })
    );

    // Then
    expect(mockSetIntegrationType).toHaveBeenCalledWith(
      IntegrationType.TaxiiFeed
    );
    expect(
      getByRole('dialog', {
        name: `${INTEGRATIONS_TRANSLATION_KEY}.AddService`,
      })
    ).toBeInTheDocument();
  });
});
