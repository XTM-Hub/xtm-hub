import {
  NAVIGATION_ACTIVE_CLASSES,
  NAVIGATION_HOVER_CLASSES,
} from '@/components/menu/navigation/shared/navigation-styles';
import type {
  SectionConfig,
  SectionLink,
} from '@/components/menu/navigation/shared/navigation.type';
import {
  MenuItemIcon,
  PublicSubLink,
} from '@/components/menu/navigation/shared/NavigationLinks';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Popover, PopoverContent, PopoverTrigger } from '@filigran/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { buttonVariants, IconButton } from '@filigran/design-system';

const SectionLinksList = ({ links }: { links: SectionLink[] }) => (
  <ul className="space-y-xs">
    {links.map((link) => {
      const nestedLinks = link.subLinks ?? [];
      const hasNestedLinks = nestedLinks.length > 0;
      const key = `${link.label}-${link.href ?? `group-${nestedLinks.length}`}`;

      if (!hasNestedLinks) {
        return (
          <li key={key}>
            <PublicSubLink {...link} />
          </li>
        );
      }

      return (
        <li key={key}>
          <Accordion
            type="single"
            collapsible
            className="w-full">
            <AccordionItem
              className="border-none pl-0"
              value={`${key}-accordion`}>
              <AccordionTrigger
                className={cn(
                  'h-9 py-xs pl-6 content-body-compact text-text-default-secondary cursor-pointer hover:bg-hover hover:no-underline',
                  NAVIGATION_HOVER_CLASSES
                )}>
                <span className="flex flex-1 items-center justify-between gap-xs truncate pr-xs">
                  <span className="truncate">{link.label}</span>
                  {link.badge && (
                    <span
                      aria-hidden={true}
                      className="inline-flex min-w-4 items-center justify-center rounded-full border border-border/70 bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
                      {link.badge}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-0 pt-0">
                <ul className="p-0">
                  {nestedLinks.map((subLink) => {
                    const subKey = `${subLink.label}-${subLink.href ?? 'sub-link'}`;

                    return (
                      <li key={subKey}>
                        <PublicSubLink {...subLink} />
                      </li>
                    );
                  })}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </li>
      );
    })}
  </ul>
);

export const LinkedSection = ({
  section,
  open,
}: {
  section: SectionConfig;
  open: boolean;
}) => {
  const Icon = section.icon;
  const currentPath = usePathname();
  const isActive = section.href
    ? currentPath === section.href
    : currentPath.startsWith(section.pathPrefix);
  return (
    <Link
      href={section.href ?? section.pathPrefix}
      className={cn(
        buttonVariants({ priority: 'tertiary' }),
        'h-9 w-full justify-start rounded-none normal-case pl-5 font-normal',
        isActive ? NAVIGATION_ACTIVE_CLASSES : NAVIGATION_HOVER_CLASSES
      )}
      aria-label={section.label}>
      <MenuItemIcon icon={Icon} />
      {open && (
        <span className="flex-1 px-s text-left text-foreground content-body-base truncate">
          {section.label}
        </span>
      )}
    </Link>
  );
};

export const ClosedSection = ({ section }: { section: SectionConfig }) => {
  const [popoverOpen, setPopoverOpen] = useDebounceValue(false, 100);
  const currentPath = usePathname();
  const Icon = section.icon;

  useEffect(() => setPopoverOpen(false), [currentPath, setPopoverOpen]);

  const handleMouseEnter = () => setPopoverOpen(true);
  const handleMouseLeave = () => setPopoverOpen(false);

  return (
    <Popover
      open={popoverOpen}
      onOpenChange={setPopoverOpen}>
      <PopoverTrigger
        asChild
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>
        <IconButton
          priority="tertiary"
          className={cn(
            'h-9 w-full justify-start rounded-none pl-5 cursor-pointer',
            currentPath.startsWith(section.pathPrefix)
              ? 'bg-primary/10 shadow-[inset_2px_0px] shadow-primary'
              : NAVIGATION_HOVER_CLASSES
          )}
          aria-label={section.label}
          icon={<MenuItemIcon icon={Icon} />}
        />
      </PopoverTrigger>
      {section.links.length > 0 && (
        <PopoverContent
          sideOffset={0}
          side="right"
          align="start"
          asChild
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}>
          <div className="w-50 p-s">
            <SectionLinksList links={section.links} />
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};

export const OpenedSection = ({ section }: { section: SectionConfig }) => {
  const Icon = section.icon;
  return (
    <AccordionItem
      className="border-none"
      value={section.key}>
      <AccordionTrigger className="h-9 pl-5 py-xs cursor-pointer hover:bg-hover hover:no-underline font-normal hover:shadow-[inset_2px_0px] hover:shadow-white">
        <MenuItemIcon icon={Icon} />
        <span className="flex-1 px-s text-left text-foreground text-sm content-body-base truncate">
          {section.label}
        </span>
      </AccordionTrigger>
      {section.links.length > 0 && (
        <AccordionContent>
          <SectionLinksList links={section.links} />
        </AccordionContent>
      )}
    </AccordionItem>
  );
};
