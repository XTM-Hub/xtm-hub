import HomepageResourceList from '@/components/homepage/resources/HomepageResourceList';
import { getTranslate } from '@/hooks/get-translate';
import { PublicLocale } from '@/i18n/config';
import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '@/utils/constant';
import {
  MostDeployedDocumentsQueryDocument,
  MostDeployedDocumentsQueryQuery,
  MostDeployedDocumentsQueryQueryVariables,
  PlatformIdentifier,
} from '@graphql/generated';

const MOST_DEPLOYED_LIMIT = 8;

type MostDeployedResourcesProps = {
  platformIdentifiers?: PlatformIdentifier[];
  isAuthenticated?: boolean;
  paramsLocale?: PublicLocale;
};

const MostDeployedResources = async ({
  platformIdentifiers,
  isAuthenticated = false,
  paramsLocale,
}: MostDeployedResourcesProps) => {
  const t = await getTranslate('HomePage.XtmMostDeployedResources');

  const data = await serverGraphqlFetch<
    MostDeployedDocumentsQueryQuery,
    MostDeployedDocumentsQueryQueryVariables
  >(
    MostDeployedDocumentsQueryDocument,
    {
      limit: MOST_DEPLOYED_LIMIT,
      platformIdentifiers: platformIdentifiers ?? [],
    },
    { next: { revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS } }
  );

  return (
    <HomepageResourceList
      title={t('Title')}
      documents={data.mostDeployedDocuments}
      isAuthenticated={isAuthenticated}
      paramsLocale={paramsLocale}
    />
  );
};

export default MostDeployedResources;
