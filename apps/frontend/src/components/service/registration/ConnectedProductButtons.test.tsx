import { ConnectedProductButtons } from '@/components/service/registration/ConnectedProductButtons';
import {
  basePlatform,
  trialPlatform,
  trialPlatformWithAccess,
} from '@/components/service/registration/registered-platform.fixtures';
import testRender from '@/utils/test/test-render';
import { registeredPlatformByServiceInstanceId_fragment$data } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import {
  DeploymentRequestHubStatus,
  OrganizationCapability,
  PortalCapability,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/service/components/PlatformUpdateSheet', () => ({
  PlatformUpdateSheet: ({ platformUrl }: { platformUrl: string }) => (
    <div
      data-testid="platform-update-sheet"
      data-url={platformUrl}
    />
  ),
}));

vi.mock('@/components/service/registration/UnregisterButton', () => ({
  UnregisterButton: () => null,
}));

vi.mock(
  '@/components/service/trial-instances/manage-users/TrialsManageUsersDialog',
  () => ({
    TrialsManageUsersDialog: ({
      defaultOpen,
    }: {
      serviceInstanceId: string;
      organizationId?: string;
      defaultOpen?: boolean;
    }) => (
      <div
        data-testid="manage-users-dialog"
        data-default-open={String(defaultOpen)}>
        ManageUsersDialog
      </div>
    ),
  })
);

