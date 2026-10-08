import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/combobox-option-ids';
import { ENTITY_TYPES } from '@/utils/shareable-resources/entity-type';
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
import { FormItem } from '@filigran/ui';
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
  return (
    <FormItem>
      <Combobox<string>
        multiple
        disabled={disabled}
        options={ENTITY_TYPE_OPTION_IDS.ids}
        value={field.value ?? []}
        onValueChange={(next) => field.onChange(next as string[])}
        getOptionLabel={ENTITY_TYPE_OPTION_IDS.getOptionLabel}>
        <ComboboxLabel required>
          {t('Service.Form.EntityTypesLabel')}
        </ComboboxLabel>
        <ComboboxField>
          <ComboboxChips />
          <ComboboxInput
            placeholder={t('Service.Form.EntityTypesPlaceholder')}
          />
          <ComboboxControls>
            <ComboboxClear />
            <ComboboxTrigger />
          </ComboboxControls>
        </ComboboxField>
        <ComboboxContent
          emptyMessage={t('Utils.NotFound')}
          listAriaLabel={t('Service.Form.EntityTypesLabel')}
        />
      </Combobox>
    </FormItem>
  );
};
