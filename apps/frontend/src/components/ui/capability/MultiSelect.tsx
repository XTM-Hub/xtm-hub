import { AppCombobox } from '@/components/ui/AppCombobox';
import { useOrganizationCapabilities } from '@/hooks/use-organization-capabilities';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/design-system/combobox';
import { useMemo } from 'react';

interface CapabilityMultiSelectProps {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

export const CapabilityMultiSelect = ({
  label,
  value,
  onChange,
  error,
}: CapabilityMultiSelectProps) => {
  const t = useTranslate();
  const organizationCapabilities = useOrganizationCapabilities();

  const optionIds = useMemo(
    () =>
      toComboboxOptionIds(
        organizationCapabilities,
        (capability) => capability,
        (capability) => capability.replaceAll('_', ' ')
      ),
    [organizationCapabilities]
  );

  const placeholder = t('UserForm.OrganizationsCapabilitiesPlaceholder');

  return (
    <AppCombobox
      multiple
      label={label || placeholder}
      labelPosition={label ? 'top' : 'none'}
      placeholder={placeholder}
      error={error}
      options={optionIds.ids}
      value={value ?? []}
      onValueChange={onChange}
      getOptionLabel={optionIds.getOptionLabel}
    />
  );
};
