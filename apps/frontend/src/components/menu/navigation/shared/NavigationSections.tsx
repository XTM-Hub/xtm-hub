import {
  isNavigationPathActive,
  isSectionPathActive,
} from '@/components/menu/navigation/shared/navigation-path.utils';
import {
  NAVIGATION_ACTIVE_CLASSES,
  NAVIGATION_HOVER_CLASSES,
  NAVIGATION_SECTION_ACTIVE_CLASSES,
  NAVIGATION_SUBMENU_HOVER_CLASSES,
} from '@/components/menu/navigation/shared/navigation-styles';
import type {
  SectionConfig,
  SectionLink,
} from '@/components/menu/navigation/shared/navigation.type';
import {
  MenuItemIcon,
  PublicSubLink,
} from '@/components/menu/navigation/shared/NavigationLinks';
import { useActiveAccordionItem } from '@/components/menu/navigation/shared/use-active-accordion-item';
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
import { buttonVariants, IconButton, Text } from '@filigran/design-system';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useDebounceValue } from 'usehooks-ts';

interface SectionLinksGroup {
  label?: string;
  links: SectionLink[];
}

const groupSectionLinks = (links: SectionLink[]): SectionLinksGroup[] => {
  const groups: SectionLinksGroup[] = [];
  for (const link of links) {
    const lastGroup = groups.at(-1);
    if (lastGroup && lastGroup.label === link.group) {
      lastGroup.links.push(link);
    } else {
      groups.push({ label: link.group, links: [link] });
    }
  }
  return groups;
};

const getSectionLinkKey = (link: SectionLink) =>
  `${link.label}-${link.href ?? `group-${link.subLinks?.length ?? 0}`}`;

const SectionLinkGroup = ({
  link,
}: {
  link: Exclude<SectionLink, { subLinks?: undefined }>;
}) => {
  const currentPath = usePathname();
  const accordionKey = `${getSectionLinkKey(link)}-accordion`;
  const hasActiveSubLink = link.subLinks.some(
    (subLink) =>
      !!subLink.href && isNavigationPathActive(currentPath, subLink.href)
  );
  const [openItem, setOpenItem] = useActiveAccordionItem(
    hasActiveSubLink ? accordionKey : undefined
  );

  return (
    <li>
      <Accordion
        type="single"
        collapsible
        value={openItem}
        onValueChange={setOpenItem}
        className="w-full">
        <AccordionItem
          className="border-none pl-0"
          value={accordionKey}>
          <AccordionTrigger
            {...analyticsId(link.analyticsId)}
            className={cn(
              'h-9 py-1 pl-6 content-compact text-default-secondary cursor-pointer',
              NAVIGATION_SUBMENU_HOVER_CLASSES
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
              {link.subLinks.map((subLink) => {
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
};

const SectionLinkItem = ({ link }: { link: SectionLink }) =>
  link.subLinks ? (
    <SectionLinkGroup link={link} />
  ) : (
    <li>
      <PublicSubLink {...link} />
    </li>
  );

const SectionLinksList = ({ links }: { links: SectionLink[] }) => (
  <ul className="space-y-1">
    {groupSectionLinks(links).map((group) =>
      group.label ? (
        <li key={group.label}>
          <Text
            as="span"
            variant="content-caption"
            className="flex h-8 items-end pb-1 pl-4 pr-2 text-default-secondary">
            {group.label}
          </Text>
          <ul aria-label={group.label}>
            {group.links.map((link) => (
              <SectionLinkItem
                key={getSectionLinkKey(link)}
                link={link}
              />
            ))}
          </ul>
        </li>
      ) : (
        group.links.map((link) => (
          <SectionLinkItem
            key={getSectionLinkKey(link)}
            link={link}
          />
        ))
      )
    )}
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
    : isSectionPathActive(section, currentPath);
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
            isSectionPathActive(section, currentPath)
              ? NAVIGATION_SECTION_ACTIVE_CLASSES
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
  const currentPath = usePathname();
  return (
    <AccordionItem
      {...(section.product && analyticsProduct(section.product))}
      className="border-none"
      value={section.key}>
      <AccordionTrigger
        {...analyticsId(section.analyticsId)}
        className={cn(
          'h-9 pl-5 py-1 cursor-pointer hover:bg-elevation-hover font-normal hover:shadow-[inset_2px_0px]',
          isSectionPathActive(section, currentPath) &&
            NAVIGATION_SECTION_ACTIVE_CLASSES
        )}>
        <MenuItemIcon icon={Icon} />
        <span className="flex-1 px-2 text-left text-default-primary text-sm content-base truncate">
          {section.label}
        </span>
      </AccordionTrigger>
      {section.links.length > 0 && (
        <AccordionContent className="bg-elevation-default">
          <SectionLinksList links={section.links} />
        </AccordionContent>
      )}
    </AccordionItem>
  );
};
