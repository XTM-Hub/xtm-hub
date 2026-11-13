import { MenuFooter } from '@/components/menu/MenuFooter';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const renderFooter = (open: boolean) =>
  testRender(
    <MenuFooter
      open={open}
      handleOpenMenu={vi.fn()}
    />
  );

describe('MenuFooter', () => {
  beforeEach(() => {
    vi.mocked(useTranslations).mockReturnValue(
      mockTranslations({ translate: translateWithValues })
    );
  });

  it('should show the "Made by" attribution next to the brand name when the menu is open', () => {
    // Given / When
    renderFooter(true);

    // Then
    expect(screen.getByText(/App\.MadeBy/)).toHaveTextContent(/Filigran/);
  });

  it('should name the collapsed logo through the single "Made by {brand}" message', () => {
    // Given / When
    renderFooter(false);

    // Then
    expect(
      screen.getByText('App.MadeByBrand:{"brand":"Filigran"}')
    ).toBeInTheDocument();
  });

  it.each([true, false])(
    'should hide the Filigran logo from assistive technology when the menu open is %s',
    (open) => {
      // Given / When
      renderFooter(open);

      // Then the logo sits in the same block as the attribution text: the text
      // block itself when open, the sr-only span's parent when collapsed
      const attribution = screen.getByText(/App\.MadeBy/);
      const block = open ? attribution : attribution.parentElement;
      expect(block?.querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
    }
  );
});
