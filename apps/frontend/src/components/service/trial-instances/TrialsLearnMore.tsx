'use client';

import { TrialsStorageLimitation } from '@/components/service/trial-instances/TrialsStorageLimitation';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import {
  AnalyticsIcon,
  ArrowRightAltIcon,
  ArrowsInputIcon,
  ArrowsOutputIcon,
} from '@filigran/icon';
import { PlatformIdentifier } from '@graphql/generated';
import Link from 'next/link';
import React from 'react';

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-primary text-2xl mb-l">{children}</h2>
);

const P = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <p className={cn('text-sm', className)}>{children}</p>;

interface H2Props {
  platformIdentifier: PlatformIdentifier;
}

export const TrialsLearnMore = ({ platformIdentifier }: H2Props) => {
  const t = useTranslate();
  const baseTranslationKey = `Service.Trials.LearnMore.${platformIdentifier}`;
  return (
    <>
      <section className="flex flex-col gap-xxl py-20 pt-0">
        <div className="flex flex-col gap-xl items-center lg:flex-row">
          <div className="w-[413px]">
            <iframe
              width="413"
              height="232"
              allowFullScreen
              src={
                platformIdentifier === PlatformIdentifier.Opencti
                  ? 'https://www.youtube.com/embed/KwF22zye3iI'
                  : 'https://www.youtube.com/embed/wb_v7sa7y8w'
              }
            />
          </div>
          <article className="p-xl w-full md-w-[60%]">
            <H2>{t(`${baseTranslationKey}.WhatCanYouDo.Title`)}</H2>
            <P className="mb-l">
              {t(`${baseTranslationKey}.WhatCanYouDo.FirstParagraph`)}
            </P>
            <P className="mb-l">
              {t(`${baseTranslationKey}.WhatCanYouDo.SecondParagraph`)}
            </P>
            <P>
              <Link
                target="_blank"
                rel="noopener noreferrer"
                href={
                  platformIdentifier === PlatformIdentifier.Opencti
                    ? 'https://filigran.io/offerings/opencti-enterprise-edition/'
                    : 'https://filigran.io/offerings/openaev-enterprise-edition/'
                }
                className="underline flex gap-s items-center">
                <ArrowRightAltIcon className="size-3" />
                {t(`${baseTranslationKey}.WhatCanYouDo.Link`)}
              </Link>
            </P>
          </article>
        </div>
        <div className="flex flex-col md:flex-row justify-between gap-l">
          <article className="rounded p-6 basis-full bg-elevation-background-layer-1">
            <h3 className="flex items-center gap-l text-primary mb-s font-bold">
              <span className="p-2 bg-blue/5 rounded">
                <ArrowsInputIcon className="size-4" />
              </span>
              {t(`${baseTranslationKey}.Blocks.First.Title`)}
            </h3>
            <P>{t(`${baseTranslationKey}.Blocks.First.Description`)}</P>
          </article>
          <article className="rounded p-6 basis-full bg-elevation-background-layer-1">
            <h3 className="flex items-center gap-l text-primary mb-s font-bold">
              <span className="p-2 bg-blue/5 rounded">
                <AnalyticsIcon className="size-4" />
              </span>
              {t(`${baseTranslationKey}.Blocks.Second.Title`)}
            </h3>
            <P>{t(`${baseTranslationKey}.Blocks.Second.Description`)}</P>
          </article>
          <article className="rounded p-6 basis-full bg-elevation-background-layer-1">
            <h3 className="flex items-center gap-l text-primary mb-s font-bold">
              <span className="p-2 bg-blue/5 rounded">
                <ArrowsOutputIcon className="size-4" />
              </span>
              {t(`${baseTranslationKey}.Blocks.Third.Title`)}
            </h3>
            <P>{t(`${baseTranslationKey}.Blocks.Third.Description`)}</P>
          </article>
        </div>
        <TrialsStorageLimitation platformIdentifier={platformIdentifier} />
      </section>
    </>
  );
};
