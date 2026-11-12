import { NavigationLinkMenu } from '@/components/menu/navigation/shared/NavigationLinks';
import {
  ClosedSection,
  LinkedSection,
  OpenedSection,
} from '@/components/menu/navigation/shared/NavigationSections';
import {
  BottomLink,
  SectionConfig,
} from '@/components/menu/navigation/shared/navigation.type';
import { Accordion } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SharedNavigationProps {
  open: boolean;
  sections: SectionConfig[];
  bottomLinks: BottomLink[];
  footerSections?: SectionConfig[];
}

export const SharedNavigation = ({
  open,
  sections,
  bottomLinks,
  footerSections = [],
}: SharedNavigationProps) => {
  return (
    <nav className="flex-1 min-h-0 overflow-y-auto">
      {open ? (
        <Accordion
          type="single"
          collapsible
          className="w-full">
          {sections.map((section) =>
            section.href ? (
              <LinkedSection
                key={section.key}
                section={section}
                open={true}
              />
            ) : (
              <OpenedSection
                key={section.key}
                section={section}
              />
            )
          )}
        </Accordion>
      ) : (
        <ul>
          {sections.map((section) => (
            <li key={section.key}>
              {section.href ? (
                <LinkedSection
                  section={section}
                  open={false}
                />
              ) : (
                <ClosedSection section={section} />
              )}
            </li>
          ))}
        </ul>
      )}

      <Separator className="my-2" />
      <ul className="space-y-2 pb-2">
        {bottomLinks.map((link) => (
          <li
            key={link.key}
            className={
              link.highlight
                ? cn('pt-2', open ? 'px-4' : 'flex justify-center')
                : undefined
            }>
            <NavigationLinkMenu
              open={open}
              href={link.href}
              icon={link.icon}
              text={link.label}
              external={link.external}
              highlight={link.highlight}
              analyticsId={link.analyticsId}
            />
          </li>
        ))}
      </ul>

      {footerSections.length > 0 && (
        <>
          <Separator className="my-2" />
          {open ? (
            <Accordion
              type="single"
              collapsible
              className="w-full">
              {footerSections.map((section) =>
                section.href ? (
                  <LinkedSection
                    key={section.key}
                    section={section}
                    open={true}
                  />
                ) : (
                  <OpenedSection
                    key={section.key}
                    section={section}
                  />
                )
              )}
            </Accordion>
          ) : (
            <ul>
              {footerSections.map((section) => (
                <li key={section.key}>
                  {section.href ? (
                    <LinkedSection
                      section={section}
                      open={false}
                    />
                  ) : (
                    <ClosedSection section={section} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </nav>
  );
};
