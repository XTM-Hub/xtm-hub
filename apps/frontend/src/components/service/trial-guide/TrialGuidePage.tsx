'use client';

import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { SuggestedActionsChecklist } from '@/components/service/trial-guide/SuggestedActionsChecklist';
import { TRIAL_GUIDE_CONTENT } from '@/components/service/trial-guide/TrialGuide.content';
import { TrialGuideResourceCard } from '@/components/service/trial-guide/TrialGuideResourceCard';
import { SlackSupportButton } from '@/components/service/trial-instances/SlackSupport';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsProduct } from '@/lib/analytics/analytics.context';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { cn } from '@/lib/utils';
import { APP_PATH } from '@/utils/path/constant';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@filigran/design-system';
import { PlatformIdentifier } from '@graphql/generated';

const TRIAL_GUIDE_TABS = [
  PlatformIdentifier.Opencti,
  PlatformIdentifier.Openaev,
  PlatformIdentifier.Xtmone,
];

export const TrialGuidePage = () => {
  const t = useTranslate();

  const breadcrumbs = [
    {
      label: 'MenuLinks.Home',
      href: `/${APP_PATH}`,
    },
    {
      label: 'Service.TrialGuide.Breadcrumb.TrialPlatform',
      href: `/${APP_PATH}/service/xtm-platform-trial`,
    },
    {
      label: 'Service.TrialGuide.Breadcrumb.TrialGuide',
    },
  ];

  return (
    <>
      <BreadcrumbNav value={breadcrumbs} />
      <p className="title-sm text-gradient-focus w-fit mb-1 mt-6">
        {t('Service.TrialGuide.Eyebrow')}
      </p>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="title-2xl">{t('Service.TrialGuide.Title')}</h1>
          <p>{t('Service.TrialGuide.Description')}</p>
        </div>
        <SlackSupportButton />
      </div>
      <svg
        width="0"
        height="0"
        className="absolute"
        aria-hidden="true"
        focusable="false">
        <defs>
          <linearGradient
            id="xtm-one-tab-icon-gradient"
            x1="0"
            y1="0"
            x2="1"
            y2="0">
            <stop
              offset="0%"
              style={{ stopColor: 'var(--color-filigran-ia-secondary)' }}
            />
            <stop
              offset="100%"
              style={{ stopColor: 'var(--color-filigran-ia-primary)' }}
            />
          </linearGradient>
        </defs>
      </svg>
      <Tabs
        defaultValue={PlatformIdentifier.Opencti}
        className="mt-4">
        <TabsList>
          {TRIAL_GUIDE_TABS.map((platformIdentifier) => {
            const { name, Icon } = PlatformMetadataMapping[platformIdentifier];
            const isXtmOne = platformIdentifier === PlatformIdentifier.Xtmone;
            return (
              <TabsTrigger
                {...analyticsId('trial_guide_product_select')}
                {...analyticsProduct(platformIdentifier)}
                key={platformIdentifier}
                value={platformIdentifier}
                icon={
                  <Icon
                    className={cn(
                      isXtmOne &&
                        'group-data-[state=active]:[&>path]:fill-[url(#xtm-one-tab-icon-gradient)]'
                    )}
                  />
                }
                className={cn(
                  isXtmOne && 'data-[state=active]:text-filigran-ia-primary'
                )}>
                {name}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {TRIAL_GUIDE_TABS.map((platformIdentifier) => {
          const { resourceCards, checklistItems } =
            TRIAL_GUIDE_CONTENT[platformIdentifier];
          return (
            <TabsContent
              {...analyticsProduct(platformIdentifier)}
              key={platformIdentifier}
              value={platformIdentifier}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                {resourceCards.map((resourceCard) => (
                  <TrialGuideResourceCard
                    key={resourceCard.id}
                    resourceCard={resourceCard}
                  />
                ))}
              </div>
              <SuggestedActionsChecklist
                checklistItems={checklistItems}
                platformIdentifier={platformIdentifier}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </>
  );
};

export default TrialGuidePage;
