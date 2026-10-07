'use client';

import { ResourceStatusIcons } from '@/components/ui/ResourceStatusIcons';
import { docHasMetadata } from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { publicDocumentListItemFragment$data } from '@generated/publicDocumentListItemFragment.graphql';
import { DocumentMetadataKeyCode, IntegrationType } from '@graphql/generated';

interface DocumentNameCellProps {
  document: documentItem_fragment$data | publicDocumentListItemFragment$data;
}

export const DocumentNameCell = ({ document }: DocumentNameCellProps) => {
  const isConnector =
    docHasMetadata(document, DocumentMetadataKeyCode.IntegrationType) &&
    document.integration_type === IntegrationType.Connector;

  const deployable =
    document.active &&
    isConnector &&
    docHasMetadata(document, DocumentMetadataKeyCode.ManagerSupported) &&
    !!document.manager_supported;

  const verified =
    document.active &&
    isConnector &&
    docHasMetadata(document, DocumentMetadataKeyCode.Verified) &&
    !!document.verified;

  return (
    <div className="flex items-center gap-xs">
      <span>{document.name}</span>
      <ResourceStatusIcons
        deployable={deployable}
        verified={verified}
        displayUnverifiedIcon={isConnector}
        iconClassName="h-4 w-4 shrink-0 text-alert-success-primary"
      />
    </div>
  );
};

interface DocumentShortDescriptionCellProps {
  document: documentItem_fragment$data | publicDocumentListItemFragment$data;
}

export const DocumentShortDescriptionCell = ({
  document,
}: DocumentShortDescriptionCellProps) => {
  const shortDescription = document.short_description ?? '';

  if (!shortDescription) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="block w-full truncate text-left">
          {shortDescription}
        </TooltipTrigger>
        <TooltipContent>
          <p>{shortDescription}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
