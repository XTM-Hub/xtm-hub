import { CloseIcon } from '@filigran/icon';
import React from 'react';
import {
  type TagInputProps,
  type TagInputStyleClassesProps,
  type Tag as TagType,
} from './tag-input';

import { cva } from 'class-variance-authority';
import { cn } from '../../../lib/utils';
import { Badge } from '../../servers';

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

export const Tag: React.FC<TagProps> = ({
  tagObj,
  direction,
  draggable,
  onTagClick,
  onRemoveTag,
  variant,
  isActiveTag,
  tagClasses,
  disabled,
}) => {
  return (
    <Badge
      key={tagObj.id}
      className={cn(
        tagVariants({
          variant,
        }),
        {
          'w-full justify-between': direction === 'column',
          'cursor-pointer': draggable,
          'ring-2 ring-ring ring-offset-2 ring-offset-background': isActiveTag,
        }
      )}
      onClick={() => onTagClick?.(tagObj)}>
      {tagObj.text}
      <CloseIcon
        className="ml-s h-3 w-3 cursor-pointer"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation(); // Prevent event from bubbling up to the tag span
          onRemoveTag(tagObj.id);
        }}
      />
    </Badge>
  );
};
