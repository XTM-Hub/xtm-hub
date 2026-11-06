'use client';
import {
  type AnalyticsElementId,
  analyticsId,
} from '@/lib/analytics/analytics.ids';
import { cn } from '@/lib/utils';
import {
  Button,
  IconButton,
  type IconButtonProps,
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
  'aria-label': string;
  analyticsId: AnalyticsElementId;
  size?: IconButtonProps['size'];
  className?: string;
}

interface IconActionContextProps {
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
}

type IconActionsButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'color'
> & {
  analyticsId: AnalyticsElementId;
};

export const IconActionContext = createContext<IconActionContextProps>({
  setMenuOpen: () => {},
});
export const IconActions = ({
  children,
  icon,
  'aria-label': ariaLabel,
  analyticsId: elementId,
  size,
  className,
}: IconActionsProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Menu
      open={menuOpen}
      onOpenChange={setMenuOpen}>
      <MenuTrigger asChild>
        <IconButton
          {...analyticsId(elementId)}
          priority="tertiary"
          size={size}
          className={className}
          aria-label={ariaLabel}
          icon={icon}
        />
      </MenuTrigger>
      <MenuContent
        align="end"
        className="layer-1">
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
  analyticsId: elementId,
  ...props
}: IconActionsButtonProps) => {
  return (
    <Button
      {...analyticsId(elementId)}
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
  analyticsId: AnalyticsElementId;
};
export const IconActionsLink = ({
  children,
  className,
  analyticsId: elementId,
  ...props
}: IconActionsLinkProps) => {
  return (
    <MenuItem asChild>
      <Link
        {...props}
        {...analyticsId(elementId)}
        className={className}>
        {children}
      </Link>
    </MenuItem>
  );
};
