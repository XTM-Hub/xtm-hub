'use client';

import { DocumentActionsCell } from '@/components/service/components/DocumentActionsCell';
import {
  buildDocumentListColumns,
  DOCUMENT_LIST_TABLE_CLASS_NAME,
} from '@/components/service/components/DocumentListColumns';
import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import ServiceCard from '@/components/service/components/ServiceCard';
import { useServiceContext } from '@/components/service/components/ServiceContext';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import {
  APP_PATH,
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
} from '@/utils/path/constant';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useContext, useMemo } from 'react';

import useScrollPosition from '@/hooks/use-scroll-position';
import { useTranslate } from '@/hooks/use-translate';
import { DataTable } from '@filigran/ui';
import { useRouter } from 'next/navigation';

interface DocumentListProps {
  documents: documentItem_fragment$data[];
  displayMode: ServiceListDisplayMode;
  connectionId?: string;
}

const DocumentList = ({
  documents,
  displayMode,
  connectionId,
}: DocumentListProps) => {
  const { settings } = useContext(SettingsContext);
  const { serviceInstance } = useServiceContext();
  const t = useTranslate();
  const router = useRouter();
  const { save } = useScrollPosition();
  const tableColumns = useMemo(
    () =>
      buildDocumentListColumns({
        documents,
        t,
        renderActions: (document) => (
          <DocumentActionsCell document={document} />
        ),
      }),
    [documents, t]
  );

  return (
    <>
      {displayMode === ServiceListDisplayMode.Tab ? (
        <ul
          className={
            'grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-l'
          }>
          {documents.map((document) => (
            <ServiceCard
              key={document.id}
              document={document}
              connectionId={connectionId}
              detailUrl={`/${APP_PATH}/service/${serviceInstance.service_definition?.identifier}/${serviceInstance.id}/${document.id}`}
              shareLinkUrl={`${settings!.base_url_front}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${document.slug}`}
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
                `/${APP_PATH}/service/${serviceInstance.service_definition?.identifier}/${serviceInstance.id}/${row.original.id}`
              );
            }}
          />
        </div>
      )}
    </>
  );
};

export default DocumentList;
