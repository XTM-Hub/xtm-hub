import { SaasProductChip } from '@/components/subcription/saas/datatable/SaasProductChip';
import testRender from '@/utils/test/test-render';
import { TooltipProvider } from '@filigran/design-system';
import { SaasProduct } from '@graphql/generated';
import { fireEvent, screen, within } from '@testing-library/react';
import { useTranslations } from 'next-intl';

const PRODUCT_NAME = 'OpenCTI';
const VERSION = '6.8.1';

const renderProductChip = (version: string | null) =>
  testRender(
    <TooltipProvider>
      <SaasProductChip
        product={SaasProduct.Octi}
        version={version}
      />
    </TooltipProvider>
  );

const mockTranslationsWithValues = () =>
  vi
    .mocked(useTranslations)
    .mockReturnValue(((key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key) as ReturnType<
      typeof useTranslations
    >);

describe('SaasProductChip', () => {
  afterEach(() => {
    // Back to the translator of setup-vitest, which gives back the bare key
    vi.mocked(useTranslations).mockReset();
  });

  it('should display the version of a saas platform registered in the Hub in a tooltip on its product', async () => {
    // Given the product of a saas platform registered in the Hub
    mockTranslationsWithValues();
    renderProductChip(VERSION);

    // When the user focuses the product
    fireEvent.focus(screen.getByText(PRODUCT_NAME));

    // Then a tooltip shows the version reported to the Hub
    const tooltip = await screen.findByRole('tooltip');
    expect(
      within(tooltip).getByText(
        `CSMBoard.ProductVersion:${JSON.stringify({ version: VERSION })}`
      )
    ).toBeInTheDocument();
  });

  it('should display no version tooltip on the product of a saas platform that is not registered in the Hub', () => {
    // Given the product of a saas platform the Hub does not know
    renderProductChip(null);

    // When the user focuses the product
    fireEvent.focus(screen.getByText(PRODUCT_NAME));

    // Then no tooltip opens
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
