import { Input, InputProps } from '@filigran/design-system';
import { SearchIcon } from '@filigran/icon';

export const SearchInput = ({ placeholder, ...props }: InputProps) => {
  return (
    <Input
      aria-label={placeholder}
      placeholder={placeholder}
      {...props}
      startIcon={<SearchIcon className="size-4" />}
    />
  );
};
