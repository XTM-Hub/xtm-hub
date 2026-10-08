import { PortalContext } from '@/components/me/AppPortalContext';
import { useTranslate } from '@/hooks/use-translate';
import {
  Select,
  SelectContent,
  SelectHelperText,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import { useFormField } from '@filigran/ui';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useContext } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

interface ServiceFormUploaderOrganizationIdFieldProps {
  field: ControllerRenderProps<FieldValues, string>;
  isCreation: boolean;
  document?: documentItem_fragment$data;
  disabled?: boolean;
}

export const ServiceFormUploaderOrganizationIdField = ({
  field,
  isCreation,
  document,
  disabled,
}: ServiceFormUploaderOrganizationIdFieldProps) => {
  const t = useTranslate();
  const { me } = useContext(PortalContext);
  const { error } = useFormField();

  return (
    <div hidden={isCreation}>
      <Select
        disabled={disabled}
        onValueChange={field.onChange}
        defaultValue={
          (isCreation
            ? me?.selected_organization_id
            : document?.uploader_organization?.id) ?? ''
        }
        error={Boolean(error)}>
        <SelectLabel>
          {t('OrganizationInServiceAction.Organization')}
        </SelectLabel>
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={t('OrganizationInServiceAction.SelectOrganization')}
          />
        </SelectTrigger>
        <SelectContent>
          {me?.organizations.map((node) => {
            return (
              <SelectItem
                key={node?.id}
                value={node?.id}>
                {node?.name}
              </SelectItem>
            );
          })}
        </SelectContent>
        {error && <SelectHelperText>{error.message}</SelectHelperText>}
      </Select>
    </div>
  );
};
