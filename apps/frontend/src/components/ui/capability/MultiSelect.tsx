import { AppCombobox } from '@/components/ui/AppCombobox';
import { useOrganizationCapabilities } from '@/hooks/use-organization-capabilities';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/combobox-option-ids';
import { useMemo } from 'react';

interface CapabilityMultiSelectProps {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
}

export const CapabilityMultiSelect = ({
  label,
  value,
  onChange,
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
      options={optionIds.ids}
      value={value ?? []}
      onValueChange={onChange}
      getOptionLabel={optionIds.getOptionLabel}
    />
  );
};
