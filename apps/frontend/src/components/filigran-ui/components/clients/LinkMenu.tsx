import { cn } from '@/components/filigran-ui/lib/utils';
import { KeyboardArrowDownIcon, KeyboardArrowUpIcon } from '@filigran/icon';
import { type ReactNode } from 'react';
import { buttonVariants } from '../servers';

export const LinkMenu = ({
  currentPath,
  text,
  children,
  open = false,
  collapse = true,
  asChild = false,
}: {
  currentPath: boolean;
  text: string;
  children?: ReactNode;
  open?: boolean;
  collapse?: boolean;
  asChild?: boolean;
}) => {
  return (
    <a
      href={'#'}
      style={{ textDecoration: 'none' }}
      className={cn(
        buttonVariants({
          variant: 'ghost',
          className: 'h-9 w-full justify-start rounded-none normal-case px-m',
        }),
        asChild && 'txt-sub-content',
        currentPath && 'bg-primary/10 shadow-[inset_2px_0px] shadow-primary'
      )}>
      <span className="flex w-8 shrink-0 justify-center size-4">
        {children}
      </span>
      <span className={cn(open ? 'ml-2' : 'sr-only')}>{text}</span>
      {!asChild && (
        <>
          {collapse ? (
            <KeyboardArrowDownIcon className={'size-3 ml-auto'} />
          ) : (
            <KeyboardArrowUpIcon className={'size-3 ml-auto'} />
          )}
        </>
      )}
    </a>
  );
};
