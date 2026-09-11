import { ServiceListFilterSection } from '@/components/service/components/header/filter/ServiceListFilterSection';
import { ServiceListFilterKey } from '@/components/service/components/header/ServiceListHeader';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('ServiceListFilterSection', () => {
  const firstTitle = 'first-filter-title';
  const secondTitle = 'second-filter-title';
  const firstContent = 'first-filter-content';
  const secondContent = 'second-filter-content';

  const filters = {
    [ServiceListFilterKey.Label]: {
      title: firstTitle,
      node: <div>{firstContent}</div>,
    },
    [ServiceListFilterKey.LicenseType]: {
      title: secondTitle,
      node: <div>{secondContent}</div>,
    },
  };

  it('should expand the first filter section by default', () => {
    // Given
    // When
    testRender(<ServiceListFilterSection filters={filters} />);

    // Then
    expect(screen.getByRole('button', { name: firstTitle })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByText(firstContent)).toBeInTheDocument();
  });

  it('should keep the other filter sections collapsed by default', () => {
    // Given
    // When
    testRender(<ServiceListFilterSection filters={filters} />);

    // Then
    expect(screen.getByRole('button', { name: secondTitle })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByText(secondContent)).not.toBeInTheDocument();
  });

  it('should expand the only section when a single filter is provided', () => {
    // Given
    const singleFilter = {
      [ServiceListFilterKey.Label]: {
        title: firstTitle,
        node: <div>{firstContent}</div>,
      },
    };

    // When
    testRender(<ServiceListFilterSection filters={singleFilter} />);

    // Then
    expect(screen.getByRole('button', { name: firstTitle })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('should render no section when no filter is provided', () => {
    // Given
    // When
    testRender(<ServiceListFilterSection filters={{}} />);

    // Then
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('should expand the first rendered section when earlier filters are absent', () => {
    // Given
    const filtersWithMissingFirst = {
      [ServiceListFilterKey.Label]: undefined,
      [ServiceListFilterKey.LicenseType]: {
        title: secondTitle,
        node: <div>{secondContent}</div>,
      },
    };

    // When
    testRender(<ServiceListFilterSection filters={filtersWithMissingFirst} />);

    // Then
    expect(screen.getByRole('button', { name: secondTitle })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByText(secondContent)).toBeInTheDocument();
  });
});
