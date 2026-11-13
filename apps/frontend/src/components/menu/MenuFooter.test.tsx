import { MenuFooter } from '@/components/menu/MenuFooter';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const renderFooter = (open: boolean) =>
  testRender(
    <MenuFooter
      open={open}
      handleOpenMenu={vi.fn()}
    />
  );

describe('MenuFooter', () => {
  it.each([true, false])(
    'should keep the "Made by Filigran" attribution readable when the menu open is %s',
    (open) => {
      // Given / When
      renderFooter(open);

      // Then
      expect(screen.getByText(/App\.MadeBy/)).toHaveTextContent(/Filigran/);
    }
  );

  it.each([true, false])(
    'should hide the Filigran logo from assistive technology when the menu open is %s',
    (open) => {
      // Given / When
      const { container } = renderFooter(open);

      // Then
      expect(container.querySelector('div > svg')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
    }
  );
});
