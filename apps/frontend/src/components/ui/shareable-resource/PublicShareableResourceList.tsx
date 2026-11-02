import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import { PublicShareableDocumentList } from '@/components/ui/shareable-resource/PublicShareableDocumentList';
import { useTranslate } from '@/hooks/use-translate';
import { publicDocumentListItemFragment$data } from '@generated/publicDocumentListItemFragment.graphql';
import { SeoServiceInstanceItemFragment } from '@graphql/generated';

interface PublicShareableResourceListProps {
  documents: publicDocumentListItemFragment$data[];
  serviceInstance: SeoServiceInstanceItemFragment;
  baseUrl: string;
  displayMode: ServiceListDisplayMode;
}

export const PublicShareableResourceList = ({
  documents,
  serviceInstance,
  baseUrl,
  displayMode,
}: PublicShareableResourceListProps) => {
  const t = useTranslate();

  if (documents.length === 0) {
    return (
      <div className="my-4 text-center">{t('Utils.DocumentNotFound')}</div>
    );
  }

  return (
    <PublicShareableDocumentList
      documents={documents}
      serviceInstance={serviceInstance}
      baseUrl={baseUrl}
      displayMode={displayMode}
    />
  );
};
