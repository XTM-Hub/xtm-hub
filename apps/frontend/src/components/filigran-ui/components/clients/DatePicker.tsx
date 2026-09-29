'use client';
import { format } from 'date-fns';

import { cn } from '@/components/filigran-ui/lib/utils';
import { CalendarViewMonthIcon } from '@filigran/icon';
import { forwardRef } from 'react';
import { Button } from '../servers';
import { Calendar } from './Calendar';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

export const DatePicker = forwardRef<
  HTMLDivElement,
  {
    date?: Date;
    setDate: (date?: Date) => void;
    popoverContentClassName?: string;
    placeholderText?: string;
  }
>(function DatePickerCmp(
  { date, setDate, popoverContentClassName, placeholderText = 'Pick a date' },
  ref
) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal normal-case',
            !date && 'text-muted-foreground'
          )}>
          <CalendarViewMonthIcon className="mr-2 h-3 w-3" />
          {date ? format(date, 'PP') : <span>{placeholderText}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('w-auto p-0', popoverContentClassName)}
        ref={ref}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
});
