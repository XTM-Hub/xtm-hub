import { PortalContext } from '@/components/me/AppPortalContext';
import SelectUsersFormField from '@/components/ui/SelectUsers';
import { useTranslate } from '@/hooks/use-translate';
import { useFormField } from '@filigran/ui';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useContext } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

interface ServiceFormUploaderIdFieldProps {
  field: ControllerRenderProps<FieldValues, string>;
  document?: documentItem_fragment$data;
  disabled?: boolean;
}

export const ServiceFormUploaderIdField = ({
  field,
  document,
  disabled,
}: ServiceFormUploaderIdFieldProps) => {
  const t = useTranslate();
  const { me } = useContext(PortalContext);
  const { error } = useFormField();

  return (
    <SelectUsersFormField
      label={t('Service.Form.Author')}
      defaultValue={document?.uploader?.email ?? me!.email}
      value={field.value}
      onValueChange={field.onChange}
      disabled={disabled}
      error={error?.message}
    />
  );
};
