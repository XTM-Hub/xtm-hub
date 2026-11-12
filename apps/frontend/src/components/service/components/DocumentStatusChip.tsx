import { useTranslate } from '@/hooks/use-translate';
import { Chip } from '@filigran/design-system';
import { DocumentStatus } from '@graphql/generated';

const DOCUMENT_STATUS_CHIPS: Record<
  DocumentStatus,
  { labelKey: string; severity: 'neutral' | 'high' | 'low' }
> = {
  [DocumentStatus.Draft]: {
    labelKey: 'DocumentStatus.Draft',
    severity: 'neutral',
  },
  [DocumentStatus.InValidation]: {
    labelKey: 'DocumentStatus.InValidation',
    severity: 'high',
  },
  [DocumentStatus.Published]: {
    labelKey: 'DocumentStatus.Published',
    severity: 'low',
  },
};

export const DocumentStatusChip = ({ status }: { status: DocumentStatus }) => {
  const t = useTranslate();
  // Draft is the default, as in the footer and the list split
  const { labelKey, severity } =
    DOCUMENT_STATUS_CHIPS[status] ??
    DOCUMENT_STATUS_CHIPS[DocumentStatus.Draft];

  return (
    <Chip
      label={t(labelKey)}
      severity={severity}
      className="shrink-0"
    />
  );
};
