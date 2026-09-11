'use client';
import { EpicFilter, EpicFilterType } from '@/components/epic/EpicFilter';
import { EpicFormSheet } from '@/components/epic/EpicFormSheet';
import { EpicItem } from '@/components/epic/epic-item/EpicItem';
import { FiligranTimelineMapping } from '@/components/epic/epic-item/TimelineMapping';
import {
  useCountEpicsByProduct,
  useDraftAndTimelineEpics,
} from '@/components/epic/epic-list-utils';
import { FeatureVotingCallout } from '@/components/feature-voting/FeatureVotingCallout';
import { PortalContext } from '@/components/me/AppPortalContext';
import { CountBadge } from '@/components/ui/CountBadge';
import { useAdminByPass } from '@/hooks/use-portal-capability';
import useServiceCapability, {
  useServiceCapabilityWithSubscriptionId,
} from '@/hooks/use-service-capability';
import { cn } from '@/lib/utils';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { APP_PATH } from '@/utils/path/constant';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui';
import { Separator } from '@filigran/ui/clients';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import {
  OrganizationCapability,
  ServiceRestriction,
  Timeline,
} from '@graphql/generated';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useContext, useMemo, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

interface EpicListProps {
  epics: epic_fragment$data[];
  serviceInstance:
    serviceInstance_fragment$data | seoServiceInstanceFragment$data;
  selectedProduct?: EpicFilterType;
  onFilterChange: (filter: EpicFilterType) => void;
  onSearch: (searchTerm: string) => void;
}

const isServiceInstanceWithCapabilities = (
  instance: serviceInstance_fragment$data | seoServiceInstanceFragment$data
): instance is serviceInstance_fragment$data => 'capabilities' in instance;

export const EpicList = ({
  epics,
  serviceInstance,
  selectedProduct,
  onFilterChange,
  onSearch,
}: EpicListProps) => {
  const t = useTranslations();
  const [openSheet, setOpenSheet] = useState(false);
  const [showFinished, setShowFinished] = useState(false);
  const detailedServiceInstance = isServiceInstanceWithCapabilities(
    serviceInstance
  )
    ? serviceInstance
    : undefined;

  const userCanUpdate = useServiceCapability(
    ServiceRestriction.Upsert,
    detailedServiceInstance
  );
  const userCanDelete = useServiceCapability(
    ServiceRestriction.Delete,
    detailedServiceInstance
  );
  const { hasOrganizationCapability } = useContext(PortalContext);
  const { hasCapability: canManageServiceCapability, subscriptionId } =
    useServiceCapabilityWithSubscriptionId(
      ServiceRestriction.ManageAccess,
      detailedServiceInstance
    );

  const canManageService =
    canManageServiceCapability ||
    (hasOrganizationCapability &&
      (hasOrganizationCapability(
        OrganizationCapability.AdministrateOrganization
      ) ||
        hasOrganizationCapability(OrganizationCapability.ManageSubscription)));

  const isBypass = useAdminByPass();

  const selectedProducts = new Set<string>(selectedProduct ?? []);
  const filteredEpics =
    selectedProducts.size === 0
      ? epics
      : epics.filter((epic) =>
          epic.product.some((product) => selectedProducts.has(product))
        );

  const { draft, now, next, under_consideration, finished } =
    useDraftAndTimelineEpics(filteredEpics);
  const countsByProduct = useCountEpicsByProduct(
    epics,
    userCanUpdate,
    showFinished
  );

  const sections = useMemo(
    () => [
      { title: 'draft', epics: draft },
      ...(showFinished ? [{ title: Timeline.Finished, epics: finished }] : []),
      { title: Timeline.Now, epics: now },
      { title: Timeline.Next, epics: next },
      { title: Timeline.UnderConsideration, epics: under_consideration },
    ],
    [draft, now, next, under_consideration, finished, showFinished]
  );

  const renderEpicItems = useCallback(
    (epicsList: typeof epics) =>
      epicsList.map((epic) => (
        <div key={epic.title}>
          <EpicItem
            key={epic.id}
            epic={epic}
            serviceInstanceId={serviceInstance.id}
            userCanUpdate={userCanUpdate}
            userCanDelete={userCanDelete}
          />
        </div>
      )),
    [serviceInstance.id, userCanUpdate, userCanDelete]
  );

  const handleInputChange = (inputValue: string) => {
    onSearch(inputValue);
  };

  const debounceHandleInput = useDebounceCallback(
    (e) => handleInputChange(e.target.value),
    DEBOUNCE_TIME
  );

  return (
    <>
      <div className="flex m-s">
        <h1>{t('Epic.XTMRoadmap')}</h1>
        <div className="ml-auto flex items-center justify-center gap-s">
          {userCanUpdate && (
            <EpicFormSheet
              open={openSheet}
              setOpen={setOpenSheet}
            />
          )}
          {(canManageService || isBypass) && subscriptionId && (
            <Button
              asChild
              variant="secondary">
              <Link
                href={`/${APP_PATH}/manage/service/${serviceInstance.id}/subscription/${subscriptionId}`}>
                {t('Service.Capabilities.ManageAccessName')}
              </Link>
            </Button>
          )}
        </div>
      </div>
      <FeatureVotingCallout serviceInstanceId={serviceInstance.id} />
      <EpicFilter
        selectedFilter={selectedProduct}
        onSelectedFilterChange={onFilterChange}
        countsByProduct={countsByProduct}
        showFinished={showFinished}
        onShowFinishedChange={setShowFinished}
        debounceHandleInput={debounceHandleInput}
      />
      {sections.map((timeline) => {
        if (
          (timeline.title === 'draft' && !(userCanUpdate || userCanDelete)) ||
          timeline.epics.length === 0
        ) {
          return null;
        }
        const timelineMetadata =
          FiligranTimelineMapping[
            timeline.title as keyof typeof FiligranTimelineMapping
          ];

        return (
          <div
            key={timeline.title}
            className="mx-s flex items-stretch gap-m">
            <div className="flex flex-col items-center self-stretch mt-xl">
              <CountBadge
                count={timeline.epics.length}
                bgFadedClass={timelineMetadata.bgFadedClass}
                textClass={timelineMetadata.textClass}
              />
              <Separator
                orientation="vertical"
                className={cn(`mt-s flex-1 w-px`, timelineMetadata.barClass)}
              />
            </div>
            <div className="flex-1 mt-l">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p
                      className={cn(
                        `m-s inline-block font-semibold`,
                        timelineMetadata.textClass
                      )}>
                      {t(`Epic.Timeline.${timeline.title.toLowerCase()}`)}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="start">
                    {t(`Epic.Timeline.Details.${timeline.title.toLowerCase()}`)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <ul
                className={
                  'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 gap-l'
                }>
                {renderEpicItems(timeline.epics)}
              </ul>
            </div>
          </div>
        );
      })}
    </>
  );
};
