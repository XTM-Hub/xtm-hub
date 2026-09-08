interface RegisteredPlatform {
  version?: string | null;
  title: string;
}

/**
 * Groups registered platform instance names by version, so the version
 * filter can show every instance name that matches a given version
 * (there can be several instances registered for the same version).
 */
export const groupInstanceNamesByVersion = (
  platforms: RegisteredPlatform[]
): Map<string, string[]> => {
  const namesByVersion = new Map<string, string[]>();
  for (const platform of platforms) {
    if (!platform.version) continue;
    const names = namesByVersion.get(platform.version) ?? [];
    names.push(platform.title);
    namesByVersion.set(platform.version, names);
  }
  return namesByVersion;
};

export const sortVersionsWithRegisteredFirst = (
  versions: string[],
  registeredInstanceNamesByVersion: Map<string, string[]>
): string[] => {
  const registered: string[] = [];
  const others: string[] = [];
  for (const version of versions) {
    if (registeredInstanceNamesByVersion.has(version)) {
      registered.push(version);
    } else {
      others.push(version);
    }
  }
  return [...registered, ...others];
};
