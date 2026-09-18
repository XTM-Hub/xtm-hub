import { Button } from '@/components/filigran-ui/components/servers';
import { cn } from '@/components/filigran-ui/lib/utils';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../Popover';
import {
  type TagInputStyleClassesProps,
  type Tag as TagType,
} from './TagInput';
import { TagList, type TagListProps } from './TagList';

type TagPopoverInputElement = React.ReactElement<{
  onFocus?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  ref?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
}>;

type TagPopoverProps = {
  children: React.ReactNode;
  tags: TagType[];
  customTagRenderer?: (tag: TagType, isActiveTag: boolean) => React.ReactNode;
  activeTagIndex?: number | null;
  setActiveTagIndex?: (index: number | null) => void;
  classStyleProps: {
    popoverClasses: TagInputStyleClassesProps['tagPopover'];
    tagListClasses: TagInputStyleClassesProps['tagList'];
    tagClasses: TagInputStyleClassesProps['tag'];
  };
  disabled?: boolean;
  usePortal?: boolean;
  heading?: string;
  description?: string;
} & TagListProps;

export const TagPopover = ({
  children,
  tags,
  customTagRenderer,
  activeTagIndex,
  setActiveTagIndex,
  classStyleProps,
  disabled,
  usePortal,
  heading = 'Entered Tags',
  description = "These are the tags you've entered.",
  ...tagProps
}: TagPopoverProps) => {
  const triggerContainerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverContentRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [popoverWidth, setPopoverWidth] = useState<number>(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [_inputFocused, setInputFocused] = useState(false);
  const [sideOffset, setSideOffset] = useState<number>(0);

  useEffect(() => {
    const handleResize = () => {
      if (triggerContainerRef.current && triggerRef.current) {
        setPopoverWidth(triggerContainerRef.current.offsetWidth);
        setSideOffset(
          triggerContainerRef.current.offsetWidth -
            triggerRef?.current?.offsetWidth
        );
      }
    };

    handleResize(); // Call on mount and layout changes

    window.addEventListener('resize', handleResize); // Adjust on window resize
    return () => window.removeEventListener('resize', handleResize);
  }, [triggerContainerRef, triggerRef]);

  // Close the popover when clicking outside of it
  useEffect(() => {
    const handleOutsideClick = (
      event: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent
    ) => {
      if (
        isPopoverOpen &&
        triggerContainerRef.current &&
        popoverContentRef.current &&
        !triggerContainerRef.current.contains(event.target as Node) &&
        !popoverContentRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isPopoverOpen]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (open && triggerContainerRef.current) {
      setPopoverWidth(triggerContainerRef.current.offsetWidth);
    }

    if (open) {
      inputRef.current?.focus();
      setIsPopoverOpen(open);
    }
  }, []);

  const handleInputFocus = (
    event:
      React.FocusEvent<HTMLInputElement> | React.FocusEvent<HTMLTextAreaElement>
  ) => {
    // Only set inputFocused to true if the popover is already open.
    // This will prevent the popover from opening due to an input focus if it was initially closed.
    if (isPopoverOpen) {
      setInputFocused(true);
    }

    const userOnFocus = (children as TagPopoverInputElement).props.onFocus;
    if (userOnFocus) userOnFocus(event);
  };

  const handleInputBlur = (
    event:
      React.FocusEvent<HTMLInputElement> | React.FocusEvent<HTMLTextAreaElement>
  ) => {
    setInputFocused(false);

    // Allow the popover to close if no other interactions keep it open
    if (!isPopoverOpen) {
      setIsPopoverOpen(false);
    }

    const userOnBlur = (children as TagPopoverInputElement).props.onBlur;
    if (userOnBlur) userOnBlur(event);
  };

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={handleOpenChange}
      modal={usePortal}>
      <div
        className="relative flex items-center rounded border border-input bg-transparent pr-3"
        ref={triggerContainerRef}>
        {React.cloneElement(children as TagPopoverInputElement, {
          onFocus: handleInputFocus,
          onBlur: handleInputBlur,
          ref: inputRef,
        })}
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon"
            role="combobox"
            className={cn(
              `hover:bg-transparent`,
              classStyleProps?.popoverClasses?.popoverTrigger
            )}
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-4 w-4 shrink-0 opacity-50 ${isPopoverOpen ? 'rotate-180' : 'rotate-0'}`}>
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        ref={popoverContentRef}
        className={cn(
          `w-full space-y-3`,
          classStyleProps?.popoverClasses?.popoverContent
        )}
        style={{
          marginLeft: `-${sideOffset}px`,
          width: `${popoverWidth}px`,
        }}>
        <div className="space-y-1">
          <h4 className="text-sm font-medium leading-none">{heading}</h4>
          <p className="text-muted-foreground text-left text-sm">
            {description}
          </p>
        </div>
        <TagList
          tags={tags}
          customTagRenderer={customTagRenderer}
          activeTagIndex={activeTagIndex}
          setActiveTagIndex={setActiveTagIndex}
          classStyleProps={{
            tagListClasses: classStyleProps?.tagListClasses,
            tagClasses: classStyleProps?.tagClasses,
          }}
          {...tagProps}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
};