const renderButtons = (
  platform: registeredPlatformByServiceInstanceId_fragment$data,
  me?: NonNullable<Parameters<typeof testRender>[1]>['me']
) => testRender(<ConnectedProductButtons platform={platform} />, { me });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConnectedProductButtons', () => {
  describe('Access button', () => {
    it.each`
      label                                             | platform                                                                                                                                                 | shouldShow
      ${'trial, ACTIVE status, with url, no myGroups'}  | ${trialPlatform}                                                                                                                                         | ${false}
      ${'trial, ACTIVE status, with url and myGroups'}  | ${trialPlatformWithAccess}                                                                                                                               | ${true}
      ${'trial, PENDING status, with url and myGroups'} | ${{ ...trialPlatformWithAccess, deployment_request: { ...trialPlatformWithAccess.deployment_request, hub_status: DeploymentRequestHubStatus.Pending } }} | ${false}
      ${'trial, ACTIVE status, no url'}                 | ${{ ...trialPlatformWithAccess, url: '' }}                                                                                                               | ${false}
      ${'non-trial with url'}                           | ${basePlatform}                                                                                                                                          | ${true}
    `('should show=$shouldShow for $label', ({ platform, shouldShow }) => {
      renderButtons(platform);
      const accessLink = screen.queryByRole('link', { name: /Access/i });
      if (shouldShow) {
        expect(accessLink).toBeInTheDocument();
      } else {
        expect(accessLink).not.toBeInTheDocument();
      }
    });
  });

  it('should not show the Access button when a non-trial platform has no URL', () => {
    // Given / When
    renderButtons({ ...basePlatform, url: '' });

    // Then
    expect(
      screen.queryByText(/Register\.Details\.Access/)
    ).not.toBeInTheDocument();
  });

  it('should open the platform URL in a new tab from the Access button', () => {
    // Given / When
    renderButtons(basePlatform);

    // Then
    const accessLink = screen.getByRole('link', { name: /Access/i });
    expect(accessLink).toHaveAttribute('href', basePlatform.url);
    expect(accessLink).toHaveAttribute('target', '_blank');
  });

  describe('TrialsManageUsersDialog visibility', () => {
    it.each`
      label                             | capabilities                                           | shouldShow
      ${'ADMINISTRATE_ORGANIZATION'}    | ${[OrganizationCapability.AdministrateOrganization]}   | ${true}
      ${'MANAGE_PLATFORM_REGISTRATION'} | ${[OrganizationCapability.ManagePlatformRegistration]} | ${true}
      ${'no capability'}                | ${[]}                                                  | ${false}
    `(
      'should show=$shouldShow on trial + ACTIVE + myGroups when user has $label',
      ({ capabilities, shouldShow }) => {
        renderButtons(trialPlatformWithAccess, {
          selected_org_capabilities: capabilities,
        });
        if (shouldShow) {
          expect(screen.getByTestId('manage-users-dialog')).toBeInTheDocument();
        } else {
          expect(
            screen.queryByTestId('manage-users-dialog')
          ).not.toBeInTheDocument();
        }
      }
    );

    it('should not show when trial but deployment is not ACTIVE', () => {
      renderButtons(
        {
          ...trialPlatformWithAccess,
          deployment_request: {
            ...trialPlatformWithAccess.deployment_request!,
            hub_status: DeploymentRequestHubStatus.Pending,
          },
        },
        {
          selected_org_capabilities: [
            OrganizationCapability.AdministrateOrganization,
          ],
        }
      );
      expect(
        screen.queryByTestId('manage-users-dialog')
      ).not.toBeInTheDocument();
    });

    it('should not show when trial + ACTIVE + capability but no myGroups', () => {
      renderButtons(trialPlatform, {
        selected_org_capabilities: [
          OrganizationCapability.AdministrateOrganization,
        ],
      });
      expect(
        screen.queryByTestId('manage-users-dialog')
      ).not.toBeInTheDocument();
    });

    it('should not show for non-trial even with capability', () => {
      renderButtons(basePlatform, {
        selected_org_capabilities: [
          OrganizationCapability.AdministrateOrganization,
        ],
      });
      expect(
        screen.queryByTestId('manage-users-dialog')
      ).not.toBeInTheDocument();
    });

    it('should not show when trial + ACTIVE + myGroups + capability but no serviceInstanceId', () => {
      renderButtons(
        {
          ...trialPlatformWithAccess,
          subscription: {
            ...trialPlatformWithAccess.subscription!,
            service_instance: null,
          },
        },
        {
          selected_org_capabilities: [
            OrganizationCapability.AdministrateOrganization,
          ],
        }
      );
      expect(
        screen.queryByTestId('manage-users-dialog')
      ).not.toBeInTheDocument();
    });
  });

  describe('Update Platform button', () => {
    const updateCapabilities = [
      OrganizationCapability.AdministrateOrganization,
      OrganizationCapability.ManagePlatformRegistration,
    ];

    it.each`
      label                                             | platform         | capabilities                                           | shouldShow
      ${'trial, with update capabilities'}              | ${trialPlatform} | ${updateCapabilities}                                  | ${false}
      ${'non-trial, only ADMINISTRATE_ORGANIZATION'}    | ${basePlatform}  | ${[OrganizationCapability.AdministrateOrganization]}   | ${true}
      ${'non-trial, only MANAGE_PLATFORM_REGISTRATION'} | ${basePlatform}  | ${[OrganizationCapability.ManagePlatformRegistration]} | ${true}
      ${'non-trial, no capabilities'}                   | ${basePlatform}  | ${[]}                                                  | ${false}
    `(
      'should show=$shouldShow for $label',
      ({ platform, capabilities, shouldShow }) => {
        renderButtons(platform, { selected_org_capabilities: capabilities });
        const updateButton = screen.queryByRole('button', {
          name: /Platform.Update/i,
        });
        if (shouldShow) {
          expect(updateButton).toBeInTheDocument();
        } else {
          expect(updateButton).not.toBeInTheDocument();
        }
      }
    );

    it('should show for BYPASS user on non-trial with serviceInstanceId', () => {
      renderButtons(basePlatform, {
        capabilities: [{ name: PortalCapability.Bypass }],
      });
      expect(
        screen.getByRole('button', { name: /Platform.Update/i })
      ).toBeInTheDocument();
    });

    it('should not show when non-trial with update capabilities but no serviceInstanceId', () => {
      renderButtons(
        {
          ...basePlatform,
          subscription: {
            ...basePlatform.subscription!,
            service_instance: null,
          },
        },
        { selected_org_capabilities: updateCapabilities }
      );
      expect(
        screen.queryByRole('button', { name: /Platform.Update/i })
      ).not.toBeInTheDocument();
    });

    it('should pass platform URL to PlatformUpdateSheet', () => {
      renderButtons(basePlatform, {
        selected_org_capabilities: [
          OrganizationCapability.AdministrateOrganization,
        ],
      });

      expect(screen.getByTestId('platform-update-sheet')).toHaveAttribute(
        'data-url',
        basePlatform.url
      );
    });
  });

  describe('openForm search param', () => {
    it('should pass defaultOpen=true to TrialsManageUsersDialog when openForm=true', () => {
      vi.mocked(useSearchParams).mockReturnValue(
        new URLSearchParams('openForm=true') as unknown as ReturnType<
          typeof useSearchParams
        >
      );
      renderButtons(trialPlatformWithAccess, {
        selected_org_capabilities: [
          OrganizationCapability.AdministrateOrganization,
        ],
      });
      const dialog = screen.getByTestId('manage-users-dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('data-default-open', 'true');
    });

    it('should pass defaultOpen=false to TrialsManageUsersDialog when openForm is absent', () => {
      vi.mocked(useSearchParams).mockReturnValue(
        new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
      );
      renderButtons(trialPlatformWithAccess, {
        selected_org_capabilities: [
          OrganizationCapability.AdministrateOrganization,
        ],
      });
      expect(screen.getByTestId('manage-users-dialog')).toHaveAttribute(
        'data-default-open',
        'false'
      );
    });
  });
});
