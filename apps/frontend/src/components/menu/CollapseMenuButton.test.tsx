import { CollapseMenuButton } from '@/components/menu/CollapseMenuButton';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('CollapseMenuButton', () => {
  it.each([true, false])(
    'should keep the button named and hide both panel icons from assistive technology when open is %s',
    (open) => {
      // Given / When
      testRender(
        <CollapseMenuButton
          open={open}
          handleOpenMenu={vi.fn()}
        />
      );

      // Then
      const button = screen.getByRole('button', {
        name: 'App.CollapseSidebar',
      });
      const icons = button.querySelectorAll('svg');
      expect(icons).toHaveLength(2);
      icons.forEach((icon) =>
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      );
    }
  );
});
