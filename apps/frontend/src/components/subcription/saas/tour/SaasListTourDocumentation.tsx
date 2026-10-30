'use client';

import { useTranslate } from '@/hooks/use-translate';

const METRICS_DOCUMENTATION_URL =
  'https://app.notion.com/p/filigran/Handle-metrics-in-XTM-Hub-4098fce17f2a80319c0cc375ad654e10';

export const SaasListTourDocumentation = () => {
  const t = useTranslate();

  return t.rich('CSMBoard.Tour.FullDocumentation', {
    link: (chunks) => (
      <a
        href={METRICS_DOCUMENTATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-filigran-brand-primary underline">
        {chunks}
      </a>
    ),
  });
};
