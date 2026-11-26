import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { useTranslate } from '@/hooks/use-translate';
import { formatName } from '@/utils/format/name';
import { Chip } from '@filigran/design-system';
import { ServiceInstanceWithCapabilitiesItemFragment } from '@graphql/generated';
import { useMemo } from 'react';

type ServiceCapabilities = NonNullable<
  ServiceInstanceWithCapabilitiesItemFragment['service_definition']
>['service_capability'];

interface ServiceSlugHeaderProps {
  // Tags are optional: the manage page heads with a service instance read
  // without them.
  serviceInstance: Pick<
    ServiceInstanceWithCapabilitiesItemFragment,
    'name' | 'description'
  > &
    Partial<Pick<ServiceInstanceWithCapabilitiesItemFragment, 'tags'>>;
  // Given apart from the service instance: the manage page's instance reads a
  // service definition without its capabilities.
  capabilities?: ServiceCapabilities;
}

const ServiceSlugHeader = ({
  serviceInstance,
  capabilities,
}: ServiceSlugHeaderProps) => {
  const t = useTranslate();

  const availableCapabilities: BadgeOverflow[] = useMemo(
    () =>
      (capabilities ?? []).flatMap((capability) => {
        if (!capability?.id || !capability.name) {
          return [];
        }

        return [
          {
            id: capability.id,
            name: capability.name,
          },
        ];
      }),
    [capabilities]
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
        <div className="flex flex-col gap-3 mb-3">
          <div className="flex flex-row gap-3">
            <h1>{serviceInstance.name}</h1>
            <BadgeOverflowCounter badges={serviceTags as BadgeOverflow[]} />
          </div>
          <p className="text-sm text-default-secondary italic line-clamp-3">
            {serviceInstance.description}
          </p>
          <div>
            <p className="text-xs uppercase text-default-secondary pb-1">
              {t('Service.Management.AvailableCapabilities')}
            </p>
            {availableCapabilities.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {availableCapabilities.map((capability) => (
                  <Chip
                    key={capability.id}
                    label={formatName(capability.name)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-default-secondary">
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
