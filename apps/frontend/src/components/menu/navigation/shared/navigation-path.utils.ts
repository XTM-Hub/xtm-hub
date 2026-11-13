import type { SectionConfig } from '@/components/menu/navigation/shared/navigation.type';

const safeDecode = (path: string) => {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

// Subpages match, so a root link such as `/app`, which would match every page, must not use this.
export const isNavigationPathActive = (currentPath: string, href: string) => {
  const current = safeDecode(currentPath);
  const target = safeDecode(href);

  return current === target || current.startsWith(`${target}/`);
};

// No segment boundary on purpose: `/app/service/opencti` also holds `/app/service/opencti_registration/<id>`.
export const isSectionPathActive = (
  section: SectionConfig,
  currentPath: string
) => currentPath.startsWith(section.pathPrefix);

export const findActiveSectionKey = (
  sections: SectionConfig[],
  currentPath: string
) =>
  sections
    .filter(
      (section) => !section.href && isSectionPathActive(section, currentPath)
    )
    .sort((a, b) => b.pathPrefix.length - a.pathPrefix.length)[0]?.key;
