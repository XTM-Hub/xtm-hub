import { getOrganizations } from '@/components/organization/Organization.service';
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
  const { organizationsData, refetch } = getOrganizations();
  const [inputValue, setInputValue] = useState('');

  const isOrganizationAlreadySelected = (id: string) => {
    return selectedOrganizationCapabilities.find(
      ({ organization_id }) => organization_id === id
    );
  };
  const filteredOrganization = organizationsData.organizations.edges
    .map(({ node }) => node)
    .filter(({ id }) => !isOrganizationAlreadySelected(id));

  const handleOnValueChange = (
    value: UserOrganizationFormProps | undefined
  ) => {
    refetch({ searchTerm: '' });
    return onValueChange(value);
  };

  // The panel closes on clicks inside the field too, so leaving the field is
  // what drops the typed search.
  const handleBlur = () => {
    if (!inputValue) return;
    setInputValue('');
    refetch({ searchTerm: '' });
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
        refetch({ searchTerm: next });
      }}
      getOptionLabel={(organization) => organization.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      contentClassName="layer-2"
    />
  );
};
