import {
  AutoForm,
  Button,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  MultiSelectFormField,
  SheetFooter,
} from '@filigran/ui';
import { PortalCapability } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { z } from 'zod';

const portalCapabilityValues = Object.values(PortalCapability) as [
  PortalCapability,
  ...PortalCapability[],
];

const portalCapabilityOptions = portalCapabilityValues.map((capability) => ({
  id: capability,
  label: capability,
}));

const buildSsoGroupRolePortalFormSchema = (t: (key: string) => string) =>
  z.object({
    ssoGroup: z
      .string()
      .trim()
      .min(1, { error: t('RoleListPage.Error.SsoGroup') }),
    rolePortal: z
      .string()
      .trim()
      .min(1, { error: t('RoleListPage.Error.Role') }),
    capabilities: z.array(z.enum(portalCapabilityValues)).default([]),
  });

export type SsoGroupRolePortalFormValues = z.infer<
  ReturnType<typeof buildSsoGroupRolePortalFormSchema>
>;

const SsoGroupRolePortalForm = ({
  ssoGroupRolePortal,
  handleSubmit,
  onClose,
}: {
  ssoGroupRolePortal?: SsoGroupRolePortalFormValues;
  handleSubmit: (values: SsoGroupRolePortalFormValues) => void;
  onClose: () => void;
}) => {
  const t = useTranslations();
  const formSchema = useMemo(() => buildSsoGroupRolePortalFormSchema(t), [t]);

  return (
    <AutoForm
      formSchema={formSchema}
      values={ssoGroupRolePortal}
      onSubmit={(values) => handleSubmit(values)}
      fieldConfig={{
        ssoGroup: {
          label: t('RoleListPage.SsoGroup'),
          inputProps: { placeholder: t('RoleListPage.SsoGroup') },
        },
        rolePortal: {
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
              <FormLabel>{t('RoleListPage.Capabilities')}</FormLabel>
              <FormControl>
                <MultiSelectFormField
                  options={portalCapabilityOptions}
                  popoverContentClassName="bg-elevation-background-layer-3"
                  keyValue="id"
                  keyLabel="label"
                  defaultValue={field.value ?? []}
                  onValueChange={field.onChange}
                  noResultString={t('Utils.NotFound')}
                  placeholder={t('RoleListPage.Capabilities')}
                  variant="inverted"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          ),
        },
      }}>
      <SheetFooter className="pt-2">
        <div className="flex gap-s">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}>
            {t('Utils.Cancel')}
          </Button>
          <Button type="submit">{t('Utils.Validate')}</Button>
        </div>
      </SheetFooter>
    </AutoForm>
  );
};

export default SsoGroupRolePortalForm;
