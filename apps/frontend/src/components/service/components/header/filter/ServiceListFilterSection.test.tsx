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

  const description = 'filter-description';
  const filtersWithDescription = {
    [ServiceListFilterKey.Verified]: {
      title: firstTitle,
      description,
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

  const inlineFilterWithDescription = {
    [ServiceListFilterKey.ProductVersion]: {
      ...inlineFilter[ServiceListFilterKey.ProductVersion],
      description,
    },
  };

  const infoButtonName = 'Service.List.FilterInformation';

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

  it('should put the info button beside the section header, outside its button and heading', () => {
    // Given
    // When
    testRender(<ServiceListFilterSection filters={filtersWithDescription} />);

    // Then
    const infoButton = screen.getByRole('button', { name: infoButtonName });
    expect(
      screen.getByRole('button', { name: firstTitle })
    ).not.toContainElement(infoButton);
    expect(screen.getByRole('heading', { level: 3 })).not.toContainElement(
      infoButton
    );
  });

  it('should show the description when the user hovers the info button', async () => {
    // Given
    const { user } = testRender(
      <ServiceListFilterSection filters={filtersWithDescription} />
    );
    const infoButton = screen.getByRole('button', { name: infoButtonName });

    // When
    await user.hover(infoButton);

    // Then
    expect(await screen.findByRole('tooltip')).toHaveTextContent(description);
    expect(infoButton).toHaveAccessibleDescription(description);
  });

  it('should show the description when the user reaches the info button with the keyboard', async () => {
    // Given
    const { user } = testRender(
      <ServiceListFilterSection filters={filtersWithDescription} />
    );

    // When
    await user.tab();
    await user.tab();

    // Then
    expect(screen.getByRole('button', { name: infoButtonName })).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(description);
  });

  it('should keep the section open when the user clicks the info button', async () => {
    // Given
    const { user } = testRender(
      <ServiceListFilterSection filters={filtersWithDescription} />
    );

    // When
    await user.click(screen.getByRole('button', { name: infoButtonName }));

    // Then
    expect(screen.getByRole('button', { name: firstTitle })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('should still collapse a section that has a description', async () => {
    // Given
    const { user } = testRender(
      <ServiceListFilterSection filters={filtersWithDescription} />
    );
    const sectionButton = screen.getByRole('button', { name: firstTitle });

    // When
    await user.click(sectionButton);

    // Then
    expect(sectionButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(firstContent)).not.toBeInTheDocument();
  });

  it('should show the info button of an inline filter', () => {
    // Given
    // When
    testRender(
      <ServiceListFilterSection filters={inlineFilterWithDescription} />
    );

    // Then
    expect(
      screen.getByRole('button', { name: infoButtonName })
    ).toBeInTheDocument();
  });

  it('should show the description as text instead of an info button when asked to', () => {
    // Given
    // When
    testRender(
      <ServiceListFilterSection
        filters={filtersWithDescription}
        descriptionDisplay="text"
      />
    );

    // Then
    expect(screen.getByText(description)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: infoButtonName })
    ).not.toBeInTheDocument();
  });

  it('should show the description of an inline filter as text when asked to', () => {
    // Given
    // When
    testRender(
      <ServiceListFilterSection
        filters={inlineFilterWithDescription}
        descriptionDisplay="text"
      />
    );

    // Then
    expect(screen.getByText(description)).toBeVisible();
  });
});
