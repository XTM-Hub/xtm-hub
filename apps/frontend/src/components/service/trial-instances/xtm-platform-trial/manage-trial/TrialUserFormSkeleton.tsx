'use client';

import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@filigran/ui';
import { FormLabel, MultiSelectFormField } from '@filigran/ui/clients';
import { PlatformIdentifier } from '@graphql/generated';
import { UseFormReturn, useFormState, useWatch } from 'react-hook-form';
import {
  RoleFormField,
  RolePanelConfig,
  TrialUserRolesFormValues,
} from './manage-trial.const';
import { MixedRoleDefault } from './manage-trial.utils';
import { ManageTrialRoleDescriptions } from './ManageTrialRoleDescriptions';
import { TrialUserRolePanelFields } from './TrialUserRolePanelFields';

interface UserOption {
  label: string;
  value: string;
}

interface TrialUserFormSkeletonProps {
  form: UseFormReturn<TrialUserRolesFormValues>;
  onSubmit: (values: TrialUserRolesFormValues) => void;
  usersOptions: UserOption[];
  pickerLabel?: string;
  pickerPlaceholder: string;
  products: PlatformIdentifier[];
  bundleRolePanels: RolePanelConfig[];
  mixedRoleDefaults?: Partial<Record<PlatformIdentifier, MixedRoleDefault>>;
  onCancel: () => void;
  isPending: boolean;
}

export const TrialUserFormSkeleton = ({
  form,
  onSubmit,
  usersOptions,
  pickerLabel,
  pickerPlaceholder,
  products,
  bundleRolePanels,
  mixedRoleDefaults,
  onCancel,
  isPending,
}: TrialUserFormSkeletonProps) => {
  const t = useTranslate();
  const userIds = useWatch({ control: form.control, name: 'userIds' });
  const formState = useFormState({ control: form.control });

  const hasUnresolvedMixedRole = bundleRolePanels.some(({ platform }) => {
    if (!mixedRoleDefaults?.[platform]?.isMixed) return false;
    const fieldName: RoleFormField = `${platform}Role`;
    return !form.getFieldState(fieldName, formState).isTouched;
  });

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-l"
        onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="userIds"
          render={({ field }) => (
            <FormItem>
              {pickerLabel && (
                <FormLabel className="content-body-compact-medium text-text-default-secondary">
                  {pickerLabel}
                </FormLabel>
              )}
              <FormControl>
                <div className="layer-2">
                  <MultiSelectFormField
                    options={usersOptions}
                    defaultValue={field.value}
                    value={field.value}
                    onValueChange={field.onChange}
                    noResultString={t('Utils.NotFound')}
                    placeholder={pickerPlaceholder}
                    variant="inverted"
                    placeholderClassName="content-body-base"
                    className={'bg-input-default hover:bg-input-hover'}
                    popoverContentClassName="layer-2 bg-input-default hover:bg-input-hover content-body-compact
                    [&_[cmdk-item]]:content-body-compact   [&_[cmdk-input]]:content-body-compact
    [&_[cmdk-input]]:placeholder:content-body-compact  "
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <ManageTrialRoleDescriptions
          stacked
          products={products}
        />

        <TrialUserRolePanelFields
          control={form.control}
          bundleRolePanels={bundleRolePanels}
          mixedRoleDefaults={mixedRoleDefaults}
        />

        <div className="flex justify-end gap-s">
          <Button
            variant="secondary"
            type="button"
            onClick={onCancel}>
            {t('Utils.Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={
              userIds.length === 0 || isPending || hasUnresolvedMixedRole
            }>
            {t('Utils.Confirm')}
          </Button>
        </div>
      </form>
    </Form>
  );
};
