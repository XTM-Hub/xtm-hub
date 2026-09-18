'use client';

import { IndividualIcon } from '@filigran/icon';
import { cn } from '../../lib/utils';
import { SearchInput } from './search-input';

export const TopBar = ({ displayLogo = true }) => (
  <header
    className={cn(
      'sticky top-0 z-10 flex h-14 w-full shrink-0 items-center border-b border-border bg-page-background dark:bg-background px-4 justify-between',
      displayLogo ? '' : 'sm:justify-end'
    )}>
    <SearchInput />
    <div className={'flex flex-1'} />
    <div className={'size-7'}>
      <IndividualIcon />
    </div>
  </header>
);
