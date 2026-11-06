'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { PublicDocumentListItemFragment } from '@graphql/generated';

interface DocumentNameCellProps {
  document: documentItem_fragment$data | PublicDocumentListItemFragment;
}

export const DocumentNameCell = ({ document }: DocumentNameCellProps) => (
  <span className="block truncate content-compact">{document.name}</span>
);

interface DocumentShortDescriptionCellProps {
  document: documentItem_fragment$data | PublicDocumentListItemFragment;
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
