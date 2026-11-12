import { ServiceListFilterKey } from '@/components/service/components/header/ServiceListHeader';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  isLogicalMultiSelectSelection,
  LogicalMultiSelectFormField,
} from './LogicalMultiSelectFormField';

const OPTION_LABEL = 'Threat hunting';
const OPTION_VALUE = 'use-case-id';

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

  it('should send the label of the option when the analytics filter gives no value labels', async () => {
    // Given
    startAnalytics();
    const { user } = testRender(
      <LogicalMultiSelectFormField
        options={[{ label: OPTION_LABEL, value: OPTION_VALUE }]}
        initialValue={{}}
        noResultString="no-result"
        optionLabel="label"
        onValueChange={vi.fn()}
        analyticsFilter={{
          filterKey: ServiceListFilterKey.Label,
          resourceType: ShareableResourceType.OPENCTI_PLAYBOOK,
        }}
      />
    );

    // When
    await user.click(screen.getByRole('checkbox', { name: OPTION_LABEL }));

    // Then
    expect(readTrackedEvents('filter_apply')).toEqual([
      expect.objectContaining({ filter_value: OPTION_LABEL }),
    ]);
  });
});
