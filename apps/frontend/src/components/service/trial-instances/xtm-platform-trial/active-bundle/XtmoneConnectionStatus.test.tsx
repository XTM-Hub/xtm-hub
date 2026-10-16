import { XtmoneStatusState } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/useXtmoneIntegrationStatus';
import { XtmoneConnectionStatus } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/XtmoneConnectionStatus';
import testRender from '@/utils/test/test-render';
import { XtmoneIntegrationStatusFragment } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const LAST_CHECKED_AT = '2026-07-30T12:31:53+00:00';
const STATUS_ACTIVE = 'XtmPlatformTrial.Products.StatusActive';
const STATUS_NOT_CONNECTED = 'XtmPlatformTrial.Products.StatusNotConnected';
const STATUS_UNAVAILABLE = 'XtmPlatformTrial.Products.StatusUnavailable';

const buildIntegrationStatus = (
  connected: boolean
): XtmoneIntegrationStatusFragment => ({
  opencti: {
    status: connected ? 'connected' : 'disconnected',
    connected,
    last_checked_at: LAST_CHECKED_AT,
  },
  openaev: {
    status: connected ? 'connected' : 'disconnected',
    connected,
    last_checked_at: LAST_CHECKED_AT,
  },
  linked: connected,
  last_checked_at: LAST_CHECKED_AT,
});

const buildStatus = (
  overrides: Partial<XtmoneStatusState> = {}
): XtmoneStatusState => ({
  data: buildIntegrationStatus(true),
  isLoading: false,
  isError: false,
  hasUrl: true,
  ...overrides,
});

describe('XtmoneConnectionStatus', () => {
  it.each([
    {
      context: 'both products are connected to XTM One',
      status: buildStatus(),
      expectedLabel: STATUS_ACTIVE,
    },
    {
      context: 'both products are disconnected from XTM One',
      status: buildStatus({ data: buildIntegrationStatus(false) }),
      expectedLabel: STATUS_NOT_CONNECTED,
    },
  ])(
    'should show the $expectedLabel icon on each product row when $context',
    ({ status, expectedLabel }) => {
      // Given / When
      testRender(<XtmoneConnectionStatus status={status} />);

      // Then
      expect(screen.getAllByLabelText(expectedLabel)).toHaveLength(2);
    }
  );

  it.each([
    {
      context: 'the status request failed',
      status: buildStatus({ isError: true }),
    },
    {
      context: 'XTM One has no url yet',
      status: buildStatus({ hasUrl: false }),
    },
    {
      context: 'XTM One returned no status',
      status: buildStatus({ data: undefined }),
    },
  ])(
    'should show the status as unavailable on each product row when $context',
    ({ status }) => {
      // Given / When
      testRender(<XtmoneConnectionStatus status={status} />);

      // Then
      expect(screen.getAllByText(STATUS_UNAVAILABLE)).toHaveLength(2);
    }
  );

  it('should show no connection status when the status is loading', () => {
    // Given / When
    testRender(
      <XtmoneConnectionStatus
        status={buildStatus({ data: undefined, isLoading: true })}
      />
    );

    // Then
    expect(screen.queryByLabelText(STATUS_ACTIVE)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(STATUS_NOT_CONNECTED)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(STATUS_UNAVAILABLE)).not.toBeInTheDocument();
  });
});
