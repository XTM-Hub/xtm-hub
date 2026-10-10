import { AppCombobox } from '@/components/ui/AppCombobox';
import { useFormField } from '@/components/ui/form';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/design-system/combobox';
import { ENTITY_TYPES } from '@/utils/shareable-resources/entity-type';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

const ENTITY_TYPE_OPTION_IDS = toComboboxOptionIds(
  ENTITY_TYPES,
  (entityType) => entityType.id,
  (entityType) => entityType.name
);

interface ServiceFormEntityTypesFieldProps {
  field: ControllerRenderProps<FieldValues, string>;
  disabled?: boolean;
}

export const ServiceFormEntityTypesField = ({
  field,
  disabled,
}: ServiceFormEntityTypesFieldProps) => {
  const t = useTranslate();
  const { error } = useFormField();

  return (
    <AppCombobox
      multiple
      label={t('Service.Form.EntityTypesLabel')}
      required
      placeholder={t('Service.Form.EntityTypesPlaceholder')}
      error={error?.message}
      disabled={disabled}
      options={ENTITY_TYPE_OPTION_IDS.ids}
      value={field.value ?? []}
      onValueChange={field.onChange}
      getOptionLabel={ENTITY_TYPE_OPTION_IDS.getOptionLabel}
      contentClassName="layer-2"
    />
  );
};
