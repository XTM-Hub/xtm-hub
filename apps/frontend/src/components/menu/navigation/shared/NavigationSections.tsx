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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { analyticsProduct } from '@/lib/analytics/analytics.context';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { cn } from '@/lib/utils';
import { buttonVariants, IconButton } from '@filigran/design-system';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useDebounceValue } from 'usehooks-ts';

const SectionLinksList = ({ links }: { links: SectionLink[] }) => (
  <ul className="space-y-1">
    {links.map((link) => {
      const nestedLinks = link.subLinks ?? [];
      const key = `${link.label}-${link.href ?? `group-${nestedLinks.length}`}`;

      if (!link.subLinks) {
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
                {...analyticsId(link.analyticsId)}
                className={cn(
                  'h-9 py-1 pl-6 content-compact text-default-secondary cursor-pointer hover:bg-elevation-hover',
                  NAVIGATION_HOVER_CLASSES
                )}>
                <span className="flex flex-1 items-center justify-between gap-1 truncate pr-1">
                  <span className="truncate">{link.label}</span>
                  {link.badge && (
                    <span
                      aria-hidden={true}
                      className="inline-flex min-w-4 items-center justify-center rounded-full border border-[var(--border-elevation-subtle)]/70 bg-elevation-highlight px-1.5 py-0.5 text-[10px] font-medium leading-none text-default-secondary">
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
      {...analyticsId(section.analyticsId)}
      href={section.href ?? section.pathPrefix}
      className={cn(
        buttonVariants({ priority: 'tertiary' }),
        'h-9 w-full justify-start rounded-none normal-case pl-5 font-normal',
        isActive ? NAVIGATION_ACTIVE_CLASSES : NAVIGATION_HOVER_CLASSES
      )}
      aria-label={section.label}>
      <MenuItemIcon icon={Icon} />
      {open && (
        <span className="flex-1 px-2 text-left text-default-primary content-base truncate">
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
          {...analyticsId(section.analyticsId)}
          {...(section.product && analyticsProduct(section.product))}
          priority="tertiary"
          className={cn(
            'h-9 w-full justify-start rounded-none pl-5 cursor-pointer',
            currentPath.startsWith(section.pathPrefix)
              ? 'bg-filigran-brand-primary-transparency-10 shadow-[inset_2px_0px] shadow-filigran-brand-primary'
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
          padding={8}
          className="w-72"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}>
          <SectionLinksList links={section.links} />
        </PopoverContent>
      )}
    </Popover>
  );
};

export const OpenedSection = ({ section }: { section: SectionConfig }) => {
  const Icon = section.icon;
  return (
    <AccordionItem
      {...(section.product && analyticsProduct(section.product))}
      className="border-none"
      value={section.key}>
      <AccordionTrigger
        {...analyticsId(section.analyticsId)}
        className="h-9 pl-5 py-1 cursor-pointer hover:bg-elevation-hover font-normal hover:shadow-[inset_2px_0px]">
        <MenuItemIcon icon={Icon} />
        <span className="flex-1 px-2 text-left text-default-primary text-sm content-base truncate">
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
