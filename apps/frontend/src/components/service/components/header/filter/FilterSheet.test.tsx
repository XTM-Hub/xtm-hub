import { FilterSheet } from '@/components/service/components/header/filter/FilterSheet';
import { ServiceListFilterKey } from '@/components/service/components/header/ServiceListHeader';
import testRender from '@/utils/test/test-render';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const FILTERS_BUTTON_LABEL = 'Service.List.Filters';
const FILTER_TITLE = 'license-type-filter';

describe('FilterSheet', () => {
  it('should show the given filters in the sheet when the filters button is clicked', async () => {
    // Given
    const { user } = testRender(
      <FilterSheet
        filters={{
          [ServiceListFilterKey.LicenseType]: {
            title: FILTER_TITLE,
            node: <div />,
          },
        }}
      />
    );

    // When
    await user.click(
      screen.getByRole('button', { name: FILTERS_BUTTON_LABEL })
    );

    // Then
    expect(
      within(
        screen.getByRole('dialog', { name: FILTERS_BUTTON_LABEL })
      ).getByRole('button', { name: FILTER_TITLE })
    ).toBeInTheDocument();
  });
});
