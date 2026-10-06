import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/design-system';
import { AutoForm, SheetFooter } from '@filigran/ui';
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
  onClose,
}: {
  ssoGroupRolePortal?: SsoGroupRolePortalFormValues;
  handleSubmit: (values: SsoGroupRolePortalFormValues) => void;
  onClose: () => void;
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
      <SheetFooter className="pt-2">
        <div className="flex gap-s">
          <Button
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
