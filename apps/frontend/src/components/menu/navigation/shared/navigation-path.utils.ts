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
