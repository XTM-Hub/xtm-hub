import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import IntegrationAccordion from '@/components/ui/shareable-resource/IntegrationAccordion';
import { PublicShareableDocumentList } from '@/components/ui/shareable-resource/PublicShareableDocumentList';
import { useTranslate } from '@/hooks/use-translate';
import { isIntegrationItem } from '@/utils/shareable-resources/shareable-resources.types';
import { publicDocumentListItemFragment$data } from '@generated/publicDocumentListItemFragment.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { IntegrationType } from '@graphql/generated';
import { Fragment, useMemo } from 'react';

interface PublicShareableResourceListProps {
  documents: publicDocumentListItemFragment$data[];
  serviceInstance: seoServiceInstanceFragment$data;
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

  const documentsByIntegrationType = useMemo(() => {
    return documents.reduce<
      Record<string, publicDocumentListItemFragment$data[]>
    >((acc, resource) => {
      const type =
        isIntegrationItem(resource) && resource.integration_type
          ? resource.integration_type
          : resource.type;

      if (!acc[type]) {
        acc[type] = [];
      }

      acc[type].push(resource);
      return acc;
    }, {});
  }, [documents]);

  if (documents.length === 0) {
    return (
      <div className="my-4 text-center">{t('Utils.DocumentNotFound')}</div>
    );
  }

  return (
    <>
      {Object.entries(documentsByIntegrationType).map(
        ([integrationType, documents]) => (
          <Fragment key={integrationType}>
            {Object.values(IntegrationType).includes(
              integrationType as IntegrationType
            ) ? (
              <IntegrationAccordion
                key={integrationType}
                integrationType={integrationType}>
                <PublicShareableDocumentList
                  documents={documents}
                  displayMode={displayMode}
                  serviceInstance={serviceInstance}
                  baseUrl={baseUrl}
                />
              </IntegrationAccordion>
            ) : (
              <PublicShareableDocumentList
                documents={documents}
                serviceInstance={serviceInstance}
                baseUrl={baseUrl}
                displayMode={displayMode}
              />
            )}
          </Fragment>
        )
      )}
    </>
  );
};
