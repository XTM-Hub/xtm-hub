'use client';

import { LastDeployedOverview } from '@/components/homepage/last-deployed-resources/LastDeployedResourcesSection';
import BadgeOverflowCounter from '@/components/ui/BadgeOverflowCounter';
import { UserDisplay } from '@/components/ui/UserDisplay';
import { cn } from '@/lib/utils';
import { useDateFormatter } from '@/utils/date';
import { ResourceTypeIcon } from '@/utils/shareable-resources/resource-type-icon';
import {
  SHAREABLE_RESOURCE_SERVICE_DEFINITION_IDENTIFIER_MAPPING,
  SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { CalendarMonthIcon } from '@filigran/icon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui';
import { Badge } from '@filigran/ui/servers';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const BADGE_CLASS = 'border-0 bg-primary/20 p-l';

type DeployedResource = LastDeployedOverview['resources'][number];

type LastDeployedResourceRowProps = {
  resource: DeployedResource;
};

const LastDeployedResourceRow = ({
  resource,
}: LastDeployedResourceRowProps) => {
  const t = useTranslations('HomePage.LastDeployedResources');
  const formatDate = useDateFormatter();
  const deployedAt = formatDate(resource.deployedAt, 'DATE_MEDIUM');

  const { document } = resource;
  const resourceType = document.type as ShareableResourceType;
  const serviceSlug = SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING[resourceType];

  if (!serviceSlug || !document.slug || !document.service_instance_id) {
    return null;
  }

  const url = `/app/service/${SHAREABLE_RESOURCE_SERVICE_DEFINITION_IDENTIFIER_MAPPING[resourceType]}/${document.service_instance_id}/${document.id}`;

  return (
    <Link
      href={url}
      className="group contents">
      <div className="min-w-0 max-w-full justify-self-start inline-flex items-center gap-m overflow-hidden rounded p-s bg-elevation-background-layer-1 group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <ResourceTypeIcon
          resourceType={resourceType}
          className="size-6 shrink-0"
        />
        <div className="min-w-0 flex-1 flex items-center gap-s">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="min-w-0 shrink content-body-base font-bold truncate">
                  {document.name}
                </span>
              </TooltipTrigger>
              <TooltipContent>{document.name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {document.use_cases && document.use_cases.length > 0 && (
            <div className="min-w-16 shrink">
              <BadgeOverflowCounter
                formatLabel={false}
                badges={document.use_cases}
                badgeClassName={BADGE_CLASS}
              />
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 md:max-w-56 lg:max-w-72 xl:max-w-80 2xl:max-w-96 flex items-center gap-s overflow-hidden whitespace-nowrap text-text-default-secondary txt-small rounded group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <Badge className={cn('shrink-0', BADGE_CLASS)}>
          <CalendarMonthIcon className="size-4" />
        </Badge>
        <span className="shrink-0">{t('On')}</span>
        <span className="shrink-0 content-body-base text-text-default-primary">
          {deployedAt}
        </span>
        <span className="shrink-0">{t('By')}</span>
        <div className="min-w-0 shrink flex items-center gap-s">
          <UserDisplay
            uploader={resource.deployedBy}
            className="min-w-0 max-w-none"
            withTooltip
          />
        </div>
      </div>
    </Link>
  );
};

export default LastDeployedResourceRow;
