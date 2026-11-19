import { findLogoUrl } from '@/components/homepage/Homepage.utils';
import HomepageResourceCard from '@/components/homepage/resources/HomepageResourceCard';
import { PublicLocale } from '@/i18n/config';
import {
  analyticsResource,
  toAnalyticsResourceData,
} from '@/lib/analytics/analytics.context';
import { isDocumentPublished } from '@/utils/documents';
import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';
import {
  SHAREABLE_RESOURCE_LIBRARY_MAPPING,
  SHAREABLE_RESOURCE_PRODUCT_MAPPING,
  SHAREABLE_RESOURCE_SERVICE_DEFINITION_IDENTIFIER_MAPPING,
  SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { docHasMetadata } from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import { HomepageDocumentFragment } from '@graphql/generated';
import { useLocale } from 'next-intl';

type HomepageResourceListProps = {
  title: string;
  documents: HomepageDocumentFragment[];
  isAuthenticated?: boolean;
  paramsLocale?: PublicLocale;
};

const HomepageResourceList = ({
  title,
  documents,
  isAuthenticated = false,
  paramsLocale,
}: HomepageResourceListProps) => {
  const globalLocale = useLocale();
  const usedLocale = paramsLocale ?? globalLocale;
  if (documents.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="title-md">{title}</h2>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-6">
        {documents.map((resource) => {
          const resourceType = resource.type as ShareableResourceType;
          const serviceSlug =
            SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING[resourceType];
          if (!serviceSlug || !resource.slug) return null;

          const url =
            isAuthenticated && resource.service_instance_id
              ? `/app/service/${SHAREABLE_RESOURCE_SERVICE_DEFINITION_IDENTIFIER_MAPPING[resourceType]}/${resource.service_instance_id}/${resource.id}`
              : `/${usedLocale}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceSlug}/${resource.slug}`;
          const footerTags = [
            SHAREABLE_RESOURCE_PRODUCT_MAPPING[resourceType],
            SHAREABLE_RESOURCE_LIBRARY_MAPPING[resourceType],
          ];

          const logoUrl = findLogoUrl(resource);

          const verified =
            docHasMetadata(resource, 'verified') && Boolean(resource.verified);
          const deployable =
            docHasMetadata(resource, 'manager_supported') &&
            Boolean(resource.manager_supported);

          const published =
            isDocumentPublished(resource.status) &&
            resource.type !== ShareableResourceType.OPENCTI_INTEGRATION;

          return (
            <li
              key={resource.id}
              {...analyticsResource(toAnalyticsResourceData(resource))}>
              <HomepageResourceCard
                key={resource.id}
                name={resource.name ?? ''}
                shortDescription={resource.short_description}
                url={url}
                logoUrl={logoUrl}
                published={published}
                verified={verified}
                deployable={deployable}
                useCases={
                  resource.use_cases?.map((uc) => ({
                    id: uc.id,
                    name: uc.name,
                  })) ?? []
                }
                footerTags={footerTags}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default HomepageResourceList;
