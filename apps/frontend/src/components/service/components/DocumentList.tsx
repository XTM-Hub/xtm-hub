'use client';

import { DocumentActionsCell } from '@/components/service/components/DocumentActionsCell';
import { buildDocumentListColumns } from '@/components/service/components/DocumentListColumns';
import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import ServiceCard from '@/components/service/components/ServiceCard';
import { useServiceContext } from '@/components/service/components/ServiceContext';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import {
  APP_PATH,
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
} from '@/utils/path/constant';
import { useContext, useMemo } from 'react';

import { DataTable } from '@/components/ui/data-table';
import useScrollPosition from '@/hooks/use-scroll-position';
import { useTranslate } from '@/hooks/use-translate';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { DocumentItemFragment } from '@graphql/generated';
import { useRouter } from 'next/navigation';

interface DocumentListProps {
  documents: DocumentItemFragment[];
  displayMode: ServiceListDisplayMode;
}

const DocumentList = ({ documents, displayMode }: DocumentListProps) => {
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
            'grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-4'
          }>
          {documents.map((document) => (
            <ServiceCard
              key={document.id}
              document={document}
              detailUrl={`/${APP_PATH}/service/${serviceInstance.service_definition?.identifier}/${serviceInstance.id}/${document.id}`}
              shareLinkUrl={`${settings!.base_url_front}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${document.slug}`}
            />
          ))}
        </ul>
      ) : (
        <DataTable
          {...getDataTableLabels(t)}
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
      )}
    </>
  );
};

export default DocumentList;
