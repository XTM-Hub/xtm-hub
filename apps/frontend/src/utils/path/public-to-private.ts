import { getFeatureVotingPrivatePath } from '@/components/feature-voting/feature-voting-path';
import { publicLocales } from '@/i18n/config';
import {
  APP_PATH,
  FEATURE_VOTING_SEGMENT,
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
  XTM_PLATFORM_ROADMAP_SLUG,
  XTM_PLATFORM_TRIAL_PATH,
  XTM_PLATFORM_TRIAL_SLUG,
} from '@/utils/path/constant';
import { encodeRedirectValue } from '@/utils/redirect';
import { fetchSeoServiceInstances } from '@/utils/seo-service-instance/utils/seo-service-instance.server.utils';
import { isExternalService } from '@/utils/services';
import {
  fetchSingleDocument,
  isPublicDocumentSlug,
} from '@/utils/shareable-resources/utils/shareable-resources.server.utils';

const isPublicLocale = (value: string | undefined): boolean =>
  publicLocales.some((locale) => locale === value);

/**
 * Turns a public page path (`/{locale}/cybersecurity-solutions/{serviceSlug}[/{docSlug}]`)
 * into the path of its private counterpart, or null when it has none.
 */
export const resolvePrivatePath = async (
  publicPath: string
): Promise<string | null> => {
  const segments = new URL(publicPath, 'http://local').pathname
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
  const [locale, section, serviceSlug, docSlug, ...rest] = segments;

  if (
    !isPublicLocale(locale) ||
    section !== PUBLIC_CYBERSECURITY_SOLUTIONS_PATH ||
    !serviceSlug ||
    rest.length > 0
  ) {
    return null;
  }

  if (serviceSlug === XTM_PLATFORM_TRIAL_SLUG && !docSlug) {
    return XTM_PLATFORM_TRIAL_PATH;
  }

  const services = await fetchSeoServiceInstances();
  const service = services.find(({ slug }) => slug === serviceSlug);
  if (!service || isExternalService(service.service_definition.identifier)) {
    return null;
  }

  if (
    serviceSlug === XTM_PLATFORM_ROADMAP_SLUG &&
    docSlug === FEATURE_VOTING_SEGMENT
  ) {
    return getFeatureVotingPrivatePath(service.id);
  }

  const servicePath = `/${APP_PATH}/service/${service.service_definition.identifier}/${encodeRedirectValue(service.id)}`;
  if (!docSlug) {
    return servicePath;
  }

  // The API errors on an unknown slug: check it against the cached slug list
  // first, as the public document page does.
  const document = (await isPublicDocumentSlug(serviceSlug, docSlug))
    ? await fetchSingleDocument(service.id, serviceSlug, docSlug)
    : null;

  return document
    ? `${servicePath}/${encodeRedirectValue(document.id)}`
    : servicePath;
};
