import FileInputWithPrevent from '@/components/ui/FileInputWithPrevent';
import { useTranslate } from '@/hooks/use-translate';
import { FormControl, FormItem, FormLabel, FormMessage } from '@filigran/ui';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

interface ServiceFormJsonFileFieldProps {
  field: ControllerRenderProps<FieldValues, string>;
  setIsDirty: (isDirty: boolean) => void;
  document?: documentItem_fragment$data;
}

export const ServiceFormJsonFileField = ({
  field,
  setIsDirty,
  document,
}: ServiceFormJsonFileFieldProps) => {
  const t = useTranslate();
  return (
    <FormItem>
      <FormLabel>
        {t('Service.Form.ExistingJSONFile', {
          file_name: field.value?.[0].name ?? document?.file_name,
        })}
      </FormLabel>
      <FormControl>
        <div onClick={() => setIsDirty(true)}>
          <FileInputWithPrevent
            field={field}
            texts={{
              selectFile: t('Service.Form.UpdateJSONFile'),
              dialogTitle: t('Service.Form.UpdateJSONFile'),
              dialogDescription: t('Service.Form.DescriptionUpdateJSONFile'),
            }}
            allowedTypes="application/json"
          />
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};
