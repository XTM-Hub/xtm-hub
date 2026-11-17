import ShareableResourceCard from '@/components/ui/shareable-resource/ShareableResourceCard';
import { PublicLocale } from '@/i18n/config';
import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';
import {
  SHAREABLE_RESOURCE_SERVICE_DEFINITION_IDENTIFIER_MAPPING,
  SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { HomepageResourceDocumentFragment } from '@graphql/generated';
import { useLocale } from 'next-intl';

type HomepageResourceListProps = {
  title: string;
  documents: HomepageResourceDocumentFragment[];
  baseUrl: string;
  isAuthenticated?: boolean;
  paramsLocale?: PublicLocale;
};

const HomepageResourceList = ({
  title,
  documents,
  baseUrl,
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
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-4">
        {documents.map((resource) => {
          const resourceType = resource.type as ShareableResourceType;
          const serviceSlug =
            SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING[resourceType];
          if (!serviceSlug || !resource.slug) return null;

          const publicPath = `${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceSlug}/${resource.slug}`;
          const detailUrl =
            isAuthenticated && resource.service_instance_id
              ? `/app/service/${SHAREABLE_RESOURCE_SERVICE_DEFINITION_IDENTIFIER_MAPPING[resourceType]}/${resource.service_instance_id}/${resource.id}`
              : `/${usedLocale}/${publicPath}`;

          // The card builds the logo url from the service instance id: without
          // one, drop the logo so the card falls back to its default image.
          const cardDocument = resource.service_instance_id
            ? resource
            : { ...resource, children_documents: null };

          return (
            <ShareableResourceCard
              key={resource.id}
              document={cardDocument}
              detailUrl={detailUrl}
              shareLinkUrl={`${baseUrl}/${publicPath}`}
              serviceInstance={{ id: resource.service_instance_id ?? '' }}
              publicPath={!isAuthenticated}
            />
          );
        })}
      </ul>
    </section>
  );
};

export default HomepageResourceList;
