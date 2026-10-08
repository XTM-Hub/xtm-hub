'use client';

import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/combobox-option-ids';
import {
  Button,
  Combobox,
  ComboboxChips,
  ComboboxClear,
  ComboboxContent,
  ComboboxControls,
  ComboboxField,
  ComboboxInput,
  ComboboxLabel,
  ComboboxTrigger,
} from '@filigran/design-system';
import { Form, FormField, FormItem, FormMessage } from '@filigran/ui';
import { PlatformIdentifier } from '@graphql/generated';
import { ReactNode, useMemo } from 'react';
import { UseFormReturn, useFormState, useWatch } from 'react-hook-form';
import {
  RoleFormField,
  RolePanelConfig,
  TrialUserOption,
  TrialUserRolesFormValues,
} from './manage-trial.const';
import { MixedRoleDefault } from './manage-trial.utils';
import { ManageTrialRoleDescriptions } from './ManageTrialRoleDescriptions';
import { TrialUserRolePanelFields } from './TrialUserRolePanelFields';

interface TrialUserFormSkeletonProps {
  form: UseFormReturn<TrialUserRolesFormValues>;
  onSubmit: (values: TrialUserRolesFormValues) => void;
  usersOptions: TrialUserOption[];
  // When set, the options are searched on the server from the typed text
  onUsersInputChange?: (value: string) => void;
  onUsersChange?: (values: string[]) => void;
  pickerLabel?: string;
  pickerPlaceholder: string;
  pickerNotice?: ReactNode;
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
  onUsersInputChange,
  onUsersChange,
  pickerLabel,
  pickerPlaceholder,
  pickerNotice,
  products,
  bundleRolePanels,
  mixedRoleDefaults,
  onCancel,
  isPending,
}: TrialUserFormSkeletonProps) => {
  const t = useTranslate();
  const userIds = useWatch({ control: form.control, name: 'userIds' });
  const formState = useFormState({ control: form.control });
  const usersOptionIds = useMemo(
    () =>
      toComboboxOptionIds(
        usersOptions,
        (option) => option.value,
        (option) => option.label
      ),
    [usersOptions]
  );

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
              <div className="layer-2">
                <Combobox<string>
                  multiple
                  labelPosition={pickerLabel ? 'top' : 'none'}
                  options={usersOptionIds.ids}
                  value={field.value ?? []}
                  onValueChange={(next) => {
                    const values = next as string[];
                    field.onChange(values);
                    onUsersChange?.(values);
                  }}
                  onInputChange={
                    onUsersInputChange
                      ? (text, meta) => {
                          if (meta.cause !== 'select') onUsersInputChange(text);
                        }
                      : undefined
                  }
                  filterOptions={
                    onUsersInputChange ? (options) => options : undefined
                  }
                  getOptionLabel={usersOptionIds.getOptionLabel}>
                  {pickerLabel && <ComboboxLabel>{pickerLabel}</ComboboxLabel>}
                  <ComboboxField>
                    <ComboboxChips />
                    <ComboboxInput
                      aria-label={pickerLabel ? undefined : pickerPlaceholder}
                      placeholder={pickerPlaceholder}
                    />
                    <ComboboxControls>
                      <ComboboxClear />
                      <ComboboxTrigger />
                    </ComboboxControls>
                  </ComboboxField>
                  <ComboboxContent
                    className="layer-2"
                    emptyMessage={t('Utils.NotFound')}
                    listAriaLabel={pickerLabel || pickerPlaceholder}
                  />
                </Combobox>
              </div>
              <FormMessage />
              {pickerNotice}
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
            priority="secondary"
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
