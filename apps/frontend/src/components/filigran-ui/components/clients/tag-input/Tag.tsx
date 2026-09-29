import { CloseIcon } from '@filigran/icon';
import React from 'react';
import {
  type TagInputProps,
  type TagInputStyleClassesProps,
  type Tag as TagType,
} from './TagInput';

import { Badge } from '@/components/filigran-ui/components/servers';
import { cn } from '@/components/filigran-ui/lib/utils';
import { cva } from 'class-variance-authority';

export const tagVariants = cva('font-medium', {
  variants: {
    variant: {
      default: 'text-primary',
      secondary: 'text-secondary',
      destructive: 'text-destructive',
      inverted: 'inverted',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type TagProps = {
  tagObj: TagType;
  variant: TagInputProps['variant'];
  onRemoveTag: (id: string) => void;
  isActiveTag?: boolean;
  tagClasses?: TagInputStyleClassesProps['tag'];
  disabled?: boolean;
} & Pick<TagInputProps, 'direction' | 'onTagClick' | 'draggable'>;

export const Tag = ({
  tagObj,
  direction,
  draggable,
  onTagClick,
  onRemoveTag,
  variant,
  isActiveTag,
  tagClasses,
  disabled,
}: TagProps) => {
  return (
    <Badge
      key={tagObj.id}
      className={cn(
        tagVariants({
          variant,
        }),
        {
          'w-full justify-between': direction === 'column',
          'cursor-pointer': draggable && !disabled,
          'ring-2 ring-ring ring-offset-2 ring-offset-background': isActiveTag,
          'cursor-not-allowed opacity-50': disabled,
        },
        tagClasses?.body
      )}
      onClick={() => !disabled && onTagClick?.(tagObj)}>
      {tagObj.text}
      <CloseIcon
        className={cn(
          'ml-s h-3 w-3 cursor-pointer',
          disabled && 'cursor-not-allowed',
          tagClasses?.closeButton
        )}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation(); // Prevent event from bubbling up to the tag span
          if (!disabled) {
            onRemoveTag(tagObj.id);
          }
        }}
      />
    </Badge>
  );
};
