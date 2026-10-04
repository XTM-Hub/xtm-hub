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

  it('follows a selection reset by its parent while it stays mounted', async () => {
    const onValueChange = vi.fn();
    const field = (initialValue: Record<string, string[]>) => (
      <LogicalMultiSelectFormField
        options={[
          { label: 'Finance', value: 'Finance' },
          { label: 'Energy', value: 'Energy' },
        ]}
        initialValue={initialValue}
        noResultString="no-result"
        optionLabel="label"
        onValueChange={onValueChange}
      />
    );
    const { user, rerender } = testRender(field({ Finance: [] }));
    expect(screen.getByRole('checkbox', { name: 'Finance' })).toBeChecked();

    // Filters reset by the parent
    rerender(field({}));
    expect(screen.getByRole('checkbox', { name: 'Finance' })).not.toBeChecked();

    // The next click starts from the reset selection, not the stale one
    await user.click(screen.getByRole('checkbox', { name: 'Energy' }));
    expect(onValueChange).toHaveBeenLastCalledWith({ Energy: [] });
  });

  it('resolves facet counts when the option value is a Relay global id but the facet bucket is keyed by the raw uuid', () => {
    const globalId =
      'VXNlQ2FzZTowMGU4YjQ0ZC04MzBhLTQwNjYtYmM5Ny1mOGM0ZWU1YjUzYTU=';
    const rawUuid = '00e8b44d-830a-4066-bc97-f8c4ee5b53a5';

    testRender(
      <LogicalMultiSelectFormField
        options={[{ label: 'Use case A', value: globalId }]}
        initialValue={{}}
        noResultString="no-result"
        optionLabel="label"
        onValueChange={vi.fn()}
        facetCounts={{ [rawUuid]: 2 }}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('falls back to 0 when neither the raw value nor its decoded id are in the facet counts', () => {
    testRender(
      <LogicalMultiSelectFormField
        options={[{ label: 'Unmatched', value: 'unmatched-value' }]}
        initialValue={{}}
        noResultString="no-result"
        optionLabel="label"
        onValueChange={vi.fn()}
        facetCounts={{ 'some-other-id': 5 }}
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
