'use client';
import { cn } from '@/components/filigran-ui/lib/utils';
import { forwardRef, useMemo, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useTranslations } from 'next-intl';
import { Input } from '../servers';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { IconButton, type IconButtonProps } from '@filigran/design-system';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

const ColorPicker = forwardRef<
  HTMLInputElement,
  Omit<IconButtonProps, 'aria-label' | 'children' | 'icon'> &
    ColorPickerProps
>(
  (
    { disabled, value, onChange, onBlur, name, className, ...props },
    forwardedRef
  ) => {
    const t = useTranslations();
    const [open, setOpen] = useState(false);
    const parsedValue = useMemo(() => {
      return value || '#FFFFFF';
    }, [value]);
    return (
      <Popover
        onOpenChange={setOpen}
        open={open}>
        <div className="flex gap-2 items-center relative">
          <Input
            maxLength={7}
            onChange={(e) => {
              onChange(e?.currentTarget?.value);
            }}
            ref={forwardedRef}
            value={parsedValue}
          />
          <PopoverTrigger
            asChild
            disabled={disabled}
            onBlur={onBlur}>
            <IconButton
              {...props}
              className={cn(
                'block size-5 rounded-full absolute right-2',
                className
              )}
              name={name}
              onClick={() => {
                setOpen(true);
              }}
              aria-label={t('UseCaseForm.Color')}
              icon={<div className="h-0 w-0" />}
              style={{
                backgroundColor: parsedValue,
              }}
              priority="secondary"
            />
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-full">
          <HexColorPicker
            color={parsedValue}
            onChange={onChange}
          />
        </PopoverContent>
      </Popover>
    );
  }
);
ColorPicker.displayName = 'ColorPicker';
export { ColorPicker };
