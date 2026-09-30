'use client';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@filigran/ui';
import Link from 'next/link';
import {
  type ButtonHTMLAttributes,
  type ComponentProps,
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useState,
} from 'react';
import { Button } from '@filigran/design-system';

export { DropdownMenuItem as IconActionsItem } from '@filigran/ui/clients';

interface IconActionsProps {
  children: ReactNode;
  icon: ReactNode;
  label?: ReactNode;
  className?: string;
}

interface IconActionContextProps {
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
}

type IconActionsButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const IconActionContext = createContext<IconActionContextProps>({
  setMenuOpen: () => {},
});
export const IconActions = ({
  children,
  label,
  icon,
  className,
}: IconActionsProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <DropdownMenu
      open={menuOpen}
      onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-s cursor-pointer">
          {label}
          <Button
            priority="tertiary" className={cn('h-8 w-8 p-0 data-[state=open]:bg-hover', className)}>
            {icon}
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[160px] z-[1500]">
        <IconActionContext.Provider value={{ setMenuOpen }}>
          {children}
        </IconActionContext.Provider>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const IconActionsButton = ({
  children,
  className,
  ...props
}: IconActionsButtonProps) => {
  return (
    <Button
      priority="tertiary" className={cn('w-full justify-start normal-case', className)} onClick={(e) => e.stopPropagation()} {...props}>
      {children}
    </Button>
  );
};

type IconActionsLinkProps = ComponentProps<typeof Link> & {
  className?: string;
};
export const IconActionsLink = ({
  children,
  className,
  ...props
}: IconActionsLinkProps) => {
  return (
    <DropdownMenuItem asChild>
      <Link
        {...props}
        className={className}>
        {children}
      </Link>
    </DropdownMenuItem>
  );
};
