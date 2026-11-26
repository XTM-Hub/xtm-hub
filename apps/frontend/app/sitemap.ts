import { defaultLocale, publicLocales } from '@/i18n/config';
import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';
import { fetchSeoServiceInstances } from '@/utils/seo-service-instance/utils/seo-service-instance.server.utils';
import { isExternalService } from '@/utils/services';
import { fetchServerSettings } from '@/utils/settings.service';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { fetchPublicDocumentSlugs } from '@/utils/shareable-resources/utils/shareable-resources.server.utils';
import { ServiceDefinitionIdentifier } from '@graphql/generated';
import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

const buildLanguageMap = (baseURI: string, path: string) => {
  const languages: Record<string, string> = {};
  for (const loc of publicLocales) {
    languages[loc] = `${baseURI}/${loc}${path}`;
  }
  languages['x-default'] = `${baseURI}/${defaultLocale}${path}`;
  return languages;
};

const pushPerLocale = (
  sitemap: MetadataRoute.Sitemap,
  baseURI: string,
  path: string,
  entry: {
    lastModified: string | Date;
    changeFrequency: 'monthly';
    priority: number;
  }
) => {
  const languages = buildLanguageMap(baseURI, path);
  for (const loc of publicLocales) {
    sitemap.push({
      ...entry,
      url: `${baseURI}/${loc}${path}`,
      alternates: { languages },
    });
  }
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { base_url_front: baseURI } = await fetchServerSettings();

  const seoServiceInstancesData = await fetchSeoServiceInstances();
  const routableSeoServiceInstances = seoServiceInstancesData.filter(
    (service) =>
      service.slug !== null &&
      service.slug !== undefined &&
      !isExternalService(
        service.service_definition!.identifier as ServiceDefinitionIdentifier
      )
  );

  const sitemap: MetadataRoute.Sitemap = [];

  pushPerLocale(sitemap, baseURI, '', {
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  });

  const documentBearingServiceSlugs = new Set<string>(
    Object.values(ServiceSlug)
  );

  for (const service of routableSeoServiceInstances) {
    const servicePath = `/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${service.slug}`;
    pushPerLocale(sitemap, baseURI, servicePath, {
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    });
  }

  const documentBearingServices = routableSeoServiceInstances.filter(
    (service) => documentBearingServiceSlugs.has(service.slug as string)
  );

  const servicesWithResources = await Promise.all(
    documentBearingServices.map(async (service) => ({
      service,
      resources: await fetchPublicDocumentSlugs(service.slug as ServiceSlug),
    }))
  );

  for (const { service, resources } of servicesWithResources) {
    const servicePath = `/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${service.slug}`;
    for (const resource of resources) {
      if (!resource.slug) continue;
      const docPath = `${servicePath}/${resource.slug}`;
      pushPerLocale(sitemap, baseURI, docPath, {
        lastModified: resource.updated_at ?? resource.created_at,
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }
  }

  return sitemap;
}
