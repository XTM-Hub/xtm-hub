import { getOrganizations } from '@/components/organization/Organization.service';
import { useTranslate } from '@/hooks/use-translate';
import { Combobox } from '@filigran/ui/clients';

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

  const isOrganizationAlreadySelected = (id: string) => {
    return selectedOrganizationCapabilities.find(
      ({ organization_id }) => organization_id === id
    );
  };
  const filteredOrganization = organizationsData.organizations.edges
    .map(({ node }) => node)
    .filter(({ id }) => !isOrganizationAlreadySelected(id));
  const onAutocompleteOrganization = (value: string) => {
    refetch({ searchTerm: value });
  };

  const handleOnValueChange = (
    value: UserOrganizationFormProps | undefined
  ) => {
    refetch({ searchTerm: '' });
    return onValueChange(value);
  };

  return (
    <Combobox
      className="w-[180px]"
      dataTab={filteredOrganization}
      order={t('UserForm.AddOrganization')}
      placeholder={t('UserForm.AddOrganization')}
      emptyCommand={t('Utils.NotFound')}
      onValueChange={handleOnValueChange}
      keyValue={'name'}
      keyLabel={'name'}
      onInputChange={onAutocompleteOrganization}
    />
  );
};
