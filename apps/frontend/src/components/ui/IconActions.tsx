'use client';
import { cn } from '@/lib/utils';
import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from '@filigran/design-system';
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

export { MenuItem as IconActionsItem } from '@filigran/design-system';

interface IconActionsProps {
  children: ReactNode;
  icon: ReactNode;
  label?: ReactNode;
  className?: string;
}

interface IconActionContextProps {
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
}

type IconActionsButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'color'
>;

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
    <Menu
      open={menuOpen}
      onOpenChange={setMenuOpen}>
      <MenuTrigger asChild>
        <div className="flex items-center gap-s cursor-pointer">
          {label}
          <Button
            priority="tertiary"
            className={cn('h-8 w-8 p-0 data-[state=open]:bg-hover', className)}>
            {icon}
          </Button>
        </div>
      </MenuTrigger>
      <MenuContent align="end">
        <IconActionContext.Provider value={{ setMenuOpen }}>
          {children}
        </IconActionContext.Provider>
      </MenuContent>
    </Menu>
  );
};

export const IconActionsButton = ({
  children,
  className,
  ...props
}: IconActionsButtonProps) => {
  return (
    <Button
      priority="tertiary"
      className={cn('w-full justify-start normal-case', className)}
      onClick={(e) => e.stopPropagation()}
      {...props}>
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
    <MenuItem asChild>
      <Link
        {...props}
        className={className}>
        {children}
      </Link>
    </MenuItem>
  );
};
