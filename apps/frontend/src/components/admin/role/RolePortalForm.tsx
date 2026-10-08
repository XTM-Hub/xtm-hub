import RoleSheetFormFooter from '@/components/admin/role/RoleSheetFormFooter';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/combobox-option-ids';
import {
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
import { AutoForm, FormItem, FormMessage } from '@filigran/ui';
import { PortalCapability } from '@graphql/generated';
import { useMemo } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { z } from 'zod';

const portalCapabilityValues = Object.values(PortalCapability) as [
  PortalCapability,
  ...PortalCapability[],
];

const portalCapabilityOptionIds = toComboboxOptionIds(
  portalCapabilityValues,
  (capability) => capability,
  (capability) => capability
);

const buildRolePortalFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: t('RoleListPage.Error.Role') }),
    capabilities: z.array(z.enum(portalCapabilityValues)).default([]),
  });

export type RolePortalFormValues = z.infer<
  ReturnType<typeof buildRolePortalFormSchema>
>;

const RolePortalForm = ({
  rolePortal,
  handleSubmit,
}: {
  rolePortal?: RolePortalFormValues;
  handleSubmit: (values: RolePortalFormValues) => void;
}) => {
  const t = useTranslate();
  const formSchema = useMemo(() => buildRolePortalFormSchema(t), [t]);

  return (
    <AutoForm
      formSchema={formSchema}
      values={rolePortal}
      onSubmit={(values) => handleSubmit(values)}
      fieldConfig={{
        name: {
          label: t('RoleListPage.Role'),
          inputProps: { placeholder: t('RoleListPage.Role') },
        },
        capabilities: {
          fieldType: ({
            field,
          }: {
            field: ControllerRenderProps<FieldValues, string>;
          }) => (
            <FormItem>
              <Combobox<string>
                multiple
                options={portalCapabilityOptionIds.ids}
                value={field.value ?? []}
                onValueChange={(next) => field.onChange(next as string[])}
                getOptionLabel={portalCapabilityOptionIds.getOptionLabel}>
                <ComboboxLabel>{t('RoleListPage.Capabilities')}</ComboboxLabel>
                <ComboboxField>
                  <ComboboxChips />
                  <ComboboxInput placeholder={t('RoleListPage.Capabilities')} />
                  <ComboboxControls>
                    <ComboboxClear />
                    <ComboboxTrigger />
                  </ComboboxControls>
                </ComboboxField>
                <ComboboxContent
                  emptyMessage={t('Utils.NotFound')}
                  listAriaLabel={t('RoleListPage.Capabilities')}
                />
              </Combobox>
              <FormMessage />
            </FormItem>
          ),
        },
      }}>
      {({ isDirty }) => <RoleSheetFormFooter isDirty={isDirty} />}
    </AutoForm>
  );
};

export default RolePortalForm;
