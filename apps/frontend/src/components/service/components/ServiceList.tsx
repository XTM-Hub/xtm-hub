import { PortalCapability, ServiceRestriction } from '@graphql/generated';

import DocumentList from '@/components/service/components/DocumentList';
import { FilterSidebar } from '@/components/service/components/header/filter/FilterSidebar';
import { IntegrationsCsvExportButton } from '@/components/service/components/header/IntegrationsCsvExportButton';
import {
  ServiceListFilterMap,
  ServiceListHeader,
} from '@/components/service/components/header/ServiceListHeader';
import ServiceListHeaderButtons from '@/components/service/components/header/ServiceListHeaderButtons';
import { useServiceContext } from '@/components/service/components/ServiceContext';
import { useServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import {
  getHeroSectionLibraryProps,
  HeroSectionLibrary,
} from '@/components/service/document/ui/HeroSectionLibrary';
import { useUserHasPortalCapability } from '@/hooks/use-portal-capability';
import useScrollPosition from '@/hooks/use-scroll-position';
import useServiceCapability from '@/hooks/use-service-capability';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useStickyHeaderOffset } from '@/hooks/use-sticky-header-offset';
import { useTranslate } from '@/hooks/use-translate';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useLayoutEffect, useRef } from 'react';

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
  const t = useTranslate();
  const { translationKey, serviceInstance, type } = useServiceContext();
  const userCanUpdate = useServiceCapability(
    ServiceRestriction.Upload,
    serviceInstance
  );
  const userIsMarketingOrBypass = useUserHasPortalCapability([
    PortalCapability.ModifyServiceMetadata,
    PortalCapability.Bypass,
  ]);

  const { storageKey } = useServiceListStorageKeyContext();
  const { displayMode: selectedDisplayMode, setDisplayMode } =
    useServiceListStorage(storageKey);

  const { restore } = useScrollPosition();
  useLayoutEffect(() => {
    restore();
  }, [restore]);

  const heroSectionProps = getHeroSectionLibraryProps(serviceInstance, t);

  const headerRef = useRef<HTMLDivElement>(null);
  useStickyHeaderOffset(headerRef);

  return (
    <div className="flex flex-col gap-6">
      <HeroSectionLibrary
        {...heroSectionProps}
        showLibraryUpdate={userIsMarketingOrBypass}
      />
      <div
        ref={headerRef}
        className="sticky top-0 py-3 z-11 relative bg-gradient-default">
        <ServiceListHeader
          search={search}
          onSearchChange={onSearchChange}
          actions={<ServiceListHeaderButtons />}
          exportAction={
            type === ShareableResourceType.OPENCTI_INTEGRATION && (
              <IntegrationsCsvExportButton
                serviceInstanceId={serviceInstance.id}
                isAuthenticated
                type={type}
              />
            )
          }
          paginationControls={paginationControls}
          onDisplayModeChange={setDisplayMode}
          filters={additionalFilters}
        />
      </div>
      <div className="flex flex-row">
        <FilterSidebar filters={additionalFilters} />
        <div className="grow shrink min-w-0 px-3 pb-3 flex flex-col gap-6">
          {userCanUpdate && draft.length > 0 && (
            <>
              <div className="title-xs">
                {t(`${translationKey}.NonActive`)}:
              </div>
              <DocumentList
                documents={draft}
                displayMode={selectedDisplayMode}
                connectionId={connectionId}
              />
              {active.length > 0 && (
                <div className="title-xs">{t(`${translationKey}.Active`)}:</div>
              )}
            </>
          )}
          {active.length > 0 && (
            <DocumentList
              documents={active}
              displayMode={selectedDisplayMode}
              connectionId={connectionId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceList;
