'use client';

import LastDeployedResourceRow from '@/components/homepage/last-deployed-resources/LastDeployedResourceRow';
import { LastDeployedPlatform } from '@/components/homepage/last-deployed-resources/LastDeployedResourcesSection';
import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { Separator } from '@/components/ui/separator';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import { useLastDeployedOverviewQueryQuery } from '@graphql/generated';
import { Fragment, useState } from 'react';

const LAST_DEPLOYED_LIMIT = 4;

type LastDeployedResourcesClientProps = {
  platforms: LastDeployedPlatform[];
};

const LastDeployedResourcesClient = ({
  platforms,
}: LastDeployedResourcesClientProps) => {
  const t = useTranslate('HomePage.LastDeployedResources');

  const [selectedServiceInstanceId, setSelectedServiceInstanceId] =
    useState<string>(platforms[0]?.serviceInstanceId ?? '');

  const { data } = useLastDeployedOverviewQueryQuery(portalGraphqlClient, {
    limit: LAST_DEPLOYED_LIMIT,
    serviceInstanceId: selectedServiceInstanceId,
  });

  const resources = data?.lastDeployedOverview.resources ?? [];
  return (
    <section className="w-full flex-1 min-w-0 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="content-base text-default-primary">{t('Title')}</h2>
        <Select
          value={selectedServiceInstanceId}
          onValueChange={setSelectedServiceInstanceId}>
          <SelectTrigger
            {...analyticsId('home_platforms_open')}
            aria-label={t('ProductPlaceholder')}
            className="w-56">
            <SelectValue placeholder={t('ProductPlaceholder')} />
          </SelectTrigger>
          <SelectContent className="layer-1">
            {platforms.map((platform) => {
              const platformMeta = platform.platformIdentifier
                ? PlatformMetadataMapping[platform.platformIdentifier]
                : undefined;
              const Icon = platformMeta?.Icon;
              return (
                <SelectItem
                  key={platform.serviceInstanceId}
                  value={platform.serviceInstanceId}>
                  <span className="flex min-w-0 items-center gap-2">
                    {Icon && <Icon className="size-4 shrink-0" />}
                    <span className="truncate">{platform.title}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-4 items-center">
        {resources.map((resource, index) => (
          <Fragment key={`${resource.document.id}-${index}`}>
            {index > 0 && (
              <li
                aria-hidden="true"
                className="col-span-full shrink-0">
                <Separator />
              </li>
            )}
            <li className="grid grid-cols-subgrid col-span-full items-center">
              <LastDeployedResourceRow resource={resource} />
            </li>
          </Fragment>
        ))}
      </ul>
    </section>
  );
};

export default LastDeployedResourcesClient;
