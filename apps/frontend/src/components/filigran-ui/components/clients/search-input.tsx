import { Group5Icon, SearchIcon } from '@filigran/icon';
import { cn } from '../../lib/utils';

export const SearchInput = () => (
  <div
    style={{
      width: '500px',
    }}
    className={cn(`
      flex
      h-9
      gap-x-2
      rounded-md
      border
      border-input
      bg-background 
      px-3
      py-2
      text-sm
    `)}>
    <SearchIcon />
    <span>Search the platform</span>
    <div className={'flex flex-1'} />
    <Group5Icon className="h-4 w-4" />
  </div>
);
