import { useOrganizationCapabilities } from '@/hooks/use-organization-capabilities';
import { useTranslate } from '@/hooks/use-translate';
import { MultiSelectFormField } from '@filigran/ui/clients';
import { useMemo } from 'react';

interface CapabilityMultiSelectProps {
  value: string[];
  onChange: () => void;
}

export const CapabilityMultiSelect = ({
  value,
  onChange,
}: CapabilityMultiSelectProps) => {
  const t = useTranslate();
  const organizationCapabilities = useOrganizationCapabilities();

  const options = useMemo(() => {
    return organizationCapabilities.map((capability) => ({
      label: capability.replaceAll('_', ' '),
      value: capability,
    }));
  }, [organizationCapabilities]);

  return (
    <MultiSelectFormField
      noResultString={t('Utils.NotFound')}
      popoverContentClassName="bg-elevation-background-layer-3"
      options={options}
      defaultValue={value}
      onValueChange={onChange}
      placeholder={t('UserForm.OrganizationsCapabilitiesPlaceholder')}
      variant="inverted"
    />
  );
};
