import RoleSheetFormFooter from '@/components/admin/role/RoleSheetFormFooter';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { AutoForm, FormItem, FormMessage } from '@filigran/ui';
import { RolePortalsQuery, useRolePortalsQuery } from '@graphql/generated';
import { useMemo } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { z } from 'zod';

type RolePortalOption = RolePortalsQuery['rolePortals'][number];

const ROLE_PORTALS_STALE_TIME = 5 * 60_000;

const buildSsoGroupRolePortalFormSchema = (t: (key: string) => string) =>
  z.object({
    ssoGroup: z
      .string()
      .trim()
      .min(1, { error: t('RoleListPage.Error.SsoGroup') }),
    rolePortal: z
      .string({ error: t('RoleListPage.Error.Role') })
      .trim()
      .min(1, { error: t('RoleListPage.Error.Role') }),
  });

export type SsoGroupRolePortalFormValues = z.infer<
  ReturnType<typeof buildSsoGroupRolePortalFormSchema>
>;

const SsoGroupRolePortalForm = ({
  ssoGroupRolePortal,
  handleSubmit,
}: {
  ssoGroupRolePortal?: SsoGroupRolePortalFormValues;
  handleSubmit: (values: SsoGroupRolePortalFormValues) => void;
}) => {
  const t = useTranslate();
  const formSchema = useMemo(() => buildSsoGroupRolePortalFormSchema(t), [t]);
  const { data, isLoading } = useRolePortalsQuery(
    portalGraphqlClient,
    undefined,
    { staleTime: ROLE_PORTALS_STALE_TIME }
  );
  const rolePortalOptions = data?.rolePortals ?? [];

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
          fieldType: ({
            field,
          }: {
            field: ControllerRenderProps<FieldValues, string>;
          }) => (
            <FormItem>
              <AppCombobox<RolePortalOption>
                label={t('RoleListPage.Role')}
                required
                placeholder={t('RoleListPage.Role')}
                onBlur={field.onBlur}
                options={rolePortalOptions}
                value={
                  rolePortalOptions.find(
                    (rolePortal) => rolePortal.name === field.value
                  ) ?? null
                }
                onValueChange={(rolePortal) =>
                  field.onChange(rolePortal?.name ?? '')
                }
                getOptionLabel={(rolePortal) => rolePortal.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                loading={isLoading}
                clearable
              />
              <FormMessage />
            </FormItem>
          ),
        },
      }}>
      {({ isDirty }) => <RoleSheetFormFooter isDirty={isDirty} />}
    </AutoForm>
  );
};

export default SsoGroupRolePortalForm;
