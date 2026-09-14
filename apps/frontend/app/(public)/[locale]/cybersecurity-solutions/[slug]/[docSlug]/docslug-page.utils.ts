/**
 * Returns whether `slug` belongs to the given list of known document slugs.
 * Used to short-circuit unknown/guessed `docSlug` navigations on the front
 * end, before ever calling the backend for the document detail.
 */
export const isKnownDocumentSlug = (
  knownSlugs: Array<string | null | undefined>,
  slug: string
): boolean => knownSlugs.includes(slug);
