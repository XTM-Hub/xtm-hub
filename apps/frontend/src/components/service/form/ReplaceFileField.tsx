import FileInputWithPrevent from '@/components/ui/FileInputWithPrevent';
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useTranslate } from '@/hooks/use-translate';
import { DocumentItemFragment } from '@graphql/generated';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

export interface ServiceFormReplaceFileTexts {
  existingFile: string;
  updateFile: string;
  updateFileDescription: string;
}

interface ServiceFormReplaceFileFieldProps {
  field: ControllerRenderProps<FieldValues, string>;
  setIsDirty: (isDirty: boolean) => void;
  document?: DocumentItemFragment;
  texts: ServiceFormReplaceFileTexts;
  accept: string;
}

export const ServiceFormReplaceFileField = ({
  field,
  setIsDirty,
  document,
  texts,
  accept,
}: ServiceFormReplaceFileFieldProps) => {
  const t = useTranslate();
  return (
    <FormItem>
      <FormLabel>
        {t(texts.existingFile, {
          file_name: field.value?.[0]?.name ?? document?.file_name,
        })}
      </FormLabel>
      <FormControl>
        {/* eslint-disable-next-line no-restricted-syntax -- container whose children carry the IDs */}
        <div onClick={() => setIsDirty(true)}>
          <FileInputWithPrevent
            field={field}
            texts={{
              selectFile: t(texts.updateFile),
              dialogTitle: t(texts.updateFile),
              dialogDescription: t(texts.updateFileDescription),
            }}
            allowedTypes={accept}
            analyticsId="resource_file_replacement_open"
            confirmAnalyticsId="resource_file_replacement_confirm"
          />
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};
