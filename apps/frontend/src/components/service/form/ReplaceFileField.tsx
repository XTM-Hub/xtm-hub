import FileInputWithPrevent from '@/components/ui/FileInputWithPrevent';
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useTranslate } from '@/hooks/use-translate';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

export interface ServiceFormReplaceFileTexts {
  existingFile: string;
  updateFile: string;
  updateFileDescription: string;
}

interface ServiceFormReplaceFileFieldProps {
  field: ControllerRenderProps<FieldValues, string>;
  setIsDirty: (isDirty: boolean) => void;
  document?: documentItem_fragment$data;
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
        <div onClick={() => setIsDirty(true)}>
          <FileInputWithPrevent
            field={field}
            texts={{
              selectFile: t(texts.updateFile),
              dialogTitle: t(texts.updateFile),
              dialogDescription: t(texts.updateFileDescription),
            }}
            allowedTypes={accept}
          />
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};
