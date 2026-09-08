'use client';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { ShareableResourceCardDescription } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardDescription';
import { ShareableResourceCardFooterAuthor } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardFooterAuthor';
import { ShareableResourceCardFooterVersion } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardFooterVersions';
import { ShareableResourceCardHeader } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardHeader';
import useScrollPosition from '@/hooks/use-scroll-position';
import { cn } from '@/lib/utils';
import {
  PublicDocumentData,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { docHasMetadata } from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
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
    <li
      className={cn(
        `overflow-hidden flex flex-col relative rounded bg-elevation-background-layer-1 aria-disabled:opacity-60 hover:bg-hover h-[300px] sm:h-[348px]`
      )}>
      <Link
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
        onClick={handleClick}
        prefetch={false}
        href={detailUrl}>
        <ShareableResourceCardHeader
          document={document}
          shouldDisplayBothIcons={isConnector}
          isConnector={isConnector}
          serviceInstanceId={serviceInstance.id}
        />
        {isConnector ? (
          <div className="p-m flex flex-col gap-s flex-1 min-h-0">
            <ShareableResourceCardDescription
              description={document.short_description}
            />
            <BadgeOverflowCounter
              formatLabel={false}
              badges={document.use_cases as BadgeOverflow[]}
              className="z-2 shrink-0"
            />
          </div>
        ) : (
          <div className="p-m">
            <ShareableResourceCardDescription
              description={document.short_description}
            />
          </div>
        )}
      </Link>
      <div className="flex items-center justify-between gap-m pl-m pb-m mt-auto">
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
    </li>
  );
};

export default ShareableResourceCard;
