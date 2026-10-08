'use client';

import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { SuggestedActionsChecklist } from '@/components/service/trial-guide/SuggestedActionsChecklist';
import { TRIAL_GUIDE_CONTENT } from '@/components/service/trial-guide/TrialGuide.content';
import { TrialGuideResourceCard } from '@/components/service/trial-guide/TrialGuideResourceCard';
import { SlackSupportButton } from '@/components/service/trial-instances/SlackSupport';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';
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
      <p className="heading-sm bg-clip-text text-transparent bg-gradient-legacy-focus w-fit mb-xs mt-xl">
        {t('Service.TrialGuide.Eyebrow')}
      </p>
      <div className="flex items-start justify-between gap-m flex-wrap mb-xl">
        <div className="flex flex-col gap-xs">
          <h1 className="heading-2xl">{t('Service.TrialGuide.Title')}</h1>
          <p className="text-content-body-medium">
            {t('Service.TrialGuide.Description')}
          </p>
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
              style={{ stopColor: 'var(--color-filigran-ia-main)' }}
            />
          </linearGradient>
        </defs>
      </svg>
      <Tabs
        defaultValue={PlatformIdentifier.Opencti}
        className="mt-l">
        <TabsList>
          {TRIAL_GUIDE_TABS.map((platformIdentifier) => {
            const { name, Icon } = PlatformMetadataMapping[platformIdentifier];
            const isXtmOne = platformIdentifier === PlatformIdentifier.Xtmone;
            return (
              <TabsTrigger
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
              key={platformIdentifier}
              value={platformIdentifier}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-m mt-m">
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
