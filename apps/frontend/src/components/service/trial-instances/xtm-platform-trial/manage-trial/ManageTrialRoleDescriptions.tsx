'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { cn } from '@/lib/utils';
import { InfoIcon } from '@filigran/icon';
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
      className={cn('flex flex-col gap-4', !stacked && 'md:flex-row')}>
      {bundleRolePanels.map(({ platform, roles, defaultRole }) => {
        const namespace = `Service.Bundle.ManageTrial.Roles.${platform}`;

        return (
          <AccordionItem
            key={platform}
            value={platform}
            className={cn(
              !stacked && 'md:flex-1',
              stacked &&
                'border-b border-[var(--border-elevation-default-layer-3)]'
            )}>
            <AccordionTrigger
              {...analyticsId('trial_role_descriptions_toggle')}
              className={cn(
                'pr-0 cursor-pointer data-[state=open]:border-b-0',
                !stacked && 'border-b border-elevation-default'
              )}>
              <span className="flex items-center gap-1 text-title-xs">
                <InfoIcon className="h-4 w-4 shrink-0" />
                {t(`${namespace}.Title`, { count: roles.length })}
              </span>
            </AccordionTrigger>
            <AccordionContent
              className={cn(
                'flex flex-col gap-2',
                !stacked && 'border-b border-elevation-default'
              )}>
              {roles.map((role) => (
                <p
                  key={role}
                  className="text-content-compact text-default-secondary">
                  <span className="font-bold text-title-xs">
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
