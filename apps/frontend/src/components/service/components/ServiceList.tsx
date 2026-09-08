import IntegrationAccordion from '@/components/ui/shareable-resource/IntegrationAccordion';
import {
  IntegrationType,
  PortalCapability,
  ServiceRestriction,
} from '@graphql/generated';

import DocumentList from '@/components/service/components/DocumentList';
import { FilterSidebar } from '@/components/service/components/header/filter/FilterSidebar';
import {
  ServiceListFilterMap,
  ServiceListHeader,
} from '@/components/service/components/header/ServiceListHeader';
import ServiceListHeaderButtons from '@/components/service/components/header/ServiceListHeaderButtons';
import { useServiceContext } from '@/components/service/components/ServiceContext';
import { useServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import {
  getHeroSectionLibraryProps,
  HeroSectionLibrary,
} from '@/components/service/document/ui/HeroSectionLibrary';
import { useUserHasPortalCapability } from '@/hooks/use-portal-capability';
import useScrollPosition from '@/hooks/use-scroll-position';
import useServiceCapability from '@/hooks/use-service-capability';
import { useServiceListLocalStorage } from '@/hooks/use-service-list-local-storage';
import { useStickyHeaderOffset } from '@/hooks/use-sticky-header-offset';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useTranslations } from 'next-intl';
import { Fragment, useLayoutEffect, useRef } from 'react';

export interface ServiceListProps {
  active: documentItem_fragment$data[];
  draft: documentItem_fragment$data[];
  search: string;
  onSearchChange: (v: string) => void;
  additionalFilters: ServiceListFilterMap;
  connectionId?: string;
  paginationControls?: React.ReactNode;
}

const ServiceList = ({
  active,
  draft,
  search,
  onSearchChange,
  additionalFilters,
  connectionId,
  paginationControls,
}: ServiceListProps) => {
  const t = useTranslations();
  const { translationKey, serviceInstance } = useServiceContext();
  const userCanUpdate = useServiceCapability(
    ServiceRestriction.Upload,
    serviceInstance
  );
  const userIsMarketingOrBypass = useUserHasPortalCapability([
    PortalCapability.ModifyServiceMetadata,
    PortalCapability.Bypass,
  ]);

  const { localStorageKey } = useServiceListLocalStorageKeyContext();
  const { displayMode: selectedDisplayMode, setDisplayMode } =
    useServiceListLocalStorage(localStorageKey);

  const { restore } = useScrollPosition();
  useLayoutEffect(() => {
    restore();
  }, [restore]);

  const activeByIntegrationType = active.reduce<
    Record<string, documentItem_fragment$data[]>
  >((acc, resource) => {
    const type = resource.integration_type
      ? resource.integration_type
      : resource.type;

    if (!acc[type]) {
      acc[type] = [];
    }

    acc[type].push(resource);
    return acc;
  }, {});
  const heroSectionProps = getHeroSectionLibraryProps(serviceInstance, t);

  const headerRef = useRef<HTMLDivElement>(null);
  useStickyHeaderOffset(headerRef);

  return (
    <div className="flex flex-col gap-xl">
      <HeroSectionLibrary
        {...heroSectionProps}
        showLibraryUpdate={userIsMarketingOrBypass}
      />
      <div
        ref={headerRef}
        className="sticky top-0 py-m z-11 relative bg-gradient-background">
        <ServiceListHeader
          search={search}
          onSearchChange={onSearchChange}
          actions={<ServiceListHeaderButtons />}
          paginationControls={paginationControls}
          onDisplayModeChange={setDisplayMode}
        />
      </div>
      <div className="flex flex-row">
        <FilterSidebar filters={additionalFilters} />
        <div className="w-5/6 p-m flex flex-col gap-xl">
          {userCanUpdate && draft.length > 0 && (
            <>
              <div className="txt-category">
                {t(`${translationKey}.NonActive`)}:
              </div>
              <DocumentList
                documents={draft}
                displayMode={selectedDisplayMode}
                connectionId={connectionId}
              />
              {active.length > 0 && (
                <div className="txt-category">
                  {t(`${translationKey}.Active`)}:
                </div>
              )}
            </>
          )}
          {Object.entries(activeByIntegrationType).map(
            ([integrationType, documents]) => (
              <Fragment key={integrationType}>
                {Object.values(IntegrationType).includes(
                  integrationType as IntegrationType
                ) ? (
                  <IntegrationAccordion integrationType={integrationType}>
                    <DocumentList
                      documents={documents}
                      displayMode={selectedDisplayMode}
                      connectionId={connectionId}
                    />
                  </IntegrationAccordion>
                ) : (
                  <DocumentList
                    displayMode={selectedDisplayMode}
                    documents={documents}
                    connectionId={connectionId}
                  />
                )}
              </Fragment>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceList;
