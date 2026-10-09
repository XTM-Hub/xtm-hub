import {
  buildDocumentListColumns,
  DOCUMENT_LIST_TABLE_CLASS_NAME,
} from '@/components/service/components/DocumentListColumns';
import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import ShareableResourceCard from '@/components/ui/shareable-resource/ShareableResourceCard';
import useScrollPosition from '@/hooks/use-scroll-position';
import { useTranslate } from '@/hooks/use-translate';
import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';
import { DataTable } from '@filigran/ui';
import { publicDocumentListItemFragment$data } from '@generated/publicDocumentListItemFragment.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

interface PublicShareableDocumentListProps {
  documents: publicDocumentListItemFragment$data[];
  serviceInstance: seoServiceInstanceFragment$data;
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
          <div onClick={(event) => event.stopPropagation()}>
            <ShareLinkButton
              documentId={document.id}
              url={`${baseUrl}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${document.slug}`}
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
            'grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-l'
          }>
          {documents.map((document) => (
            <ShareableResourceCard
              publicPath
              key={document.id}
              document={document}
              serviceInstance={serviceInstance}
              detailUrl={`/${locale}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${document.slug}`}
              shareLinkUrl={`${baseUrl}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${document.slug}`}
            />
          ))}
        </ul>
      ) : (
        <div className={DOCUMENT_LIST_TABLE_CLASS_NAME}>
          <DataTable
            columns={tableColumns}
            data={documents}
            toolbar={<></>}
            onClickRow={(row) => {
              save();
              router.push(
                `/${locale}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${row.original.slug}`
              );
            }}
          />
        </div>
      )}
    </>
  );
};
