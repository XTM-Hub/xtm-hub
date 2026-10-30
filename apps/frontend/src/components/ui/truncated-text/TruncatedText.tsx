'use client';

import { isTruncated } from '@/utils/is-truncated';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@filigran/design-system';
import { ReactNode, useRef, useState } from 'react';

export interface TruncatedTextProps {
  text: string;
  details?: ReactNode;
}

// A text cut off by the width of its cell, shown in full in a tooltip when it is cut off,
// or along with its details whenever it has some. Like Tooltip, it needs a TooltipProvider above it.
export const TruncatedText = ({ text, details }: TruncatedTextProps) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <Tooltip
      open={open}
      onOpenChange={(nextOpen) =>
        setOpen(nextOpen && (!!details || isTruncated(textRef.current)))
      }>
      <TooltipTrigger asChild>
        {/* Block, so its box is the width of the cell and can be told cut off */}
        <span
          ref={textRef}
          tabIndex={0}
          className="block truncate">
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {details ? (
          <div className="flex flex-col gap-0.5">
            <span>{text}</span>
            {details}
          </div>
        ) : (
          text
        )}
      </TooltipContent>
    </Tooltip>
  );
};
