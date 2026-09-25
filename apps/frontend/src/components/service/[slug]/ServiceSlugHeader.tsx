import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { useTranslate } from '@/hooks/use-translate';
import { formatName } from '@/utils/format/name';
import { Badge } from '@filigran/ui';
import { serviceInstanceForSubscriptions_fragment$data } from '@generated/serviceInstanceForSubscriptions_fragment.graphql';
import { useMemo } from 'react';

interface ServiceSlugHeaderProps {
  serviceInstance: serviceInstanceForSubscriptions_fragment$data;
}

const ServiceSlugHeader = ({ serviceInstance }: ServiceSlugHeaderProps) => {
  const t = useTranslate();

  const availableCapabilities: BadgeOverflow[] = useMemo(
    () =>
      (serviceInstance.service_definition?.service_capability ?? []).flatMap(
        (capability) => {
          if (!capability?.id || !capability.name) {
            return [];
          }

          return [
            {
              id: capability.id,
              name: capability.name,
            },
          ];
        }
      ),
    [serviceInstance.service_definition?.service_capability]
  );

  const serviceTags = useMemo(
    () =>
      (serviceInstance.tags ?? [])
        .filter((tag) => !!tag)
        .map((tag) => ({
          id: tag,
          name: tag,
        })),
    [serviceInstance.tags]
  );

  return (
    <>
      <div>
        <div className="flex flex-col gap-m mb-m">
          <div className="flex flex-row gap-m">
            <h1>{serviceInstance.name}</h1>
            <BadgeOverflowCounter badges={serviceTags as BadgeOverflow[]} />
          </div>
          <p className="text-sm text-muted-foreground italic line-clamp-3">
            {serviceInstance.description}
          </p>
          <div>
            <p className="text-xs uppercase text-muted-foreground pb-xs">
              {t('Service.Management.AvailableCapabilities')}
            </p>
            {availableCapabilities.length > 0 ? (
              <div className="flex flex-wrap gap-xs">
                {availableCapabilities.map((capability) => (
                  <Badge key={capability.id}>
                    {formatName(capability.name)}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('Service.Management.NoAvailableCapabilities')}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ServiceSlugHeader;
