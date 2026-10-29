import testRender from '@/utils/test/test-render';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  SegmentedControl,
  type SegmentedControlItem,
} from './SegmentedControl';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const LABEL = 'Period';

const items: SegmentedControlItem<string>[] = [
  { value: 'week', label: '7 days' },
  { value: 'month', label: '30 days' },
  { value: 'quarter', label: '90 days' },
];

const renderSegmentedControl = (
  value: string,
  onValueChange = vi.fn(),
  disabled?: boolean
) =>
  testRender(
    <SegmentedControl
      aria-label={LABEL}
      items={items}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    />
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SegmentedControl', () => {
  it('should display a labelled radio for each item, in order', () => {
    // Given / When
    renderSegmentedControl('week');

    // Then
    const group = screen.getByRole('radiogroup', { name: LABEL });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.textContent)
    ).toEqual(['7 days', '30 days', '90 days']);
  });

  it.each`
    value        | label
    ${'week'}    | ${'7 days'}
    ${'month'}   | ${'30 days'}
    ${'quarter'} | ${'90 days'}
  `(
    'should check only the $label radio when the value is $value',
    ({ value, label }) => {
      // Given / When
      renderSegmentedControl(value);

      // Then
      expect(screen.getByRole('radio', { checked: true })).toHaveAccessibleName(
        label
      );
      expect(screen.getAllByRole('radio', { checked: false })).toHaveLength(2);
    }
  );

  it('should notify the value of the item clicked', async () => {
    // Given
    const onValueChange = vi.fn();
    const { user } = renderSegmentedControl('week', onValueChange);

    // When
    await user.click(screen.getByRole('radio', { name: '90 days' }));

    // Then
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('quarter');
  });

  it('should not notify a change when the selected item is clicked again', async () => {
    // Given
    const onValueChange = vi.fn();
    const { user } = renderSegmentedControl('month', onValueChange);

    // When
    await user.click(screen.getByRole('radio', { name: '30 days' }));

    // Then
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('should make the checked item the only tab stop of the group', async () => {
    // Given
    const { user } = renderSegmentedControl('month');

    // When
    await user.tab();

    // Then
    expect(screen.getByRole('radio', { name: '30 days' })).toHaveFocus();
    expect(
      screen
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('tabindex'))
    ).toEqual(['-1', '0', '-1']);
  });

  it('should make the first item the tab stop when no item matches the value', () => {
    // Given / When
    renderSegmentedControl('year');

    // Then
    expect(
      screen
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('tabindex'))
    ).toEqual(['0', '-1', '-1']);
  });

  it.each`
    value        | key             | label        | expected
    ${'month'}   | ${'ArrowRight'} | ${'90 days'} | ${'quarter'}
    ${'month'}   | ${'ArrowDown'}  | ${'90 days'} | ${'quarter'}
    ${'month'}   | ${'ArrowLeft'}  | ${'7 days'}  | ${'week'}
    ${'month'}   | ${'ArrowUp'}    | ${'7 days'}  | ${'week'}
    ${'month'}   | ${'Home'}       | ${'7 days'}  | ${'week'}
    ${'month'}   | ${'End'}        | ${'90 days'} | ${'quarter'}
    ${'quarter'} | ${'ArrowRight'} | ${'7 days'}  | ${'week'}
    ${'week'}    | ${'ArrowLeft'}  | ${'90 days'} | ${'quarter'}
  `(
    'should focus and select the $label item when $key is pressed on $value',
    async ({ value, key, label, expected }) => {
      // Given
      const onValueChange = vi.fn();
      const { user } = renderSegmentedControl(value, onValueChange);
      await user.tab();

      // When
      await user.keyboard(`{${key}}`);

      // Then
      expect(screen.getByRole('radio', { name: label })).toHaveFocus();
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith(expected);
    }
  );

  it('should not notify a change when a key lands on the selected item', async () => {
    // Given
    const onValueChange = vi.fn();
    const { user } = renderSegmentedControl('week', onValueChange);
    await user.tab();

    // When
    await user.keyboard('{Home}');

    // Then
    expect(screen.getByRole('radio', { name: '7 days' })).toHaveFocus();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('should disable every item and leave the tab order when disabled', async () => {
    // Given
    const { user } = renderSegmentedControl('month', vi.fn(), true);

    // When
    await user.tab();

    // Then
    expect(screen.getByRole('radiogroup', { name: LABEL })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    screen.getAllByRole('radio').forEach((radio) => {
      expect(radio).toBeDisabled();
      expect(radio).not.toHaveFocus();
    });
  });

  it('should not notify a change when an item of a disabled group is clicked', async () => {
    // Given
    const onValueChange = vi.fn();
    const { user } = renderSegmentedControl('week', onValueChange, true);

    // When
    await user.click(screen.getByRole('radio', { name: '90 days' }), {
      pointerEventsCheck: 0,
    });

    // Then
    expect(onValueChange).not.toHaveBeenCalled();
  });

  describe('with a disabled item', () => {
    const REASON = 'Coming soon';
    const itemsWithDisabled: SegmentedControlItem<string>[] = [
      { value: 'week', label: '7 days' },
      { value: 'month', label: '30 days', disabled: true, tooltip: REASON },
      { value: 'quarter', label: '90 days' },
    ];

    const renderWithDisabledItem = (value: string, onValueChange = vi.fn()) =>
      testRender(
        <SegmentedControl
          aria-label={LABEL}
          items={itemsWithDisabled}
          value={value}
          onValueChange={onValueChange}
        />
      );

    it('should not notify a change when the disabled item is clicked', async () => {
      // Given
      const onValueChange = vi.fn();
      const { user } = renderWithDisabledItem('week', onValueChange);

      // When
      await user.click(screen.getByRole('radio', { name: '30 days' }));

      // Then
      expect(screen.getByRole('radio', { name: '30 days' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('should show the tooltip of the disabled item on hover', async () => {
      // Given
      const { user } = renderWithDisabledItem('week');

      // When
      await user.hover(screen.getByRole('radio', { name: '30 days' }));

      // Then
      expect(
        await screen.findByRole('tooltip', { name: REASON })
      ).toBeInTheDocument();
    });

    it.each`
      value        | key             | label        | expected
      ${'week'}    | ${'ArrowRight'} | ${'90 days'} | ${'quarter'}
      ${'quarter'} | ${'ArrowLeft'}  | ${'7 days'}  | ${'week'}
    `(
      'should skip the disabled item when $key is pressed on $value',
      async ({ value, key, label, expected }) => {
        // Given
        const onValueChange = vi.fn();
        const { user } = renderWithDisabledItem(value, onValueChange);
        await user.tab();

        // When
        await user.keyboard(`{${key}}`);

        // Then
        expect(screen.getByRole('radio', { name: label })).toHaveFocus();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith(expected);
      }
    );

    it.each`
      value        | key             | label        | expected
      ${'week'}    | ${'ArrowRight'} | ${'90 days'} | ${'quarter'}
      ${'quarter'} | ${'ArrowLeft'}  | ${'7 days'}  | ${'week'}
    `(
      'should move to the enabled neighbour when $key is pressed on the clicked disabled item',
      async ({ value, key, label, expected }) => {
        // Given
        const onValueChange = vi.fn();
        const { user } = renderWithDisabledItem(value, onValueChange);
        await user.click(screen.getByRole('radio', { name: '30 days' }));

        // When
        await user.keyboard(`{${key}}`);

        // Then
        expect(screen.getByRole('radio', { name: label })).toHaveFocus();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith(expected);
      }
    );

    it('should show the selected disabled item on the disabled fill', () => {
      // Given / When
      renderWithDisabledItem('month');

      // Then
      const radio = screen.getByRole('radio', { name: '30 days' });
      expect(radio).toHaveAttribute('aria-checked', 'true');
      expect(radio).toHaveClass('bg-input-disabled', 'text-default-disabled');
      expect(radio).not.toHaveClass('bg-filigran-brand-primary');
    });

    it('should make the first enabled item the tab stop when the value is the disabled item', () => {
      // Given / When
      renderWithDisabledItem('month');

      // Then
      expect(
        screen
          .getAllByRole('radio')
          .map((radio) => radio.getAttribute('tabindex'))
      ).toEqual(['0', '-1', '-1']);
    });
  });
});
