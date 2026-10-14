import { RegistrationDetails } from '@/components/service/registration/RegistrationDetails';
import {
  basePlatform,
  trialPlatform,
} from '@/components/service/registration/registered-platform.fixtures';
import testRender from '@/utils/test/test-render';
import { registeredPlatformByServiceInstanceId_fragment$data } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import { DeploymentRequestHubStatus } from '@graphql/generated';
import { screen, within } from '@testing-library/react';
import { createMockEnvironment } from 'relay-test-utils';
import { describe, expect, it, vi } from 'vitest';

const PLATFORM_VERSION = '6.8.1';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/service/trial-instances/TrialCancelSheet', () => ({
  TrialCancelSheet: () => null,
}));

let mockPlatformData: registeredPlatformByServiceInstanceId_fragment$data;

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal()),
  useFragment: () => mockPlatformData,
}));

const renderDetails = (
  platform: registeredPlatformByServiceInstanceId_fragment$data,
  me?: NonNullable<Parameters<typeof testRender>[1]>['me']
) => {
  mockPlatformData = platform;
  return testRender(<RegistrationDetails registeredPlatform={{} as never} />, {
    relayConfig: createMockEnvironment(),
    me,
  });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegistrationDetails', () => {
  describe('Cancel button in status row', () => {
    it.each`
      hubStatus                                  | shouldShow
      ${DeploymentRequestHubStatus.Pending}      | ${true}
      ${DeploymentRequestHubStatus.Active}       | ${true}
      ${DeploymentRequestHubStatus.Provisioning} | ${true}
      ${DeploymentRequestHubStatus.Queued}       | ${true}
      ${DeploymentRequestHubStatus.Expired}      | ${false}
      ${DeploymentRequestHubStatus.Cancelled}    | ${false}
    `(
      'should show Cancel=$shouldShow for status $hubStatus',
      ({ hubStatus, shouldShow }) => {
        renderDetails({
          ...trialPlatform,
          deployment_request: {
            ...trialPlatform.deployment_request!,
            hub_status: hubStatus,
          },
        });
        const cancelButton = screen.queryByRole('button', {
          name: /Utils.Cancel/i,
        });
        if (shouldShow) {
          expect(cancelButton).toBeInTheDocument();
        } else {
          expect(cancelButton).not.toBeInTheDocument();
        }
      }
    );

    it('should not show status row when there is no deployment_request', () => {
      renderDetails(basePlatform);
      expect(
        screen.queryByText(/Register\.Details\.Status/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('Details rows', () => {
    it('should render the platform URL value in the Platform URL row when URL exists', () => {
      renderDetails(basePlatform);

      const platformUrlLabel = screen.getByText(
        /Register\.Details\.ProductURL/i
      );
      const platformUrlRow = platformUrlLabel.closest('li');

      expect(platformUrlRow).not.toBeNull();
      expect(
        within(platformUrlRow as HTMLElement).getByText(basePlatform.url)
      ).toBeInTheDocument();
      expect(
        within(platformUrlRow as HTMLElement).queryByText('-')
      ).not.toBeInTheDocument();
    });

    it('should render "-" in the Platform URL row when URL is empty', () => {
      renderDetails({
        ...basePlatform,
        url: '',
      });

      const platformUrlLabel = screen.getByText(
        /Register\.Details\.ProductURL/i
      );
      const platformUrlRow = platformUrlLabel.closest('li');

      expect(platformUrlRow).not.toBeNull();
      expect(
        within(platformUrlRow as HTMLElement).getByText('-')
      ).toBeInTheDocument();
    });

    it.each([
      [PLATFORM_VERSION, PLATFORM_VERSION],
      ['', '-'],
      [null, '-'],
    ])(
      'should render the platform version reported by the platform when it is %s',
      (version, expectedText) => {
        // Given / When
        renderDetails({ ...basePlatform, version });

        // Then
        const versionRow = screen
          .getByText(/Register\.Details\.PlatformVersion/i)
          .closest('li') as HTMLElement;
        expect(within(versionRow).getByText(expectedText)).toBeInTheDocument();
      }
    );

    it('should show "Start date" and "End date" for trial, not "Connected on"', () => {
      renderDetails(trialPlatform);
      expect(
        screen.getByText(/Register\.Details\.StartDate/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Register\.Details\.EndDate/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Register\.Details\.ConnectedOn/i)
      ).not.toBeInTheDocument();
    });

    it('should show "Connected on" for non-trial, not "Start date" or "End date"', () => {
      renderDetails(basePlatform);
      expect(
        screen.getByText(/Register\.Details\.ConnectedOn/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Register\.Details\.StartDate/i)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Register\.Details\.EndDate/i)
      ).not.toBeInTheDocument();
    });

    it('should hide connection status and last check rows for trial when deployment is not ACTIVE', () => {
      renderDetails({
        ...trialPlatform,
        last_connectivity_check: '2025-03-10T12:00:00.000Z',
        deployment_request: {
          ...trialPlatform.deployment_request!,
          hub_status: DeploymentRequestHubStatus.Pending,
        },
      });

      expect(
        screen.queryByText(/Register\.Details\.ConnectionStatus\.Title/i)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Register\.Details\.LastConnectionCheck/i)
      ).not.toBeInTheDocument();
    });

    it('should show connection status and last check rows for trial when deployment is ACTIVE', () => {
      renderDetails({
        ...trialPlatform,
        last_connectivity_check: '2025-03-10T12:00:00.000Z',
      });

      expect(
        screen.getByText(/Register\.Details\.ConnectionStatus\.Title/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Register\.Details\.LastConnectionCheck/i)
      ).toBeInTheDocument();
    });
  });

  describe('Access row for trial', () => {
    it.each`
      myGroups                                   | expectedText
      ${[{ name: 'Admin' }, { name: 'Reader' }]} | ${'Admin, Reader'}
      ${[{ name: 'Manager' }]}                   | ${'Manager'}
    `(
      'should show group names when myGroups is provided',
      ({ myGroups, expectedText }) => {
        renderDetails({
          ...trialPlatform,
          myGroups,
        });

        expect(screen.getByText(/Access:/i)).toBeInTheDocument();
        expect(screen.getByText(expectedText)).toBeInTheDocument();
        expect(
          screen.queryByText('RegistrationDetails.NoAccess')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('RegistrationDetails.NoAccessContact')
        ).not.toBeInTheDocument();
      }
    );

    it.each`
      myGroups     | description
      ${[]}        | ${'empty array'}
      ${null}      | ${'null value'}
      ${undefined} | ${'undefined value'}
    `(
      'should show fallback message when myGroups is $description',
      ({ myGroups }) => {
        renderDetails({
          ...trialPlatform,
          myGroups,
          deployment_request: {
            ...trialPlatform.deployment_request!,
            requester_email: 'admin@filigran.io',
          },
        });

        expect(
          screen.getByText('RegistrationDetails.NoAccess')
        ).toBeInTheDocument();
        expect(
          screen.getByText('RegistrationDetails.NoAccessContact')
        ).toBeInTheDocument();
      }
    );

    it('should render "No access" in red and contact info without red styling', () => {
      renderDetails({
        ...trialPlatform,
        myGroups: [],
        deployment_request: {
          ...trialPlatform.deployment_request!,
          requester_email: 'admin@filigran.io',
        },
      });

      const noAccessEl = screen.getByText('RegistrationDetails.NoAccess');
      expect(noAccessEl).toHaveClass('text-destructive');

      const contactEl = screen.getByText('RegistrationDetails.NoAccessContact');
      expect(contactEl).not.toHaveClass('text-destructive');
    });

    it('should not render access row for non-trial', () => {
      renderDetails({
        ...basePlatform,
        myGroups: [{ name: 'Admin' }],
      });

      expect(screen.queryByText(/Access:/i)).not.toBeInTheDocument();
    });

    it('should not render access row for trial that is not ACTIVE', () => {
      renderDetails({
        ...trialPlatform,
        myGroups: [{ name: 'Admin' }],
        deployment_request: {
          ...trialPlatform.deployment_request!,
          hub_status: DeploymentRequestHubStatus.Pending,
        },
      });

      expect(screen.queryByText(/Access:/i)).not.toBeInTheDocument();
    });
  });
});
