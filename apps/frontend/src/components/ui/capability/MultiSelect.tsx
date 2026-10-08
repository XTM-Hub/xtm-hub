import { useOrganizationCapabilities } from '@/hooks/use-organization-capabilities';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/combobox-option-ids';
import {
  Combobox,
  ComboboxChips,
  ComboboxClear,
  ComboboxContent,
  ComboboxControls,
  ComboboxField,
  ComboboxInput,
  ComboboxLabel,
  ComboboxTrigger,
} from '@filigran/design-system';
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
    <Combobox<string>
      multiple
      labelPosition={label ? 'top' : 'none'}
      options={optionIds.ids}
      value={value ?? []}
      onValueChange={(next) => onChange(next as string[])}
      getOptionLabel={optionIds.getOptionLabel}>
      {label && <ComboboxLabel>{label}</ComboboxLabel>}
      <ComboboxField>
        <ComboboxChips />
        <ComboboxInput
          aria-label={label ? undefined : placeholder}
          placeholder={placeholder}
        />
        <ComboboxControls>
          <ComboboxClear />
          <ComboboxTrigger />
        </ComboboxControls>
      </ComboboxField>
      <ComboboxContent
        emptyMessage={t('Utils.NotFound')}
        listAriaLabel={label || placeholder}
      />
    </Combobox>
  );
};
