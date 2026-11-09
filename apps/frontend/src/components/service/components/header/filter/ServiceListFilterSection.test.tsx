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

  const tooltip = 'filter-tooltip';
  const filtersWithTooltip = {
    [ServiceListFilterKey.Verified]: {
      title: firstTitle,
      tooltip,
      node: <div>{firstContent}</div>,
    },
  };

  const inlineFilter = {
    [ServiceListFilterKey.ProductVersion]: {
      title: firstTitle,
      node: <div>{firstContent}</div>,
      noAccordion: true,
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

  it('should show the title and the content of a filter when it opts out of the accordion', () => {
    // Given
    // When
    testRender(<ServiceListFilterSection filters={inlineFilter} />);

    // Then
    expect(screen.getByText(firstTitle)).toBeInTheDocument();
    expect(screen.getByText(firstContent)).toBeInTheDocument();
  });

  it('should not let the user collapse a filter when it opts out of the accordion', () => {
    // Given
    // When
    testRender(<ServiceListFilterSection filters={inlineFilter} />);

    // Then
    expect(
      screen.queryByRole('button', { name: firstTitle })
    ).not.toBeInTheDocument();
  });

  it('should explain a filter with its tooltip when the user hovers its section', async () => {
    // Given
    const { user } = testRender(
      <ServiceListFilterSection filters={filtersWithTooltip} />
    );

    // When
    await user.hover(
      screen.getByRole('button', { name: /first-filter-title/ })
    );

    // Then
    expect(await screen.findByRole('tooltip')).toHaveTextContent(tooltip);
  });

  it('should explain a filter with its tooltip when the user reaches its section with the keyboard', async () => {
    // Given
    const { user } = testRender(
      <ServiceListFilterSection filters={filtersWithTooltip} />
    );

    // When
    await user.tab();

    // Then
    expect(await screen.findByRole('tooltip')).toHaveTextContent(tooltip);
  });

  it('should keep the section open while its tooltip is shown', async () => {
    // Given
    const { user } = testRender(
      <ServiceListFilterSection filters={filtersWithTooltip} />
    );
    const sectionButton = screen.getByRole('button', {
      name: /first-filter-title/,
    });

    // When
    await user.hover(sectionButton);
    await screen.findByRole('tooltip');

    // Then
    expect(sectionButton).toHaveAttribute('aria-expanded', 'true');
    expect(sectionButton).toHaveAttribute('data-state', 'open');
  });

  it('should still collapse a section that has a tooltip', async () => {
    // Given
    const { user } = testRender(
      <ServiceListFilterSection filters={filtersWithTooltip} />
    );
    const sectionButton = screen.getByRole('button', {
      name: /first-filter-title/,
    });

    // When
    await user.click(sectionButton);

    // Then
    expect(sectionButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(firstContent)).not.toBeInTheDocument();
  });
});
