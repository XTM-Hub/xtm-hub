import { useOrganizations } from '@/components/organization/Organization.service';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useTranslate } from '@/hooks/use-translate';
import { useState } from 'react';

export interface UserOrganizationFormProps {
  id: string;
  name: string;
  personal_space: boolean;
}
export interface OrganizationCapabilitiesProps {
  organization_id: string;
  capabilities: string[];
}
interface AutocompleteOrganizationProps {
  selectedOrganizationCapabilities: OrganizationCapabilitiesProps[];
  onValueChange: (value?: UserOrganizationFormProps) => void;
}
export const AutocompleteOrganization = ({
  selectedOrganizationCapabilities,
  onValueChange,
}: AutocompleteOrganizationProps) => {
  const t = useTranslate();
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { organizations, isLoading, isError, isPlaceholderData } =
    useOrganizations({ searchTerm });

  const isOrganizationAlreadySelected = (id: string) => {
    return selectedOrganizationCapabilities.find(
      ({ organization_id }) => organization_id === id
    );
  };
  const filteredOrganization = organizations.filter(
    ({ id }) => !isOrganizationAlreadySelected(id)
  );

  const handleOnValueChange = (
    value: UserOrganizationFormProps | undefined
  ) => {
    setSearchTerm('');
    return onValueChange(value);
  };

  // The panel closes on clicks inside the field too, so leaving the field is
  // what drops the typed search.
  const handleBlur = () => {
    if (!inputValue) return;
    setInputValue('');
    setSearchTerm('');
  };

  const label = t('UserForm.AddOrganization');

  return (
    <AppCombobox<UserOrganizationFormProps>
      className="w-[180px]"
      label={label}
      labelPosition="none"
      placeholder={label}
      onBlur={handleBlur}
      options={filteredOrganization}
      loading={isLoading || isPlaceholderData}
      error={
        isError ? t('OrganizationActions.LoadOrganizationsError') : undefined
      }
      value={null}
      onValueChange={(next) => handleOnValueChange(next ?? undefined)}
      inputValue={inputValue}
      onInputChange={(next, { cause }) => {
        // The field never holds a value: a pick or a reset empties it, so it
        // shows the placeholder instead of the picked name.
        if (cause !== 'type') {
          setInputValue('');
          return;
        }
        setInputValue(next);
        setSearchTerm(next);
      }}
      getOptionLabel={(organization) => organization.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
    />
  );
};
