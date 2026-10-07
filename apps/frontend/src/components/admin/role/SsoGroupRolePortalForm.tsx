import RoleSheetFormFooter from '@/components/admin/role/RoleSheetFormFooter';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxControls,
  ComboboxField,
  ComboboxInput,
  ComboboxLabel,
  ComboboxTrigger,
} from '@filigran/design-system';
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
              <Combobox<RolePortalOption>
                options={rolePortalOptions}
                value={
                  rolePortalOptions.find(
                    (rolePortal) => rolePortal.name === field.value
                  ) ?? null
                }
                onValueChange={(rolePortal) =>
                  field.onChange(
                    (rolePortal as RolePortalOption | null)?.name ?? ''
                  )
                }
                getOptionLabel={(rolePortal) => rolePortal.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                loading={isLoading}
                clearable>
                <ComboboxLabel required>{t('RoleListPage.Role')}</ComboboxLabel>
                <ComboboxField>
                  <ComboboxInput
                    placeholder={t('RoleListPage.Role')}
                    onBlur={field.onBlur}
                  />
                  <ComboboxControls>
                    <ComboboxClear />
                    <ComboboxTrigger />
                  </ComboboxControls>
                </ComboboxField>
                <ComboboxContent
                  emptyMessage={t('Utils.NotFound')}
                  listAriaLabel={t('RoleListPage.Role')}
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

export default SsoGroupRolePortalForm;
