'use client';

import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { InfoIcon } from '@filigran/icon';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@filigran/ui';
import { PlatformIdentifier } from '@graphql/generated';
import { getBundleRolePanels } from './manage-trial.const';

interface ManageTrialRoleDescriptionsProps {
  stacked?: boolean;
  products: PlatformIdentifier[];
}

export const ManageTrialRoleDescriptions = ({
  stacked = false,
  products,
}: ManageTrialRoleDescriptionsProps) => {
  const t = useTranslate();
  const bundleRolePanels = getBundleRolePanels(products);

  return (
    <Accordion
      type="single"
      collapsible
      className={cn('flex flex-col gap-l', !stacked && 'md:flex-row')}>
      {bundleRolePanels.map(({ platform, roles, defaultRole }) => {
        const namespace = `Service.Bundle.ManageTrial.Roles.${platform}`;

        return (
          <AccordionItem
            key={platform}
            value={platform}
            className={cn(
              !stacked && 'md:flex-1',
              stacked && 'border-b border-elevation-border-strong-layer-3'
            )}>
            <AccordionTrigger
              className={cn(
                'py-s pr-0 hover:no-underline cursor-pointer data-[state=open]:border-b-0',
                !stacked && 'border-b border-elevation-border-default-layer-0'
              )}>
              <span className="flex items-center gap-xs text-header-heading-xs">
                <InfoIcon className="h-4 w-4 shrink-0" />
                {t(`${namespace}.Title`, { count: roles.length })}
              </span>
            </AccordionTrigger>
            <AccordionContent
              className={cn(
                'py-s flex flex-col gap-s',
                !stacked && 'border-b border-elevation-border-default-layer-0'
              )}>
              {roles.map((role) => (
                <p
                  key={role}
                  className="text-content-body-compact text-text-default-secondary">
                  <span className="font-bold text-header-heading-xs">
                    {t(`${namespace}.${role}.Label`)}
                    {role === defaultRole &&
                      ` ${t('Service.Bundle.ManageTrial.Roles.DefaultSuffix')}`}
                    :{' '}
                  </span>
                  {t(`${namespace}.${role}.Description`)}
                </p>
              ))}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
