import { isNavigationPathActive } from '@/components/menu/navigation/shared/navigation-path.utils';
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
