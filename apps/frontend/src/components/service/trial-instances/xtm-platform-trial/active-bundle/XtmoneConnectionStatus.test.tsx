import { XtmoneStatusState } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/useXtmoneIntegrationStatus';
import { XtmoneConnectionStatus } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/XtmoneConnectionStatus';
import testRender from '@/utils/test/test-render';
import { XtmoneIntegrationStatusFragment } from '@graphql/generated';
import {
  mockXtmoneIntegrationStatus,
  mockXtmoneIntegrationStatusEntry,
} from '@graphql/mocks';
import { screen, within } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const OPENCTI_ROW_LABEL =
  'XtmPlatformTrial.Products.Connection:{"productName":"OpenCTI"}:';
const OPENAEV_ROW_LABEL =
  'XtmPlatformTrial.Products.Connection:{"productName":"OpenAEV"}:';
const STATUS_ACTIVE = 'XtmPlatformTrial.Products.StatusActive';
const STATUS_NOT_CONNECTED = 'XtmPlatformTrial.Products.StatusNotConnected';
const STATUS_UNAVAILABLE = 'XtmPlatformTrial.Products.StatusUnavailable';

const buildIntegrationStatus = ({
  openctiConnected,
  openaevConnected,
}: {
  openctiConnected: boolean;
  openaevConnected: boolean;
}): XtmoneIntegrationStatusFragment =>
  mockXtmoneIntegrationStatus({
    opencti: mockXtmoneIntegrationStatusEntry({ connected: openctiConnected }),
    openaev: mockXtmoneIntegrationStatusEntry({ connected: openaevConnected }),
  });

const buildStatus = (
  overrides: Partial<XtmoneStatusState> = {}
): XtmoneStatusState => ({
  data: buildIntegrationStatus({
    openctiConnected: true,
    openaevConnected: true,
  }),
  isLoading: false,
  isError: false,
  hasUrl: true,
  ...overrides,
});

const getProductRow = (rowLabel: string) => {
  const row = screen.getByText(rowLabel).parentElement;
  if (!row) {
    throw new Error(`no product row labelled ${rowLabel}`);
  }
  return within(row);
};

describe('XtmoneConnectionStatus', () => {
  beforeEach(() => {
    vi.mocked(useTranslations).mockReturnValue((key, values) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    );
  });

  it.each([
    {
      context: 'both products are connected to XTM One',
      openctiConnected: true,
      openaevConnected: true,
      expectedOpenctiStatus: STATUS_ACTIVE,
      expectedOpenaevStatus: STATUS_ACTIVE,
    },
    {
      context: 'both products are disconnected from XTM One',
      openctiConnected: false,
      openaevConnected: false,
      expectedOpenctiStatus: STATUS_NOT_CONNECTED,
      expectedOpenaevStatus: STATUS_NOT_CONNECTED,
    },
    {
      context: 'only OpenCTI is connected to XTM One',
      openctiConnected: true,
      openaevConnected: false,
      expectedOpenctiStatus: STATUS_ACTIVE,
      expectedOpenaevStatus: STATUS_NOT_CONNECTED,
    },
    {
      context: 'only OpenAEV is connected to XTM One',
      openctiConnected: false,
      openaevConnected: true,
      expectedOpenctiStatus: STATUS_NOT_CONNECTED,
      expectedOpenaevStatus: STATUS_ACTIVE,
    },
  ])(
    'should show the connection status of each product on its own row when $context',
    ({
      openctiConnected,
      openaevConnected,
      expectedOpenctiStatus,
      expectedOpenaevStatus,
    }) => {
      // Given / When
      testRender(
        <XtmoneConnectionStatus
          status={buildStatus({
            data: buildIntegrationStatus({
              openctiConnected,
              openaevConnected,
            }),
          })}
        />
      );

      // Then
      expect(
        getProductRow(OPENCTI_ROW_LABEL).getByRole('img', {
          name: expectedOpenctiStatus,
        })
      ).toBeInTheDocument();
      expect(
        getProductRow(OPENAEV_ROW_LABEL).getByRole('img', {
          name: expectedOpenaevStatus,
        })
      ).toBeInTheDocument();
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
      expect(
        getProductRow(OPENCTI_ROW_LABEL).getByText(STATUS_UNAVAILABLE)
      ).toBeInTheDocument();
      expect(
        getProductRow(OPENAEV_ROW_LABEL).getByText(STATUS_UNAVAILABLE)
      ).toBeInTheDocument();
    }
  );

  it('should show the status as unavailable on the OpenCTI row only when XTM One returned no OpenCTI status', () => {
    // Given / When
    testRender(
      <XtmoneConnectionStatus
        status={buildStatus({
          data: mockXtmoneIntegrationStatus({
            opencti: undefined,
            openaev: mockXtmoneIntegrationStatusEntry({ connected: true }),
          }),
        })}
      />
    );

    // Then
    expect(
      getProductRow(OPENCTI_ROW_LABEL).getByText(STATUS_UNAVAILABLE)
    ).toBeInTheDocument();
    expect(
      getProductRow(OPENAEV_ROW_LABEL).getByRole('img', { name: STATUS_ACTIVE })
    ).toBeInTheDocument();
  });

  it.each([
    { isLoading: true, expectedBusy: 'true' },
    { isLoading: false, expectedBusy: 'false' },
  ])(
    'should set the product rows busy state to $expectedBusy when loading is $isLoading',
    ({ isLoading, expectedBusy }) => {
      // Given / When
      testRender(
        <XtmoneConnectionStatus status={buildStatus({ isLoading })} />
      );

      // Then
      expect(
        screen.getByText(OPENCTI_ROW_LABEL).closest('[aria-busy]')
      ).toHaveAttribute('aria-busy', expectedBusy);
    }
  );

  it.each([
    { product: 'OpenCTI', rowLabel: OPENCTI_ROW_LABEL },
    { product: 'OpenAEV', rowLabel: OPENAEV_ROW_LABEL },
  ])(
    'should show the $product row without any connection status when the status is loading',
    ({ rowLabel }) => {
      // Given / When
      testRender(
        <XtmoneConnectionStatus
          status={buildStatus({ data: undefined, isLoading: true })}
        />
      );

      // Then
      const row = getProductRow(rowLabel);
      expect(row.queryByRole('img')).not.toBeInTheDocument();
      expect(row.queryByText(STATUS_UNAVAILABLE)).not.toBeInTheDocument();
    }
  );
});
