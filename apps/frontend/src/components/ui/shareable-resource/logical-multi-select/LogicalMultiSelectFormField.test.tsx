import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  isLogicalMultiSelectSelection,
  LogicalMultiSelectFormField,
} from './LogicalMultiSelectFormField';

describe('LogicalMultiSelectFormField', () => {
  it('validates selection objects', () => {
    expect(isLogicalMultiSelectSelection({ a: ['x'] })).toBe(true);
    expect(isLogicalMultiSelectSelection({ a: [1] })).toBe(false);
    expect(isLogicalMultiSelectSelection(null)).toBe(false);
    expect(isLogicalMultiSelectSelection(['x'])).toBe(false);
  });

  it('applies parent/child toggle semantics', async () => {
    const onValueChange = vi.fn();
    const { user } = testRender(
      <LogicalMultiSelectFormField
        options={[
          {
            label: 'Parent A',
            value: 'a',
            children: [
              { label: 'A1', value: 'a1' },
              { label: 'A2', value: 'a2' },
            ],
          },
        ]}
        initialValue={{}}
        noResultString="no-result"
        optionLabel="label"
        onValueChange={onValueChange}
      />
    );

    await user.click(screen.getByRole('checkbox', { name: 'A1' }));
    expect(onValueChange).toHaveBeenLastCalledWith({ a: ['a1'] });

    await user.click(screen.getByRole('checkbox', { name: 'A2' }));
    expect(onValueChange).toHaveBeenLastCalledWith({ a: [] });

    await user.click(screen.getByRole('checkbox', { name: 'A1' }));
    expect(onValueChange).toHaveBeenLastCalledWith({ a: ['a2'] });

    await user.click(screen.getByRole('checkbox', { name: 'Parent A' }));
    expect(onValueChange).toHaveBeenLastCalledWith({ a: [] });

    await user.click(screen.getByRole('checkbox', { name: 'Parent A' }));
    expect(onValueChange).toHaveBeenLastCalledWith({});
  });
});
