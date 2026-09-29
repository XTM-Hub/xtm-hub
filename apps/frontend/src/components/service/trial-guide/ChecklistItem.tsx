import { TrialGuideChecklistItem } from '@/components/service/trial-guide/TrialGuide.content';
import { useTranslate } from '@/hooks/use-translate';
import Link from 'next/link';
import { ReactNode } from 'react';

interface ChecklistItemProps {
  index: number;
  item: TrialGuideChecklistItem;
}

const renderStrong = (chunks: ReactNode) => <strong>{chunks}</strong>;

export const ChecklistItem = ({ index, item }: ChecklistItemProps) => {
  const t = useTranslate();
  const { titleKey, descriptionKey, exampleKey, readMoreUrl } = item;

  return (
    <div className="flex gap-m py-m border-b border-elevation-border-subtle-layer-2 last:border-b-0">
      <div className="flex flex-col gap-s">
        <div className="flex gap-s items-center">
          <div className="shrink-0 size-6 flex items-center justify-center border rounded border-filigran-brand-primary heading-sm">
            {index}
          </div>
          <p className="heading-sm">{t(titleKey)}</p>
        </div>
        <p className="content-body-compact">
          {t.rich(descriptionKey, { strong: renderStrong })}{' '}
          {readMoreUrl && (
            <Link
              className="text-filigran-brand-primary hover:underline"
              href={readMoreUrl}
              target="_blank"
              rel="noopener noreferrer">
              {t('Service.TrialGuide.ReadMore')}
            </Link>
          )}
        </p>
        {exampleKey && (
          <div className="rounded p-s bg-elevation-background-layer-1 border border-elevation-border-subtle-layer-1">
            <p className="content-body-compact">{t(exampleKey)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChecklistItem;
