import { useOrganizationCapabilities } from '@/hooks/use-organization-capabilities';
import { useTranslate } from '@/hooks/use-translate';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Chip,
} from '@filigran/design-system';
import { useMemo } from 'react';

export const CapabilityDescription = () => {
  const t = useTranslate();

  const buildTranslationKey = (capability: string) =>
    `CapabilityDescription.Capabilities.${capability}`;

  const organizationCapabilities = useOrganizationCapabilities();

  const capabilityList = useMemo(() => {
    return organizationCapabilities
      .filter((capability) => {
        return t.has(buildTranslationKey(capability));
      })
      .map((capability) => {
        return (
          <li
            className="col-span-2 grid grid-cols-subgrid items-center"
            key={capability}>
            <span>
              <Chip label={capability.replaceAll('_', ' ')} />
            </span>
            <span>{t(buildTranslationKey(capability))}</span>
          </li>
        );
      });
  }, [t, organizationCapabilities]);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3">{t('CapabilityDescription.Title')}</CardTitle>
      </CardHeader>
      <CardContent
        clamp={0}
        className="flex flex-col gap-s">
        <p>{t('CapabilityDescription.Description')}</p>
        <ul className="grid grid-cols-[auto_1fr] gap-x-s gap-y-m text-xs">
          {capabilityList}
        </ul>
      </CardContent>
    </Card>
  );
};
