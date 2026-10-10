import { PortalContext } from '@/components/me/AppPortalContext';
import { useFormField } from '@/components/ui/form';
import SelectUsersFormField from '@/components/ui/SelectUsers';
import { useTranslate } from '@/hooks/use-translate';
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
      defaultUser={{
        value: document?.uploader?.id ?? me!.id,
        label: document?.uploader?.email ?? me!.email,
      }}
      value={field.value}
      onValueChange={field.onChange}
      disabled={disabled}
      error={error?.message}
    />
  );
};
