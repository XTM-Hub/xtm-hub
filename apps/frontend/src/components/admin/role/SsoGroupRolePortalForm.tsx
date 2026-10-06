import RoleSheetFormFooter from '@/components/admin/role/RoleSheetFormFooter';
import { useTranslate } from '@/hooks/use-translate';
import { AutoForm } from '@filigran/ui';
import { useMemo } from 'react';
import { z } from 'zod';

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
      }}>
      {({ isDirty }) => <RoleSheetFormFooter isDirty={isDirty} />}
    </AutoForm>
  );
};

export default SsoGroupRolePortalForm;
