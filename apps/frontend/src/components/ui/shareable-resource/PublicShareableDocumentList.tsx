import { buildDocumentListColumns } from '@/components/service/components/DocumentListColumns';
import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import { DataTable } from '@/components/ui/data-table';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import ShareableResourceCard from '@/components/ui/shareable-resource/ShareableResourceCard';
import useScrollPosition from '@/hooks/use-scroll-position';
import { useTranslate } from '@/hooks/use-translate';
import {
  analyticsResource,
  toAnalyticsResourceData,
} from '@/lib/analytics/analytics.context';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { publicResourcePath } from '@/utils/path/public-resource-path';
import {
  PublicDocumentListItemFragment,
  SeoServiceInstanceItemFragment,
} from '@graphql/generated';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

interface PublicShareableDocumentListProps {
  documents: PublicDocumentListItemFragment[];
  serviceInstance: SeoServiceInstanceItemFragment;
  baseUrl: string;
  displayMode: ServiceListDisplayMode;
}

export const PublicShareableDocumentList = ({
  documents,
  serviceInstance,
  baseUrl,
  displayMode,
}: PublicShareableDocumentListProps) => {
  const locale = useLocale();
  const { save } = useScrollPosition();
  const t = useTranslate();
  const router = useRouter();

  const tableColumns = useMemo(
    () =>
      buildDocumentListColumns({
        documents,
        t,
        publicPath: true,
        renderActions: (document) => (
          // eslint-disable-next-line no-restricted-syntax -- container whose children carry the IDs
          <div onClick={(event) => event.stopPropagation()}>
            <ShareLinkButton
              analyticsId="resource_share"
              documentId={document.id}
              url={`${baseUrl}/${publicResourcePath(serviceInstance.slug, document.slug)}`}
              size="sm"
            />
          </div>
        ),
      }),
    [baseUrl, documents, serviceInstance.slug, t]
  );

  return (
    <>
      {displayMode === ServiceListDisplayMode.Tab ? (
        <ul
          className={
            'grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-4'
          }>
          {documents.map((document) => (
            <ShareableResourceCard
              publicPath
              key={document.id}
              document={document}
              serviceInstance={serviceInstance}
              detailUrl={`/${locale}/${publicResourcePath(serviceInstance.slug, document.slug)}`}
              shareLinkUrl={`${baseUrl}/${publicResourcePath(serviceInstance.slug, document.slug)}`}
            />
          ))}
        </ul>
      ) : (
        <DataTable
          {...getDataTableLabels(t)}
          columns={tableColumns}
          data={documents}
          toolbar={<></>}
          getRowAnalyticsId={() => 'resource_open'}
          getRowAnalyticsResource={({ original }) =>
            analyticsResource(toAnalyticsResourceData(original))
          }
          onClickRow={(row) => {
            save();
            router.push(
              `/${locale}/${publicResourcePath(serviceInstance.slug, row.original.slug)}`
            );
          }}
        />
      )}
    </>
  );
};
