export const semanticVersionRegex = /^[0-9]+\.[0-9]+\.[0-9]+$/;
export const validLtsVersionRegex = /^[0-9]+\.[0-9]+\.[0-9]+-lts(\.[0-9]+)?$/;

const isSemanticVersion = (version: string): boolean => {
  return semanticVersionRegex.test(version);
};

const isLtsVersion = (version: string): boolean => {
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

// The API accepts any LTS case and the inline revision (`-LTS2`), compared as
// `-lts.2`.
const INLINE_LTS_REVISION = /^(\d+\.\d+\.\d+-lts)(\d+)$/;
const normalizeLtsRevision = (version: string) =>
  version.trim().toLowerCase().replace(INLINE_LTS_REVISION, '$1.$2');

export const compareVersions = (rawA: string, rawB: string) => {
  const a = normalizeLtsRevision(rawA);
  const b = normalizeLtsRevision(rawB);
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

  // Across release tracks, versions compare on their numeric core, as the
  // catalog orders padded versions: an LTS release only ranks above the
  // regular release it is based on, never above a later one.
  if ((aIsSemantic || aIsLts) && (bIsSemantic || bIsLts)) {
    const coreComparison = compareSemanticVersions(
      toCoreVersion(a),
      toCoreVersion(b)
    );
    if (coreComparison !== 0) {
      return coreComparison;
    }
  }

  return aIsLts ? 1 : -1;
};

const toCoreVersion = (version: string) => version.split('-lts')[0]!;

const compareLtsVersions = (a: string, b: string) => {
  const splittedA = a.split('.');
  const splittedB = b.split('.');
  const aMajorVersion = +splittedA[0]!;
  const bMajorVersion = +splittedB[0]!;

  if (aMajorVersion !== bMajorVersion) {
    return aMajorVersion > bMajorVersion ? 1 : -1;
  }

  const aDateVersion = +splittedA[1]!;
  const bDateVersion = +splittedB[1]!;

  if (aDateVersion !== bDateVersion) {
    return aDateVersion > bDateVersion ? 1 : -1;
  }

  const aMinorVersion = +splittedA[2]!.replace('-lts', '');
  const bMinorVersion = +splittedB[2]!.replace('-lts', '');

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
    const a2 = +a1[i]! || 0;
    const b2 = +b1[i]! || 0;

    if (a2 !== b2) {
      return a2 > b2 ? 1 : -1;
    }
  }

  return 0;
};
