import type { useTranslate } from '@/hooks/use-translate';
import { isFile } from '@/utils/documents';
import type { FileRejection, FileSelectProps } from '@filigran/design-system';

export const toFileSelectValue = (
  formValue: unknown,
  multiple = false
): File | File[] | null => {
  const files =
    typeof formValue === 'object' && formValue !== null && 'length' in formValue
      ? Array.from(formValue as ArrayLike<unknown>).filter(isFile)
      : [];
  return multiple ? files : (files[0] ?? null);
};

export const fromFileSelectValue = (
  next: File | File[] | null
): File[] | undefined => {
  const files = next === null ? [] : ([] as File[]).concat(next);
  return files.length > 0 ? files : undefined;
};

type FileSelectLabels = Pick<
  FileSelectProps,
  | 'triggerLabel'
  | 'placeholder'
  | 'loadingLabel'
  | 'clearLabel'
  | 'removeFileLabel'
  | 'rejectionMessage'
>;

// The design system names its own controls and messages in English unless given these.
export const getFileSelectLabels = (
  t: ReturnType<typeof useTranslate>
): FileSelectLabels => ({
  triggerLabel: t('DesignSystem.FileSelect.Trigger'),
  placeholder: t('DesignSystem.FileSelect.Placeholder'),
  loadingLabel: t('DesignSystem.FileSelect.Loading'),
  clearLabel: t('DesignSystem.FileSelect.Clear'),
  removeFileLabel: (fileName: string) =>
    t('DesignSystem.FileSelect.RemoveFile', { fileName }),
  rejectionMessage: (rejections: FileRejection[]) => {
    const [rejection] = rejections;
    return rejection && rejections.length === 1
      ? t('DesignSystem.FileSelect.FileRejected', {
          fileName: rejection.file.name,
          reason: rejection.reason,
        })
      : t('DesignSystem.FileSelect.FilesRejected', {
          count: rejections.length,
        });
  },
});
