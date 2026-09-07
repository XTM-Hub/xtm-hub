import {
  NAVIGATION_ACTIVE_CLASSES,
  NAVIGATION_HOVER_CLASSES,
} from '@/components/menu/navigation/shared/navigation-styles';
import {
  SectionLink,
  SectionSubLink,
} from '@/components/menu/navigation/shared/navigation.type';
import { cn } from '@/lib/utils';
import { OpenInNewIcon } from '@filigran/icon';
import {
  buttonVariants,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui';
import { GradientButton } from '@filigran/ui/servers';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ElementType, ReactNode } from 'react';

export const PublicSubLink = ({
  href,
  label,
  external,
  highlight,
  badge,
  tooltip,
  className,
}: (SectionLink | SectionSubLink) & {
  className?: string;
}) => {
  const currentPath = usePathname();
  const isActive = !!href && currentPath === href;
  const sharedClassName = cn(
    buttonVariants({
      variant: 'tertiary',
      className: cn(
        'flex items-center justify-between w-full h-9 pl-6 rounded-none normal-case content-body-compact text-text-default-secondary text-xs',
        highlight &&
          !isActive &&
          'bg-clip-text text-transparent bg-gradient-focus',
        !href && 'cursor-default pointer-events-none',
        className
      ),
    }),
    isActive ? NAVIGATION_ACTIVE_CLASSES : !!href && NAVIGATION_HOVER_CLASSES
  );

  const content = (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-xs">
        {external && <OpenInNewIcon className="h-3 w-3 shrink-0" />}
        <span className={cn('truncate', !href && 'text-text-default-disabled')}>
          {label}
        </span>
      </span>
      {badge && (
        <span className="inline-flex items-center shrink-0 text-content-caption bg-clip-text text-transparent bg-gradient-focus">
          {badge}
        </span>
      )}
    </>
  );

  const wrapWithTooltip = (node: ReactNode) => {
    if (!tooltip) {
      return node;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{node}</TooltipTrigger>
          <TooltipContent className="bg-ds-bg-4 dark:bg-ds-bg-4 rounded-lg">
            <div className="flex flex-col gap-0.5">
              <span className="content-body-base text-text-default-primary">
                {label}
              </span>
              <span className="content-body-base text-muted-foreground">
                {tooltip}
              </span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (!href) {
    return wrapWithTooltip(<span className={sharedClassName}>{content}</span>);
  }

  return wrapWithTooltip(
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={sharedClassName}>
      {content}
    </Link>
  );
};

export const MenuItemIcon = ({ icon: Icon }: { icon: ElementType }) => (
  <span className="text-text-default-secondary flex w-4 shrink-0 justify-center">
    <Icon
      aria-hidden={true}
      focusable={false}
      className="h-4 w-4"
    />
  </span>
);

interface NavigationLinkMenuProps {
  open: boolean;
  href: string;
  icon: ElementType;
  text: string;
  external?: boolean;
  highlight?: boolean;
}

export const NavigationLinkMenu = ({
  href,
  icon,
  text,
  open,
  external,
  highlight,
}: NavigationLinkMenuProps) => {
  const currentPath = usePathname();
  const HighlightIcon = icon;

  if (highlight) {
    return (
      <Link
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="block">
        <GradientButton
          className={cn(
            'h-9 rounded-lg text-content-button whitespace-nowrap bg-background dark:bg-none',
            open ? 'w-full px-2' : 'w-9 px-0'
          )}
          textGradient={open}
          tabIndex={-1}>
          {open ? (
            text
          ) : (
            <HighlightIcon
              aria-hidden={true}
              focusable={false}
              className="h-4 w-4 text-filigran-brand-primary"
            />
          )}
        </GradientButton>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={cn(
        buttonVariants({
          variant: 'ghost',
          className:
            'h-9 w-full justify-start rounded-none normal-case pl-5 pr-s content-body-compact text-text-default-secondary text-xs',
        }),
        currentPath === href
          ? NAVIGATION_ACTIVE_CLASSES
          : NAVIGATION_HOVER_CLASSES
      )}>
      <MenuItemIcon icon={icon} />
      <span
        className={cn('min-w-0 truncate', open ? 'ml-2 flex-1' : 'sr-only')}>
        {text}
      </span>
    </Link>
  );
};
