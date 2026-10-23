import { useFormField } from '@/components/ui/form';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  Select,
  SelectContent,
  SelectHelperText,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useMeOrganizationsQuery } from '@graphql/generated';
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
  const { data, isLoading } = useMeOrganizationsQuery(portalGraphqlClient);
  const me = data?.me;
  const { error } = useFormField();

  return (
    <div hidden={isCreation}>
      {/* The default value is only read on mount: remount once the organizations are loaded. */}
      <Select
        key={isLoading ? 'loading' : 'loaded'}
        disabled={disabled || isLoading}
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
        <SelectContent className="layer-1">
          {me?.organizations?.map((node) => {
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
