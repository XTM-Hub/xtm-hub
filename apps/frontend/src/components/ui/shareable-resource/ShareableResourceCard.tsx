'use client';
import { ShareableResourceCardDescription } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardDescription';
import { ShareableResourceCardFooterAuthor } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardFooterAuthor';
import { ShareableResourceCardFooterVersion } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardFooterVersions';
import { ShareableResourceCardHeader } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardHeader';
import useScrollPosition from '@/hooks/use-scroll-position';
import {
  PublicDocumentData,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { docHasMetadata } from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import { Paper } from '@filigran/design-system';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { ServiceDefinitionIdentifier } from '@generated/serviceList_fragment.graphql';
import { DocumentMetadataKeyCode, IntegrationType } from '@graphql/generated';
import Link from 'next/link';
import { ReactNode } from 'react';

interface ShareableServiceInstance {
  id: string;
  service_definition?: {
    identifier: ServiceDefinitionIdentifier;
  } | null;
}
interface ShareableResourceCardProps {
  document: documentItem_fragment$data | PublicDocumentData;
  detailUrl: string;
  shareLinkUrl: string;
  extraContent?: ReactNode;
  serviceInstance: ShareableServiceInstance;
  publicPath?: boolean;
}

const FOOTER_VERSIONS_INTEGRATION_TYPES: string[] = [IntegrationType.Connector];

const FOOTER_NO_AUTHOR_INTEGRATION_TYPES: string[] = [
  IntegrationType.ThirdPartyIntegration,
];

const ShareableResourceCard = ({
  document,
  detailUrl,
  shareLinkUrl,
  extraContent,
  serviceInstance,
  publicPath = false,
}: ShareableResourceCardProps) => {
  const { save } = useScrollPosition();
  const handleClick = () => {
    save();
  };
  const isConnector =
    docHasMetadata(document, DocumentMetadataKeyCode.IntegrationType) &&
    !!document.integration_type &&
    FOOTER_VERSIONS_INTEGRATION_TYPES.includes(document.integration_type);

  return (
    <Paper
      as="li"
      elevation={1}
      padding={0}
      className="overflow-hidden flex flex-col relative aria-disabled:opacity-60 hover:bg-elevation-hover h-[310px]">
      <Link
        className="flex flex-col flex-1 min-h-0 overflow-hidden gap-6 p-6"
        onClick={handleClick}
        href={detailUrl}
        prefetch={false}>
        <ShareableResourceCardHeader
          document={document}
          serviceInstanceId={serviceInstance.id}
        />
        <ShareableResourceCardDescription
          description={document.short_description}
        />
      </Link>
      <div className="flex items-center justify-between gap-1 px-6 py-4 mt-auto layer-2 bg-elevation-default border-t border-elevation-subtle-soft">
        {isConnector ? (
          <ShareableResourceCardFooterVersion
            document={document}
            publicPath={publicPath}
            shareLinkUrl={shareLinkUrl}
            extraContent={extraContent}
          />
        ) : (
          <ShareableResourceCardFooterAuthor
            shouldDisplayAuthor={
              (docHasMetadata(
                document,
                DocumentMetadataKeyCode.IntegrationType
              ) &&
                document.integration_type &&
                !FOOTER_NO_AUTHOR_INTEGRATION_TYPES.includes(
                  document.integration_type
                )) ||
              document.type !== ShareableResourceType.OPENCTI_INTEGRATION
            }
            document={document}
            shareLinkUrl={shareLinkUrl}
            extraContent={extraContent}
          />
        )}
      </div>
    </Paper>
  );
};

export default ShareableResourceCard;
