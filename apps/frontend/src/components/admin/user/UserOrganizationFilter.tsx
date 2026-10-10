import { getOrganizations } from '@/components/organization/Organization.service';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useKeepSelectedOptions } from '@/hooks/use-keep-selected-options';
import { useTranslate } from '@/hooks/use-translate';
import { useMemo } from 'react';

interface OrganizationFilterOption {
  id: string;
  name: string;
  personal_space: boolean;
}

const getOrganizationId = ({ id }: OrganizationFilterOption) => id;

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

  const organizations = useMemo<OrganizationFilterOption[]>(
    () => [
      {
        id: '',
        name: t('UserActions.AllOrganizations'),
        personal_space: false,
      },
      ...organizationsData.organizations.edges
        .map(({ node }) => node)
        .filter(({ personal_space }) => !personal_space),
    ],
    [organizationsData, t]
  );
  const keptOrganizations = useKeepSelectedOptions({
    options: organizations,
    value,
    getId: getOrganizationId,
  });
  const selectedOrganization = value
    ? keptOrganizations.find(({ id }) => id === value)
    : undefined;

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
      options={keptOrganizations}
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
