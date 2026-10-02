import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareableResourceCardFooterVersion } from './ShareableResourceCardFooterVersions';

const CONNECTOR_VERSION = '6.8.13';
const PRODUCT_VERSION = '6.7.0';
const MINIMUM_DEPLOYABLE_VERSION = '6.8.0';

const versionMock = vi.hoisted(() => vi.fn());
const compatibilityMock = vi.hoisted(() => vi.fn());

vi.mock('./ShareableResourceCardVersion', () => ({
  ShareableResourceCardVersion: ({
    version,
    ...rest
  }: {
    version?: string | null;
    status?: string;
    tooltip?: string;
  }) => {
    versionMock({ version, ...rest });
    return version ? <span>{version}</span> : null;
  },
}));

vi.mock('@/hooks/use-connector-compatibility', () => ({
  useConnectorCompatibility: (params: unknown) => compatibilityMock(params),
}));

vi.mock('./ShareableResourceCardSupportIcons', () => ({
  ShareableResourceCardSupportIcons: () => <span>support-icons</span>,
}));

const NEUTRAL = {
  status: 'unknown',
  compatiblePlatforms: '',
  incompatiblePlatforms: '',
  incompatibleCount: 0,
};

describe('ShareableResourceCardFooterVersion', () => {
  const document = {
    id: 'doc-1',
    active: true,
    version: CONNECTOR_VERSION,
    product_version: PRODUCT_VERSION,
    minimum_deployable_version: MINIMUM_DEPLOYABLE_VERSION,
    manager_supported: true,
    integration_type: IntegrationType.Connector,
  };

  const renderFooter = (
    overrides: Partial<documentItem_fragment$data> = {},
    props: Record<string, unknown> = {}
  ) =>
    testRender(
      <ShareableResourceCardFooterVersion
        document={{ ...document, ...overrides } as documentItem_fragment$data}
        shareLinkUrl="https://share"
        {...props}
      />
    );

  beforeEach(() => {
    vi.clearAllMocks();
    compatibilityMock.mockReturnValue(NEUTRAL);
  });

  it('renders the version, the support icons, the share button and the extra content', () => {
    renderFooter({}, { extraContent: <span>extra</span> });

    expect(screen.getByText(CONNECTOR_VERSION)).toBeInTheDocument();
    expect(screen.getByText('support-icons')).toBeInTheDocument();
    expect(screen.getByText('extra')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it.each`
    description                                         | overrides                                   | expectedVersion
    ${'a decoupled connector carrying its own version'} | ${{}}                                       | ${CONNECTOR_VERSION}
    ${'a legacy connector, falling back'}               | ${{ version: null }}                        | ${PRODUCT_VERSION}
    ${'a connector with neither'}                       | ${{ version: null, product_version: null }} | ${null}
  `(
    'displays $description',
    ({
      overrides,
      expectedVersion,
    }: {
      overrides: Partial<documentItem_fragment$data>;
      expectedVersion: string | null;
    }) => {
      renderFooter(overrides);

      expect(versionMock).toHaveBeenCalledWith(
        expect.objectContaining({ version: expectedVersion })
      );
    }
  );

  it.each`
    description                               | overrides                               | props                   | enabled
    ${'everything is in place'}               | ${{}}                                   | ${{}}                   | ${true}
    ${'the connector is not auto-deployable'} | ${{ manager_supported: false }}         | ${{}}                   | ${false}
    ${'there is no minimum version'}          | ${{ minimum_deployable_version: null }} | ${{}}                   | ${false}
    ${'the card is on the public path'}       | ${{}}                                   | ${{ publicPath: true }} | ${false}
  `(
    'computes compatibility only when relevant — $description',
    ({
      overrides,
      props,
      enabled,
    }: {
      overrides: Partial<documentItem_fragment$data>;
      props: Record<string, unknown>;
      enabled: boolean;
    }) => {
      renderFooter(overrides, props);

      expect(compatibilityMock).toHaveBeenCalledWith(
        expect.objectContaining({ enabled })
      );
    }
  );

  it.each`
    description       | status            | expectedStatus | expectedKey
    ${'compatible'}   | ${'compatible'}   | ${'success'}   | ${'Service.Connectors.CompatibleWith'}
    ${'partial'}      | ${'partial'}      | ${'warning'}   | ${'Service.Connectors.PartiallyCompatible'}
    ${'incompatible'} | ${'incompatible'} | ${'error'}     | ${'Service.Connectors.Incompatible'}
  `(
    'maps the $description status to the badge and its tooltip',
    ({
      status,
      expectedStatus,
      expectedKey,
    }: {
      status: string;
      expectedStatus: string;
      expectedKey: string;
    }) => {
      compatibilityMock.mockReturnValue({
        status,
        compatiblePlatforms: 'OpenCTI 1',
        incompatiblePlatforms: 'OpenCTI 2',
        incompatibleCount: 1,
      });

      renderFooter();

      expect(versionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expectedStatus,
          tooltip: expectedKey,
        })
      );
    }
  );

  it('passes no tooltip and a neutral badge when compatibility is unknown', () => {
    renderFooter();

    expect(versionMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'neutral', tooltip: undefined })
    );
  });
});
