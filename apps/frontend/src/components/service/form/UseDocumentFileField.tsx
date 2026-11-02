import {
  ServiceFormReplaceFileField,
  ServiceFormReplaceFileTexts,
} from '@/components/service/form/ReplaceFileField';
import type { FieldConfigItem } from '@/components/ui/auto-form/types';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { JSON_FILE_ACCEPT } from '@/utils/documents';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useMemo } from 'react';

export interface ServiceFormDocumentFile {
  label: string;
  accept: string;
  texts: ServiceFormReplaceFileTexts;
}

export const JSON_DOCUMENT_FILE: ServiceFormDocumentFile = {
  label: 'Service.Form.SelectJSONFile',
  accept: JSON_FILE_ACCEPT,
  texts: {
    existingFile: 'Service.Form.ExistingJSONFile',
    updateFile: 'Service.Form.UpdateJSONFile',
    updateFileDescription: 'Service.Form.DescriptionUpdateJSONFile',
  },
};

export const useDocumentFileField = (
  { label, accept, texts }: ServiceFormDocumentFile,
  document?: documentItem_fragment$data
): FieldConfigItem => {
  const t = useTranslate();
  const { setIsDirty } = useDialogContext();
  const { existingFile, updateFile, updateFileDescription } = texts;
  const replaceFileField = useMemo<FieldConfigItem>(
    () => ({
      fieldType: ({ field }) => (
        <ServiceFormReplaceFileField
          field={field}
          setIsDirty={setIsDirty}
          document={document}
          texts={{ existingFile, updateFile, updateFileDescription }}
          accept={accept}
        />
      ),
    }),
    [
      document,
      setIsDirty,
      existingFile,
      updateFile,
      updateFileDescription,
      accept,
    ]
  );

  if (document) {
    return replaceFileField;
  }
  return {
    label: t(label),
    fieldType: 'file',
    inputProps: { accept },
  };
};
