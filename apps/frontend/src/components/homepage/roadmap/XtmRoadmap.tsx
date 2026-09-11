import {
  FiligranTimelineMapping,
  type FiligranTimelineMetadata,
} from '@/components/epic/epic-item/TimelineMapping';
import type { HomepageRoadmapTitleProduct } from '@/components/homepage/Homepage.utils';
import { CountBadge } from '@/components/ui/CountBadge';
import { PublicLocale } from '@/i18n/config';
import { serverGraphqlFetch } from '@/lib/server-graphql-fetch';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '@/utils/constant';
import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';
import { Button } from '@filigran/ui/servers';
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
  const t = await getTranslations('PublicHomePage.XtmRoadmap');
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
    <section className="flex flex-col lg:flex-row gap-l items-center border border-elevation-border-strong rounded-lg px-xl py-4">
      <div className="flex flex-col gap-s flex-3">
        <h2 className="heading-xl">{title}</h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          {t('Description')}
        </p>
        <div>
          <Button
            asChild
            variant="secondary"
            className="border-elevation-border-strong">
            <Link
              href={seeMoreHref ?? defaultSeeMoreHref}
              prefetch={false}>
              {t('SeeMore')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="hidden min-[1330px]:block relative h-24 flex-2 rounded-lg overflow-hidden">
        <Image
          src="/xtm_roadmap_space.png"
          alt={t('ImageAlt')}
          fill
          sizes="33vw"
          className="object-contain"
        />
      </div>

      <div className="flex gap-l max-md:gap-m max-sm:gap-xs justify-center lg:justify-end">
        {roadmapStats.map(
          ({ count, labelKey, bgFadedClass, textClass, barClass }) => (
            <div
              key={labelKey}
              className="flex flex-col gap-xs max-sm:gap-[2px]">
              <div className="flex items-center gap-s max-md:gap-xs max-sm:gap-[4px] pr-8 max-md:pr-5 max-sm:pr-1">
                <CountBadge
                  count={count}
                  bgFadedClass={bgFadedClass}
                  textClass={textClass}
                  className="max-md:w-5 max-md:h-5 max-sm:w-4 max-sm:h-4"
                />
                <span
                  className={`text-m max-md:text-sm max-sm:text-xs whitespace-nowrap ${textClass}`}>
                  {t(labelKey)}
                </span>
              </div>
              <div
                className={`h-0.5 mt-xs max-sm:mt-px w-full ${barClass} rounded-full`}
              />
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default XtmRoadmap;
