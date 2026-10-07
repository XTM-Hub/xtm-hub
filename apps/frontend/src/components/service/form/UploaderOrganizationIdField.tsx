import { PortalContext } from '@/components/me/AppPortalContext';
import { useTranslate } from '@/hooks/use-translate';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import { FormControl, FormItem, FormMessage } from '@filigran/ui';
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
  return (
    <FormItem hidden={isCreation}>
      <div>
        <Select
          disabled={disabled}
          onValueChange={field.onChange}
          defaultValue={
            (isCreation
              ? me?.selected_organization_id
              : document?.uploader_organization?.id) ?? ''
          }>
          <SelectLabel>
            {t('OrganizationInServiceAction.Organization')}
          </SelectLabel>
          <FormControl>
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={t(
                  'OrganizationInServiceAction.SelectOrganization'
                )}
              />
            </SelectTrigger>
          </FormControl>
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
        </Select>
      </div>
      <FormMessage />
    </FormItem>
  );
};
