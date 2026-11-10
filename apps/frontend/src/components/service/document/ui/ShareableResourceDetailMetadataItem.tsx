'use client';

import { ShareableResourceDetailsLink } from '@/components/service/document/ShareableResourceDetailsLink';
import { ShareableResourceDetailItem } from '@/components/service/document/ui/ShareableResourceDetailItem';
import { useTranslate } from '@/hooks/use-translate';
import { FiligranWebsiteUtm } from '@/utils/filigran-website-utm';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { docHasMetadata } from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { ReactNode, useMemo } from 'react';

type Variant = 'text' | 'link';

interface ShareableResourceDetailMetadataItemProps {
  documentData: documentItem_fragment$data | PublicDocumentData;
  metadataKey: string;
  translationKey: string;
  translationMetadata?: Record<string, string | number | Date>;
  variant?: Variant;
  filigranWebsiteUtm?: FiligranWebsiteUtm;
}

export const ShareableResourceDetailMetadataItem = ({
  documentData,
  metadataKey,
  translationKey,
  translationMetadata,
  variant = 'text',
  filigranWebsiteUtm,
}: ShareableResourceDetailMetadataItemProps) => {
  const t = useTranslate();
  const content = useMemo(() => {
    if (!docHasMetadata(documentData, metadataKey)) {
      return null;
    }

    const value = (documentData as Record<string, unknown>)[
      metadataKey
    ] as string;

    const mapping: Record<Variant, ReactNode> = {
      link: (
        <ShareableResourceDetailsLink
          url={value}
          filigranWebsiteUtm={filigranWebsiteUtm}
        />
      ),
      text: <span>{value}</span>,
    };

    return mapping[variant];
  }, [variant, documentData, metadataKey, filigranWebsiteUtm]);

  if (!content) {
    return null;
  }

  return (
    <ShareableResourceDetailItem
      label={t(
        `Service.ShareableResources.Details.${translationKey}`,
        translationMetadata
      )}>
      {content}
    </ShareableResourceDetailItem>
  );
};
