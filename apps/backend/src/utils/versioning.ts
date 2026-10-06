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
