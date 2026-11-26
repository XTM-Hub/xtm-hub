import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { BreadcrumbNav, BreadcrumbNavLink } from './BreadcrumbNav';

const HOME_LABEL = 'MenuLinks.Home';
const HOME_HREF = '/app';
const SETTINGS_LABEL = 'MenuLinks.Settings';
const PAGE_LABEL = 'MenuLinks.Parameters';
const ORGANIZATION_NAME = 'Filigran';
const MISSING_KEY = 'Service.Unknown';
const KNOWN_KEY = 'Service.Known';
const FALLBACK_LABEL = 'My service';

const HOME_THEN_PAGE: BreadcrumbNavLink[] = [
  { label: HOME_LABEL, href: HOME_HREF },
  { label: PAGE_LABEL },
];

describe('BreadcrumbNav', () => {
  it('should render a link to its destination when the entry has an href', () => {
    // Given
    const value = HOME_THEN_PAGE;

    // When
    testRender(<BreadcrumbNav value={value} />);

    // Then
    expect(screen.getByRole('link', { name: HOME_LABEL })).toHaveAttribute(
      'href',
      HOME_HREF
    );
  });

  it('should name the breadcrumb landmark with its translation', () => {
    // Given
    const value = HOME_THEN_PAGE;

    // When
    testRender(<BreadcrumbNav value={value} />);

    // Then
    expect(
      screen.getByRole('navigation', { name: 'DesignSystem.Breadcrumbs.Label' })
    ).toBeInTheDocument();
  });

  it('should mark the last entry as the current page when it has no href', () => {
    // Given
    const value = HOME_THEN_PAGE;

    // When
    testRender(<BreadcrumbNav value={value} />);

    // Then
    expect(screen.getByText(PAGE_LABEL)).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(
      screen.queryByRole('link', { name: PAGE_LABEL })
    ).not.toBeInTheDocument();
  });

  it('should render plain text without aria-current when an entry without href is not last', () => {
    // Given
    const value = [
      { label: HOME_LABEL, href: HOME_HREF },
      { label: SETTINGS_LABEL },
      { label: PAGE_LABEL },
    ];

    // When
    testRender(<BreadcrumbNav value={value} />);

    // Then
    const settings = screen.getByText(SETTINGS_LABEL);
    expect(settings).not.toHaveAttribute('aria-current');
    expect(
      screen.queryByRole('link', { name: SETTINGS_LABEL })
    ).not.toBeInTheDocument();
  });

  it('should keep the last entry a link to its destination when it has an href', () => {
    // Given
    const value = [{ label: HOME_LABEL, href: HOME_HREF }];

    // When
    testRender(<BreadcrumbNav value={value} />);

    // Then
    expect(screen.getByRole('link', { name: HOME_LABEL })).toHaveAttribute(
      'href',
      HOME_HREF
    );
  });

  it.each<{ name: string; link: BreadcrumbNavLink; expected: string }>([
    {
      name: 'the label as is when it is original',
      link: {
        label: ORGANIZATION_NAME,
        original: true,
        fallback: FALLBACK_LABEL,
      },
      expected: ORGANIZATION_NAME,
    },
    {
      name: 'the fallback when the key is missing',
      link: { label: MISSING_KEY, fallback: FALLBACK_LABEL },
      expected: FALLBACK_LABEL,
    },
  ])('should show $name', ({ link, expected }) => {
    // Given
    const value = [link];

    // When
    testRender(<BreadcrumbNav value={value} />);

    // Then
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('should show the translated label rather than the fallback when the key exists', () => {
    // Given
    vi.mocked(useTranslations).mockReturnValue(
      Object.assign((key: string) => key, {
        has: (key: string) => key === KNOWN_KEY,
        rich: (key: string) => key,
      }) as unknown as ReturnType<typeof useTranslations>
    );
    const value = [{ label: KNOWN_KEY, fallback: FALLBACK_LABEL }];

    // When
    testRender(<BreadcrumbNav value={value} />);

    // Then
    expect(screen.getByText(KNOWN_KEY)).toBeInTheDocument();
  });
});
