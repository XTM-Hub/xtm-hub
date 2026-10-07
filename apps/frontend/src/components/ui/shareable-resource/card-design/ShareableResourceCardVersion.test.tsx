import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareableResourceCardVersion } from './ShareableResourceCardVersion';

const PLATFORM_TITLE = 'OpenCTI';
const PLATFORM_VERSION = '6.7';
const PRODUCT_VERSION = '6.8';
const VERSION_CLASS = 'version-class';
const INCOMPATIBLE_ICON_TEST_ID = 'incompatible-icon';

const compatibilityHookMock = vi.fn();

vi.mock('@/hooks/use-build-compatibility-translation-key', () => ({
  useBuildCompatibilityTranslationKey: (...args: unknown[]) =>
    compatibilityHookMock(...args),
}));

vi.mock('@filigran/icon', () => ({
  CheckIndeterminateIcon: () => <svg data-testid={INCOMPATIBLE_ICON_TEST_ID} />,
}));

vi.mock('@filigran/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@filigran/design-system')>()),
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div role="tooltip">{children}</div>
  ),
}));

describe('ShareableResourceCardVersion', () => {
  beforeEach(() => {
    vi.mocked(useRegisteredPlatforms).mockReturnValue({
      platforms: [{ title: PLATFORM_TITLE, version: PLATFORM_VERSION }],
    });
  });

  it('renders incompatibility tooltip when some platforms are incompatible', () => {
    compatibilityHookMock.mockReturnValue({
      platformToBeUpdated: PLATFORM_TITLE,
      incompatiblePlatformsCount: 2,
    });

    testRender(
      <ShareableResourceCardVersion
        product_version={PRODUCT_VERSION}
        requiredProductVersion={PRODUCT_VERSION}
        className={VERSION_CLASS}
      />
    );

    expect(screen.getByText(PRODUCT_VERSION)).toBeInTheDocument();
    expect(screen.getByTestId(INCOMPATIBLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(
      screen.getByText('Service.Connectors.Incompatible')
    ).toBeInTheDocument();
  });

  it('renders plain version when there is no incompatibility', () => {
    compatibilityHookMock.mockReturnValue({
      platformToBeUpdated: '',
      incompatiblePlatformsCount: 0,
    });

    testRender(
      <ShareableResourceCardVersion
        product_version={PRODUCT_VERSION}
        requiredProductVersion={PRODUCT_VERSION}
        className={VERSION_CLASS}
      />
    );

    expect(screen.getByText(PRODUCT_VERSION)).toHaveClass(VERSION_CLASS);
    expect(
      screen.queryByTestId(INCOMPATIBLE_ICON_TEST_ID)
    ).not.toBeInTheDocument();
  });
});
