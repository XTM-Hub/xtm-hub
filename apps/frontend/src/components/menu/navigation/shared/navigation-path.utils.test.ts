import {
  findActiveSectionKey,
  isNavigationPathActive,
} from '@/components/menu/navigation/shared/navigation-path.utils';
import type { SectionConfig } from '@/components/menu/navigation/shared/navigation.type';
import { describe, expect, it } from 'vitest';

const ROADMAP_BASE = '/app/service/xtm_platform_roadmap';
const ROADMAP_HREF = `${ROADMAP_BASE}/U2VydmljZUluc3RhbmNlOjEyMw==`;
const ROADMAP_ENCODED_PATH = `${ROADMAP_BASE}/U2VydmljZUluc3RhbmNlOjEyMw%3D%3D`;

const MALFORMED_PATH = '/app/%E0%A4%A';

describe('isNavigationPathActive', () => {
  it.each([
    ['equal to the href', ROADMAP_HREF, ROADMAP_HREF],
    ['encoded while the href is raw', ROADMAP_ENCODED_PATH, ROADMAP_HREF],
    ['raw while the href is encoded', ROADMAP_HREF, ROADMAP_ENCODED_PATH],
    ['a subpage of the href', `${ROADMAP_HREF}/feature-voting`, ROADMAP_HREF],
    [
      'an encoded subpage of the href',
      `${ROADMAP_ENCODED_PATH}/feature-voting`,
      ROADMAP_HREF,
    ],
    ['the href with a trailing slash', `${ROADMAP_HREF}/`, ROADMAP_HREF],
    ['malformed and equal to the href', MALFORMED_PATH, MALFORMED_PATH],
  ])(
    'should be active when the current path is %s',
    (_name, currentPath, href) => {
      // Given the current path and the href of a link

      // When
      const isActive = isNavigationPathActive(currentPath, href);

      // Then
      expect(isActive).toBe(true);
    }
  );

  it.each([
    ['a sibling sharing the href as prefix', `${ROADMAP_HREF}2`, ROADMAP_HREF],
    ['the parent of the href', ROADMAP_BASE, ROADMAP_HREF],
    ['another id', `${ROADMAP_BASE}/T3RoZXI=`, ROADMAP_HREF],
    ['an unrelated page', '/mock', ROADMAP_HREF],
    ['malformed and different from the href', MALFORMED_PATH, '/app/other'],
  ])(
    'should not be active when the current path is %s',
    (_name, currentPath, href) => {
      // Given the current path and the href of a link

      // When
      const isActive = isNavigationPathActive(currentPath, href);

      // Then
      expect(isActive).toBe(false);
    }
  );
});

describe('findActiveSectionKey', () => {
  const buildSection = (
    key: string,
    pathPrefix: string,
    href?: string
  ): SectionConfig => ({
    key,
    pathPrefix,
    href,
    label: key,
    icon: () => null,
    links: [],
    analyticsId: 'nav_opencti_section_toggle',
  });
  const sections = [
    buildSection('home', '/app', '/app'),
    buildSection('opencti', '/app/service/opencti'),
    buildSection('openaev', '/app/service/openaev'),
  ];

  it.each([
    [
      'a page inside the section',
      '/app/service/openaev/library/abc',
      'openaev',
    ],
    [
      'a sibling service sharing the prefix without a segment boundary',
      '/app/service/opencti_registration/abc',
      'opencti',
    ],
    ['a page outside every section', '/en/blog', undefined],
    ['a page only the linked section covers', '/app/profile', undefined],
  ])(
    'should return the matching section key when the path is %s',
    (_name, currentPath, expectedKey) => {
      // Given the sections of the navigation

      // When
      const key = findActiveSectionKey(sections, currentPath);

      // Then
      expect(key).toBe(expectedKey);
    }
  );

  it('should return the section with the longest matching prefix when several match', () => {
    // Given
    const nested = [
      ...sections,
      buildSection('opencti-library', '/app/service/opencti/library'),
    ];

    // When
    const key = findActiveSectionKey(
      nested,
      '/app/service/opencti/library/abc'
    );

    // Then
    expect(key).toBe('opencti-library');
  });
});
