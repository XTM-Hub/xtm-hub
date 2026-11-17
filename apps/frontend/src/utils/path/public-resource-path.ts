import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';

/**
 * Public path of a resource, without leading slash:
 * `cybersecurity-solutions/<serviceSlug>/<resourceSlug>`. Callers prefix it
 * with a locale (`/en/…`) or the platform base url (`https://…/…`).
 */
export const publicResourcePath = (
  serviceSlug: string | null | undefined,
  resourceSlug: string | null | undefined
): string =>
  `${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceSlug}/${resourceSlug}`;
