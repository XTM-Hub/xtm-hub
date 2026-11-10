import {
  FiligranTimelineMapping,
  type FiligranTimelineMetadata,
} from '@/components/epic/epic-item/TimelineMapping';
import type { HomepageRoadmapTitleProduct } from '@/components/homepage/Homepage.utils';
import { CountBadge } from '@/components/ui/CountBadge';
import { getTranslate } from '@/hooks/get-translate';
import { PublicLocale } from '@/i18n/config';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '@/utils/constant';
import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';
import { Button } from '@filigran/design-system';
import {
  EpicCountPerTimelineQueryDocument,
  EpicCountPerTimelineQueryQuery,
  Timeline,
} from '@graphql/generated';
import { getLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';

const HOMEPAGE_TIMELINES = [
  Timeline.Now,
  Timeline.Next,
  Timeline.UnderConsideration,
];

export type XtmRoadmapProps = {
  seeMoreHref?: string;
  titleProduct?: HomepageRoadmapTitleProduct;
  paramsLocale?: PublicLocale;
};

const XtmRoadmap = async ({
  seeMoreHref,
  titleProduct = 'default',
  paramsLocale,
}: XtmRoadmapProps) => {
  const t = await getTranslate('PublicHomePage.XtmRoadmap');
  const tPlatformIdentifier = await getTranslations('PlatformIdentifier');
  const usedLocale = paramsLocale ?? (await getLocale());

  const title =
    titleProduct === 'default'
      ? t('Title')
      : t('TitleWithProduct', {
          product:
            titleProduct === 'opencti'
              ? tPlatformIdentifier('opencti')
              : tPlatformIdentifier('openaev'),
        });

  const data = await serverGraphqlFetch<EpicCountPerTimelineQueryQuery>(
    EpicCountPerTimelineQueryDocument,
    {},
    { next: { revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS } }
  );

  const epicCounts = data.countEpicsPerTimeline;

  const roadmapStats: (FiligranTimelineMetadata & { count: number })[] =
    HOMEPAGE_TIMELINES.map((timeline) => ({
      count: epicCounts.find((e) => e.timeline === timeline)?.count ?? 0,
      ...FiligranTimelineMapping[timeline],
    }));

  const defaultSeeMoreHref = `/${usedLocale}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/xtm-platform-roadmap`;

  return (
    <section className="flex flex-col lg:flex-row gap-4 items-center border border-elevation-subtle rounded px-6 py-4">
      <div className="flex flex-col gap-2 flex-3">
        <h2 className="title-xl">{title}</h2>
        <p className="text-default-secondary text-xs sm:text-sm">
          {t('Description')}
        </p>
        <div>
          <Button
            asChild
            priority="secondary"
            className="border-elevation-default">
            <Link
              {...analyticsId('home_roadmap_open')}
              href={seeMoreHref ?? defaultSeeMoreHref}
              prefetch={false}>
              {t('SeeMore')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="hidden min-[1330px]:block relative h-24 flex-2 rounded overflow-hidden">
        <Image
          src="/xtm_roadmap_space.png"
          alt={t('ImageAlt')}
          fill
          sizes="33vw"
          className="object-contain"
        />
      </div>

      <div className="flex gap-4 max-md:gap-3 max-sm:gap-1 justify-center lg:justify-end">
        {roadmapStats.map(
          ({ count, labelKey, bgFadedClass, textClass, barClass }) => (
            <div
              key={labelKey}
              className="flex flex-col gap-1 max-sm:gap-[2px]">
              <div className="flex items-center gap-2 max-md:gap-1 max-sm:gap-[4px] pr-8 max-md:pr-5 max-sm:pr-1">
                <CountBadge
                  count={count}
                  bgFadedClass={bgFadedClass}
                  textClass={textClass}
                  className="max-md:w-5 max-md:h-5 max-sm:w-4 max-sm:h-4"
                />
                <span
                  className={`max-md:text-sm max-sm:text-xs whitespace-nowrap ${textClass}`}>
                  {t(labelKey)}
                </span>
              </div>
              <div
                className={`h-0.5 mt-1 max-sm:mt-px w-full ${barClass} rounded-full`}
              />
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default XtmRoadmap;
