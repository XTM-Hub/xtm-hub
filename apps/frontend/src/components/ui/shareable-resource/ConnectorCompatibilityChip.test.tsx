import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectorCompatibilityChip } from './ConnectorCompatibilityChip';

const PRODUCT_VERSION = '6.5.0';
const COMPATIBLE_PLATFORMS = 'OpenCTI 1';
const INCOMPATIBLE_PLATFORMS = 'OpenCTI 2';
const INCOMPATIBLE_COUNT = 1;

const compatibilityMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-connector-compatibility', () => ({
  useConnectorCompatibility: (params: unknown) => compatibilityMock(params),
}));

vi.mock('@filigran/ui/clients', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div role="tooltip">{children}</div>
  ),
}));

vi.mock('@filigran/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@filigran/design-system')>()),
  Icon: ({ name }: { name: string }) => <svg data-testid={`icon-${name}`} />,
}));

const UNKNOWN_COMPATIBILITY = {
  status: 'unknown',
  compatiblePlatforms: '',
  incompatiblePlatforms: '',
  incompatibleCount: 0,
};

const CONNECTOR = {
  id: 'doc-1',
  active: true,
  product_version: PRODUCT_VERSION,
  manager_supported: true,
  integration_type: IntegrationType.Connector,
};

const renderChip = (
  overrides: Partial<documentItem_fragment$data> = {},
  publicPath = false
) =>
  testRender(
    <ConnectorCompatibilityChip
      document={{ ...CONNECTOR, ...overrides } as documentItem_fragment$data}
      publicPath={publicPath}
    />
  );

describe('ConnectorCompatibilityChip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    compatibilityMock.mockReturnValue(UNKNOWN_COMPATIBILITY);
    vi.mocked(useTranslations).mockReturnValue((key, values) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    );
  });

  it('should display the OpenCTI version the connector requires when it is known', () => {
    // Given / When
    renderChip();

    // Then
    expect(screen.getByText(`V.${PRODUCT_VERSION}`)).toBeInTheDocument();
  });

  it('should compare the platforms with the required OpenCTI version when it is known', () => {
    // Given / When
    renderChip();

    // Then
    expect(compatibilityMock).toHaveBeenCalledWith(
      expect.objectContaining({ requiredVersion: PRODUCT_VERSION })
    );
  });

  it('should render nothing when the required OpenCTI version is unknown', () => {
    // Given / When
    const { container } = renderChip({ product_version: null });

    // Then
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    {
      context: 'everything is in place',
      overrides: {},
      publicPath: false,
      enabled: true,
    },
    {
      context: 'the connector is not auto-deployable',
      overrides: { manager_supported: false },
      publicPath: false,
      enabled: false,
    },
    {
      context: 'the required OpenCTI version is unknown',
      overrides: { product_version: null },
      publicPath: false,
      enabled: false,
    },
    {
      context: 'the chip is on the public path',
      overrides: {},
      publicPath: true,
      enabled: false,
    },
  ])(
    'should set compatibility fetching to $enabled when $context',
    ({ overrides, publicPath, enabled }) => {
      // Given / When
      renderChip(overrides, publicPath);

      // Then
      expect(compatibilityMock).toHaveBeenCalledWith(
        expect.objectContaining({ enabled })
      );
    }
  );

  it.each`
    status            | expectedIcon      | expectedTooltip
    ${'compatible'}   | ${'circle-check'} | ${`Service.Connectors.CompatibleWith:${JSON.stringify({ compatiblePlatforms: COMPATIBLE_PLATFORMS })}`}
    ${'partial'}      | ${'circle-alert'} | ${`Service.Connectors.PartiallyCompatible:${JSON.stringify({ compatiblePlatforms: COMPATIBLE_PLATFORMS, incompatiblePlatforms: INCOMPATIBLE_PLATFORMS, count: INCOMPATIBLE_COUNT })}`}
    ${'incompatible'} | ${'circle-x'}     | ${`Service.Connectors.Incompatible:${JSON.stringify({ platformToBeUpdated: INCOMPATIBLE_PLATFORMS, count: INCOMPATIBLE_COUNT })}`}
  `(
    'should show the $expectedIcon icon and name the platforms in the tooltip when the connector is $status',
    ({
      status,
      expectedIcon,
      expectedTooltip,
    }: {
      status: string;
      expectedIcon: string;
      expectedTooltip: string;
    }) => {
      // Given
      compatibilityMock.mockReturnValue({
        status,
        compatiblePlatforms: COMPATIBLE_PLATFORMS,
        incompatiblePlatforms: INCOMPATIBLE_PLATFORMS,
        incompatibleCount: INCOMPATIBLE_COUNT,
      });

      // When
      renderChip();

      // Then
      expect(screen.getByTestId(`icon-${expectedIcon}`)).toBeInTheDocument();
      expect(screen.getByRole('tooltip')).toHaveTextContent(expectedTooltip);
    }
  );

  it('should show neither icon nor tooltip when the compatibility is unknown', () => {
    // Given / When
    const { container } = renderChip();

    // Then
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
