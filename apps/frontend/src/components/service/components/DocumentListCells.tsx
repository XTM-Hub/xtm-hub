'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import {
  DocumentItemFragment,
  PublicDocumentListItemFragment,
} from '@graphql/generated';

interface DocumentNameCellProps {
  document: DocumentItemFragment | PublicDocumentListItemFragment;
}

export const DocumentNameCell = ({ document }: DocumentNameCellProps) => (
  <span className="block truncate content-compact">{document.name}</span>
);

interface DocumentShortDescriptionCellProps {
  document: DocumentItemFragment | PublicDocumentListItemFragment;
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
        <TooltipTrigger className="block w-full truncate text-left content-base">
          {shortDescription}
        </TooltipTrigger>
        <TooltipContent>
          <p>{shortDescription}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
