import { cn } from '@/components/filigran-ui/lib/utils';
import { Group5Icon, SearchIcon } from '@filigran/icon';

export const SearchInput = ({
  label = 'Search the platform',
}: {
  label?: string;
}) => (
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
    <span>{label}</span>
    <div className={'flex flex-1'} />
    <Group5Icon className="h-4 w-4" />
  </div>
);
