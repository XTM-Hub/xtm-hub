import { AppCombobox } from '@/components/ui/AppCombobox';
import { useOrganizationCapabilities } from '@/hooks/use-organization-capabilities';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/design-system/combobox';
import { useMemo } from 'react';

interface CapabilityMultiSelectProps {
  /** Visible label. Without it the field shows only its placeholder. */
  label?: string;
  /** Accessible name of a field that has no visible label, defaults to the placeholder. */
  accessibleName?: string;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  /** Layer of the portalled panel: a field on a layer-1 surface passes `layer-0`. */
  contentClassName?: string;
}

export const CapabilityMultiSelect = ({
  label,
  accessibleName,
  value,
  onChange,
  error,
  contentClassName,
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
      label={label || accessibleName || placeholder}
      labelPosition={label ? 'top' : 'none'}
      placeholder={placeholder}
      error={error}
      options={optionIds.ids}
      value={value ?? []}
      onValueChange={onChange}
      getOptionLabel={optionIds.getOptionLabel}
      contentClassName={contentClassName}
    />
  );
};
