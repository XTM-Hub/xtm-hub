import { Chip } from '@filigran/design-system';
import {
  type TagInputProps,
  type TagInputStyleClassesProps,
  type Tag as TagType,
} from './TagInput';

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
  onTagClick,
  onRemoveTag,
  isActiveTag,
  disabled,
}: TagProps) => {
  return (
    <Chip
      key={tagObj.id}
      label={tagObj.text}
      className={cn({
        'w-full justify-between': direction === 'column',
        'ring-2 ring-focus ring-offset-1 ring-offset-focus': isActiveTag,
      })}
      onClick={onTagClick && !disabled ? () => onTagClick(tagObj) : undefined}
      onDelete={() => onRemoveTag(tagObj.id)}
      disabled={disabled}
    />
  );
};
