'use client';

import { useTranslate } from '@/hooks/use-translate';
import { FormControl, FormField, FormItem, FormLabel } from '@filigran/ui';
import { PlatformIdentifier } from '@graphql/generated';
import { Control } from 'react-hook-form';
import {
  NO_ROLE_VALUE,
  RoleFormField,
  RolePanelConfig,
  TrialUserRolesFormValues,
} from './manage-trial.const';
import { MixedRoleDefault } from './manage-trial.utils';
import { RoleSelect } from './RoleSelect';

interface TrialUserRolePanelFieldsProps {
  control: Control<TrialUserRolesFormValues>;
  bundleRolePanels: RolePanelConfig[];
  mixedRoleDefaults?: Partial<Record<PlatformIdentifier, MixedRoleDefault>>;
}

export const TrialUserRolePanelFields = ({
  control,
  bundleRolePanels,
  mixedRoleDefaults,
}: TrialUserRolePanelFieldsProps) => {
  const t = useTranslate();
  return (
    <div className="flex flex-col md:flex-row gap-l mt-l">
      {bundleRolePanels.map(({ platform, roles, defaultRole }) => {
        const fieldName: RoleFormField = `${platform}Role`;
        const namespace = `Service.Bundle.ManageTrial.Roles.${platform}`;
        const isOptional = platform !== PlatformIdentifier.Xtmone;
        const title = t(`${namespace}.Title`, { count: 1 });
        const isMixed = mixedRoleDefaults?.[platform]?.isMixed ?? false;
        const untouchedRoleDefault =
          mixedRoleDefaults?.[platform]?.role ?? defaultRole;

        return (
          <FormField
            key={platform}
            control={control}
            name={fieldName}
            render={({ field, fieldState }) => {
              const isUntouchedAndMixed = isMixed && !fieldState.isTouched;
              const noAccessFallback = isOptional ? NO_ROLE_VALUE : undefined;
              let value: string | undefined;
              if (fieldState.isTouched) {
                value = field.value ?? noAccessFallback;
              } else if (isUntouchedAndMixed) {
                value = '';
              } else {
                value = untouchedRoleDefault ?? noAccessFallback;
              }
              return (
                <FormItem className="gap-m md:flex-1">
                  <FormLabel className="content-body-compact-medium text-text-default-secondary">
                    {title}
                  </FormLabel>
                  <FormControl>
                    <RoleSelect
                      value={value ?? ''}
                      onValueChange={(value) => {
                        field.onChange(
                          value === NO_ROLE_VALUE ? undefined : value
                        );
                        field.onBlur(); // mark field as touched (Radix doesn't fire blur on select)
                      }}
                      roles={roles}
                      namespace={namespace}
                      isOptional={isOptional}
                      placeholder={isUntouchedAndMixed ? title : undefined}
                      triggerClassName="layer-2 bg-input-default hover:bg-input-hover"
                    />
                  </FormControl>
                  {isUntouchedAndMixed && (
                    <p className="text-content-body-compact text-text-default-secondary">
                      {t(
                        'Service.Bundle.ManageTrial.EditUsersDialog.MixedRoles'
                      )}
                    </p>
                  )}
                </FormItem>
              );
            }}
          />
        );
      })}
    </div>
  );
};
