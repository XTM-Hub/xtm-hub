import RoleSheetFormFooter from '@/components/admin/role/RoleSheetFormFooter';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useFormField } from '@/components/ui/form';
import { useTranslate } from '@/hooks/use-translate';
import { toComboboxOptionIds } from '@/utils/design-system/combobox';
import { AutoForm } from '@filigran/ui';
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

const CapabilitiesField = ({
  field,
}: {
  field: ControllerRenderProps<FieldValues, string>;
}) => {
  const t = useTranslate();
  const { error } = useFormField();

  return (
    <AppCombobox
      multiple
      label={t('RoleListPage.Capabilities')}
      placeholder={t('RoleListPage.Capabilities')}
      error={error?.message}
      options={portalCapabilityOptionIds.ids}
      value={field.value ?? []}
      onValueChange={field.onChange}
      getOptionLabel={portalCapabilityOptionIds.getOptionLabel}
      contentClassName="layer-2"
    />
  );
};

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
          fieldType: CapabilitiesField,
        },
      }}>
      {({ isDirty }) => <RoleSheetFormFooter isDirty={isDirty} />}
    </AutoForm>
  );
};

export default RolePortalForm;
