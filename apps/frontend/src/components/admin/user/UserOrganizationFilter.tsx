import { getOrganizations } from '@/components/organization/Organization.service';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useTranslate } from '@/hooks/use-translate';
import { useState } from 'react';

interface OrganizationFilterOption {
  id: string;
  name: string;
  personal_space: boolean;
}

interface UserOrganizationFilterProps {
  value?: string;
  onChange: (organizationId: string | undefined) => void;
}

export const UserOrganizationFilter = ({
  value,
  onChange,
}: UserOrganizationFilterProps) => {
  const t = useTranslate();
  const { organizationsData, refetch } = getOrganizations();

  const ALL_ORGANIZATIONS: OrganizationFilterOption = {
    id: '',
    name: t('UserActions.AllOrganizations'),
    personal_space: false,
  };

  const organizations: OrganizationFilterOption[] = [
    ALL_ORGANIZATIONS,
    ...organizationsData.organizations.edges
      .map(({ node }) => node)
      .filter(({ personal_space }) => !personal_space),
  ];

  const fetchedSelection = organizations.find(
    ({ id }) => id !== '' && id === value
  );
  // A search can return a list without the selected organization; dropping it
  // then would wipe the text being typed and the clear control with it.
  const [lastSelection, setLastSelection] = useState(fetchedSelection);
  if (
    fetchedSelection &&
    (fetchedSelection.id !== lastSelection?.id ||
      fetchedSelection.name !== lastSelection.name)
  ) {
    setLastSelection(fetchedSelection);
  }
  const selectedOrganization =
    fetchedSelection ??
    (lastSelection?.id === value ? lastSelection : undefined);

  const handleOnValueChange = (
    organization: OrganizationFilterOption | undefined
  ) => {
    refetch({ searchTerm: '' });
    onChange(organization?.id || undefined);
  };

  const label = t('UserActions.Organization');

  return (
    <AppCombobox<OrganizationFilterOption>
      className="w-[200px]"
      label={label}
      labelPosition="none"
      placeholder={label}
      options={organizations}
      value={selectedOrganization ?? null}
      onValueChange={(next) => handleOnValueChange(next ?? undefined)}
      onInputChange={(searchTerm, { cause }) => {
        if (cause === 'type') refetch({ searchTerm });
      }}
      getOptionLabel={(organization) => organization.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
    />
  );
};
