import { SectionConfig } from '@/components/menu/navigation/shared/navigation.type';
import { SharedNavigation } from '@/components/menu/navigation/shared/SharedNavigation';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

const TestIcon = () => <svg />;
const OPENCTI_PATH = '/app/service/opencti';
const OPENAEV_PATH = '/app/service/openaev';
const OPENCTI_ABOUT_PATH = `${OPENCTI_PATH}/about`;
const OPENAEV_ABOUT_PATH = `${OPENAEV_PATH}/about`;
const SETTINGS_PATH = '/app/admin';
const SETTINGS_PAGE_PATH = `${SETTINGS_PATH}/users`;
const OUTSIDE_PATH = '/app/profile';
const NESTED_PATH = `${OPENCTI_PATH}/library/abc`;
const SIBLING_NESTED_PATH = `${OPENCTI_PATH}/library/def`;

const sections: SectionConfig[] = [
  {
    key: 'opencti',
    label: 'OpenCTI',
    icon: TestIcon,
    pathPrefix: OPENCTI_PATH,
    analyticsId: 'nav_opencti_section_toggle',
    links: [
      {
        label: 'Libraries',
        analyticsId: 'nav_opencti_section_toggle',
        subLinks: [
          {
            href: NESTED_PATH,
            label: 'Library',
            analyticsId: 'nav_blog_open',
          },
          {
            href: SIBLING_NESTED_PATH,
            label: 'Other library',
            analyticsId: 'nav_blog_open',
          },
        ],
      },
      {
        href: OPENCTI_ABOUT_PATH,
        label: 'About',
        analyticsId: 'nav_blog_open',
      },
    ],
  },
  {
    key: 'openaev',
    label: 'OpenAEV',
    icon: TestIcon,
    pathPrefix: OPENAEV_PATH,
    analyticsId: 'nav_openaev_section_toggle',
    links: [
      {
        href: OPENAEV_ABOUT_PATH,
        label: 'AEV about',
        analyticsId: 'nav_blog_open',
      },
    ],
  },
];

const footerSections: SectionConfig[] = [
  {
    key: 'settings',
    label: 'Settings',
    icon: TestIcon,
    pathPrefix: SETTINGS_PATH,
    analyticsId: 'nav_settings_section_toggle',
    links: [
      {
        href: SETTINGS_PAGE_PATH,
        label: 'Users settings',
        analyticsId: 'nav_blog_open',
      },
    ],
  },
];

const renderNavigation = (currentPath: string, open = true) => {
  vi.mocked(usePathname).mockReturnValue(currentPath);
  const navigation = (isOpen: boolean) => (
    <SharedNavigation
      open={isOpen}
      sections={sections}
      footerSections={footerSections}
      bottomLinks={[]}
    />
  );
  const { rerender } = testRender(navigation(open));

  return {
    navigateTo: (path: string) => {
      vi.mocked(usePathname).mockReturnValue(path);
      rerender(navigation(open));
    },
    setOpen: (isOpen: boolean) => rerender(navigation(isOpen)),
  };
};

describe('SharedNavigation', () => {
  it('should open only the section of the current page when the page is inside a section', () => {
    // Given
    renderNavigation(OPENCTI_ABOUT_PATH);

    // When the navigation is rendered

    // Then
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'AEV about' })
    ).not.toBeInTheDocument();
  });

  it('should open the nested group when the current page is one of its sublinks', () => {
    // Given
    renderNavigation(NESTED_PATH);

    // When the navigation is rendered

    // Then
    expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument();
  });

  it('should open the footer section when the current page is inside it', () => {
    // Given
    renderNavigation(SETTINGS_PAGE_PATH);

    // When the navigation is rendered

    // Then
    expect(
      screen.getByRole('link', { name: 'Users settings' })
    ).toBeInTheDocument();
  });

  it('should keep every section closed when the current page is outside them', () => {
    // Given
    renderNavigation(OUTSIDE_PATH);

    // When the navigation is rendered

    // Then
    expect(
      screen.queryByRole('link', { name: 'About' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'AEV about' })
    ).not.toBeInTheDocument();
  });

  it('should close the section of the current page when the user clicks its header', async () => {
    // Given
    renderNavigation(OPENCTI_ABOUT_PATH);

    // When
    await userEvent.click(screen.getByRole('button', { name: 'OpenCTI' }));

    // Then
    expect(
      screen.queryByRole('link', { name: 'About' })
    ).not.toBeInTheDocument();
  });

  it('should keep the section closed when the user closed it and navigates inside it', async () => {
    // Given
    const { navigateTo } = renderNavigation(OPENCTI_ABOUT_PATH);
    await userEvent.click(screen.getByRole('button', { name: 'OpenCTI' }));

    // When
    navigateTo(NESTED_PATH);

    // Then
    expect(
      screen.queryByRole('link', { name: 'About' })
    ).not.toBeInTheDocument();
  });

  it('should keep the nested group closed when the user closed it and navigates inside it', async () => {
    // Given
    const { navigateTo } = renderNavigation(NESTED_PATH);
    await userEvent.click(screen.getByRole('button', { name: 'Libraries' }));

    // When
    navigateTo(SIBLING_NESTED_PATH);

    // Then
    expect(
      screen.queryByRole('link', { name: 'Other library' })
    ).not.toBeInTheDocument();
  });

  it('should open the other section when the navigation moves into it', () => {
    // Given
    const { navigateTo } = renderNavigation(OPENCTI_ABOUT_PATH);

    // When
    navigateTo(OPENAEV_ABOUT_PATH);

    // Then
    expect(screen.getByRole('link', { name: 'AEV about' })).toBeInTheDocument();
  });

  it('should keep the previous section open when the navigation leaves every section', () => {
    // Given
    const { navigateTo } = renderNavigation(OPENCTI_ABOUT_PATH);

    // When
    navigateTo(OUTSIDE_PATH);

    // Then
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
  });

  it('should show the section of the current page open when the collapsed navigation is expanded', () => {
    // Given
    const { setOpen } = renderNavigation(OPENCTI_ABOUT_PATH, false);

    // When
    setOpen(true);

    // Then
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
  });
});
