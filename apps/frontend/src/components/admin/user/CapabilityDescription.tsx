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
            className="flex items-center"
            key={capability}>
            <span className="min-w-56">
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
        <ul className="flex flex-col space-y-s gap-xs text-xs">
          {capabilityList}
        </ul>
      </CardContent>
    </Card>
  );
};
