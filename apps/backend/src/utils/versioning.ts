import { OPENCTI_SEMVER_RELEASE_DATES } from './opencti-semver-release-dates';

export const semanticVersionRegex = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const validLtsVersionRegex = /^[0-9]+\.[0-9]+\.[0-9]+-lts(\.[0-9]+|[0-9]+)?$/;

const isSemanticVersion = (version: string): boolean => {
  return semanticVersionRegex.test(version);
};

export const isLtsVersion = (version: string): boolean => {
  return validLtsVersionRegex.test(version);
};

export const isValidVersion = (version: string): boolean => {
  return isSemanticVersion(version) || isLtsVersion(version);
};

export const doesVersionSatisfy = ({
  givenVersion,
  requiredVersion,
}: {
  givenVersion: string;
  requiredVersion: string;
}): boolean => {
  return compareVersions(givenVersion, requiredVersion) >= 0;
};

export const compareVersions = (a: string, b: string) => {
  const aIsSemantic = isSemanticVersion(a);
  const bIsSemantic = isSemanticVersion(b);

  const aIsLts = isLtsVersion(a);
  const bIsLts = isLtsVersion(b);

  if (aIsSemantic && bIsSemantic) {
    return compareSemanticVersions(a, b);
  }

  if (aIsLts && bIsLts) {
    return compareLtsVersions(a, b);
  }

  return aIsLts ? 1 : -1;
};

const compareLtsVersions = (a: string, b: string) => {
  const splittedA = a.split('.');
  const splittedB = b.split('.');
  const aMajorVersion = +(splittedA[0] ?? 0);
  const bMajorVersion = +(splittedB[0] ?? 0);

  if (aMajorVersion !== bMajorVersion) {
    return aMajorVersion > bMajorVersion ? 1 : -1;
  }

  const aDateVersion = +(splittedA[1] ?? 0);
  const bDateVersion = +(splittedB[1] ?? 0);

  if (aDateVersion !== bDateVersion) {
    return aDateVersion > bDateVersion ? 1 : -1;
  }

  const aMinorVersion = +(splittedA[2] ?? '0').replace('-lts', '');
  const bMinorVersion = +(splittedB[2] ?? '0').replace('-lts', '');

  if (aMinorVersion !== bMinorVersion) {
    return aMinorVersion > bMinorVersion ? 1 : -1;
  }

  const aPatchVersion = +(splittedA[3] ?? 0);
  const bPatchVersion = +(splittedB[3] ?? 0);
  if (aPatchVersion !== bPatchVersion) {
    return aPatchVersion > bPatchVersion ? 1 : -1;
  }

  return 0;
};

const compareSemanticVersions = (a: string, b: string) => {
  const a1 = a.split('.');
  const b1 = b.split('.');
  for (let i = 0; i < a1.length; i++) {
    const a2 = +(a1[i] ?? 0);
    const b2 = +(b1[i] ?? 0);

    if (a2 !== b2) {
      return a2 > b2 ? 1 : -1;
    }
  }

  return 0;
};

// OpenCTI tags (github.com/OpenCTI-Platform/opencti/tags): up to 6.9.x the
// versions are semantic (the highest minor ever used is 12), the first calendar
// tag is 7.260224.0 (2026-02-24) and every later release is 7.YYMMDD.patch.
// The 6.9 line kept receiving patches after that date.
// A calendar version carries its release date (YYMMDD) as the middle part,
// which is always 6 digits, whereas a semantic minor never gets that high.
export const CALENDAR_VERSION_MIN_DATE_PART = 100000;

const stripLtsSuffix = (version: string): string =>
  version.replace(/-lts.*$/i, '');

export const isCalendarVersion = (version: string): boolean => {
  const [, datePart] = stripLtsSuffix(version).split('.');
  return Number(datePart) >= CALENDAR_VERSION_MIN_DATE_PART;
};

/**
 * Expresses a version on the calendar scale (`major.YYMMDD.0`) so it can be
 * compared with calendar-versioned requirements.
 * - Calendar versions are returned as is (without the LTS suffix).
 * - Semantic 6.x versions are mapped to their release date; a patch missing
 *   from the table falls back to the nearest known patch of the same minor.
 * - Returns null when the release date is unknown.
 */
export const toCalendarVersion = (version: string): string | null => {
  const base = stripLtsSuffix(version);
  if (!semanticVersionRegex.test(base)) return null;
  if (isCalendarVersion(base)) return base;

  const [major, minor, patch] = base.split('.').map(Number) as [
    number,
    number,
    number,
  ];
  const knownPatches = Object.keys(OPENCTI_SEMVER_RELEASE_DATES)
    .filter((known) => known.startsWith(`${major}.${minor}.`))
    .map((known) => Number(known.split('.')[2]))
    .sort((a, b) => a - b);
  const nearestPatch =
    [...knownPatches].reverse().find((known) => known <= patch) ??
    knownPatches[0];
  if (nearestPatch === undefined) return null;

  const date =
    OPENCTI_SEMVER_RELEASE_DATES[`${major}.${minor}.${nearestPatch}`];
  return date ? `${major}.${date}.0` : null;
};
