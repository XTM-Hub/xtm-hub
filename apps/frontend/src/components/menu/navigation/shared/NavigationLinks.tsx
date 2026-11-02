import {
  NAVIGATION_ACTIVE_CLASSES,
  NAVIGATION_HOVER_CLASSES,
} from '@/components/menu/navigation/shared/navigation-styles';
import {
  SectionLink,
  SectionSubLink,
} from '@/components/menu/navigation/shared/navigation.type';
import { cn } from '@/lib/utils';
import { isTruncated } from '@/utils/is-truncated';
import {
  Button,
  buttonVariants,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { OpenInNewIcon } from '@filigran/icon';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ElementType, ReactElement, RefObject, useRef, useState } from 'react';

interface LabelTooltipProps {
  label: string;
  labelRef: RefObject<HTMLElement | null>;
  description?: string;
  children: ReactElement;
}

const LabelTooltip = ({
  label,
  labelRef,
  description,
  children,
}: LabelTooltipProps) => {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) =>
    setOpen(nextOpen && (!!description || isTruncated(labelRef.current)));

  return (
    <TooltipProvider>
      <Tooltip
        open={open}
        onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          {description ? (
            <div className="flex flex-col gap-0.5">
              <span>{label}</span>
              <span className="text-default-secondary">{description}</span>
            </div>
          ) : (
            label
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

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
  const labelRef = useRef<HTMLSpanElement>(null);
  const isActive = !!href && currentPath === href;
  const sharedClassName = cn(
    buttonVariants({
      priority: 'tertiary',
      className: cn(
        'flex items-center justify-between w-full h-9 pl-6 rounded-none normal-case content-compact text-default-secondary text-xs',
        !href && 'cursor-default pointer-events-none',
        className
      ),
    }),
    isActive ? NAVIGATION_ACTIVE_CLASSES : !!href && NAVIGATION_HOVER_CLASSES
  );

  const content = (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-1">
        {external && <OpenInNewIcon className="h-3 w-3 shrink-0" />}
        <span
          ref={labelRef}
          className={cn(
            'truncate',
            highlight && !isActive && 'text-gradient-focus',
            !href && 'text-default-disabled'
          )}>
          {label}
        </span>
      </span>
      {badge && (
        <span className="inline-flex items-center shrink-0 text-content-caption text-gradient-focus">
          {badge}
        </span>
      )}
    </>
  );

  return (
    <LabelTooltip
      label={label}
      labelRef={labelRef}
      description={tooltip}>
      {href ? (
        <Link
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className={sharedClassName}>
          {content}
        </Link>
      ) : (
        <span className={sharedClassName}>{content}</span>
      )}
    </LabelTooltip>
  );
};

export const MenuItemIcon = ({ icon: Icon }: { icon: ElementType }) => (
  <span className="text-icon-subtle flex w-4 shrink-0 justify-center">
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
  const labelRef = useRef<HTMLSpanElement>(null);
  const HighlightIcon = icon;

  if (highlight) {
    return (
      <Link
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="block">
        <Button
          variant="highlight"
          priority="secondary"
          tabIndex={-1}
          className={cn('overflow-hidden', open ? 'w-full px-2' : 'w-9 px-0')}>
          {open ? (
            text
          ) : (
            <HighlightIcon
              aria-hidden={true}
              focusable={false}
              className="h-4 w-4 text-filigran-brand-primary"
            />
          )}
        </Button>
      </Link>
    );
  }

  const link = (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={cn(
        buttonVariants({
          priority: 'tertiary',
          className:
            'h-9 w-full justify-start rounded-none normal-case pl-5 pr-2 content-compact text-default-secondary text-xs',
        }),
        currentPath === href
          ? NAVIGATION_ACTIVE_CLASSES
          : NAVIGATION_HOVER_CLASSES
      )}>
      <MenuItemIcon icon={icon} />
      <span
        ref={labelRef}
        className={cn('min-w-0 truncate', open ? 'ml-2 flex-1' : 'sr-only')}>
        {text}
      </span>
    </Link>
  );

  if (!open) {
    return link;
  }

  return (
    <LabelTooltip
      label={text}
      labelRef={labelRef}>
      {link}
    </LabelTooltip>
  );
};
