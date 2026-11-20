import { RegisteredPlatformHeader } from '@/components/service/registration/RegisteredPlatformHeader';
import { basePlatform } from '@/components/service/registration/registered-platform.fixtures';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import {
  PlatformContract,
  RegisteredPlatformDetailsFragment,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = '2026-03-15T12:00:00.000Z';
const RECENT_CHECK = '2026-03-10T12:00:00.000Z';
const OLD_CHECK = '2026-01-10T12:00:00.000Z';
const PLATFORM_ORGANIZATION_ID = basePlatform.subscription!.organization.id;
const OTHER_ORGANIZATION_ID = 'other-org-id';

const renderHeader = (
  platform: Partial<RegisteredPlatformDetailsFragment> = {},
  selectedOrganizationId: string = PLATFORM_ORGANIZATION_ID,
  showOrganization = false
) => {
  return testRender(
    <RegisteredPlatformHeader
      platform={{ ...basePlatform, ...platform }}
      showOrganization={showOrganization}
    />,
    { me: { selected_organization_id: selectedOrganizationId } }
  );
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisteredPlatformHeader', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(NOW) });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(useTranslations).mockImplementation(() => mockTranslations());
  });

  it('should display the platform title', () => {
    // Given / When
    renderHeader();

    // Then
    expect(
      screen.getByRole('heading', { level: 1, name: basePlatform.title })
    ).toBeInTheDocument();
  });

  it.each`
    contract                  | label
    ${PlatformContract.Ce}    | ${'Contracts.CE'}
    ${PlatformContract.Ee}    | ${'Contracts.EE'}
    ${PlatformContract.Trial} | ${'Contracts.TRIAL'}
  `(
    'should display $label when the contract is $contract',
    ({ contract, label }) => {
      // Given / When
      renderHeader({ contract });

      // Then
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  );

  it.each([
    [
      'checked less than a month ago',
      RECENT_CHECK,
      'Register.Details.ConnectionStatus.Connected',
    ],
    [
      'checked more than a month ago',
      OLD_CHECK,
      'Register.Details.ConnectionStatus.NotConnected',
    ],
    ['never checked', null, 'Register.Details.ConnectionStatus.NotConnected'],
  ])(
    'should display the connection status when the platform was %s',
    (_, lastConnectivityCheck, label) => {
      // Given / When
      renderHeader({ last_connectivity_check: lastConnectivityCheck });

      // Then
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  );

  it('should display the platform actions when the user selected the platform organization', () => {
    // Given / When
    renderHeader({}, PLATFORM_ORGANIZATION_ID);

    // Then
    expect(
      screen.getByRole('link', { name: /Register\.Details\.Access/ })
    ).toBeInTheDocument();
  });

  it('should hide the platform actions when the user selected another organization', () => {
    // Given / When
    renderHeader({}, OTHER_ORGANIZATION_ID);

    // Then
    expect(
      screen.queryByRole('link', { name: /Register\.Details\.Access/ })
    ).not.toBeInTheDocument();
  });

  it('should hide the platform actions when the platform has no subscription', () => {
    // Given / When
    renderHeader({ subscription: null }, PLATFORM_ORGANIZATION_ID);

    // Then
    expect(
      screen.queryByRole('link', { name: /Register\.Details\.Access/ })
    ).not.toBeInTheDocument();
  });

  it('should display the owner organization when asked to', () => {
    // Given
    vi.mocked(useTranslations).mockReturnValue(
      mockTranslations({ translate: translateWithValues })
    );

    // When
    renderHeader({ subscription: null }, OTHER_ORGANIZATION_ID, true);

    // Then
    expect(
      screen.getByText(
        translateWithValues('Register.Details.OrganizationName', {
          name: basePlatform.organization!.name,
        })
      )
    ).toBeInTheDocument();
  });

  it('should hide the owner organization when not asked to', () => {
    // Given / When
    renderHeader({}, PLATFORM_ORGANIZATION_ID, false);

    // Then
    expect(
      screen.queryByText(/Register\.Details\.OrganizationName/)
    ).not.toBeInTheDocument();
  });

  it('should hide the owner organization when the platform has no owner', () => {
    // Given / When
    renderHeader({ organization: null }, OTHER_ORGANIZATION_ID, true);

    // Then
    expect(
      screen.queryByText(/Register\.Details\.OrganizationName/)
    ).not.toBeInTheDocument();
  });
});
