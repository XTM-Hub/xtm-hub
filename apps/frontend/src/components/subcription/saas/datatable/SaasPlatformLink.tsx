import {
  getSaasPlatformMetadata,
  getSaasPlatformServicePath,
} from '@/components/subcription/saas/saas-list.utils';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { ServiceDefinitionIdentifier } from '@graphql/generated';
import Link from 'next/link';

export const SaasPlatformLink = ({
  registeredPlatform,
}: {
  registeredPlatform: {
    identifier: ServiceDefinitionIdentifier;
    service_instance_id: string;
  };
}) => {
  const t = useTranslate();
  const platformMetadata = getSaasPlatformMetadata(
    registeredPlatform.identifier
  );

  return (
    <span className="flex min-w-0 items-center gap-2">
      {platformMetadata && (
        <platformMetadata.Icon
          className={cn('size-4 shrink-0', platformMetadata.iconClassName)}
        />
      )}
      <Link
        href={getSaasPlatformServicePath(registeredPlatform)}
        className="truncate text-filigran-brand-primary underline">
        {t('CSMBoard.ViewMetrics')}
      </Link>
    </span>
  );
};
