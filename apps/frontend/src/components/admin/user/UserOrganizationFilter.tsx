import { useOrganizations } from '@/components/organization/Organization.service';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useKeepSelectedOptions } from '@/hooks/use-keep-selected-options';
import { useTranslate } from '@/hooks/use-translate';
import { type AnalyticsElementId } from '@/lib/analytics/analytics.ids';
import { useMemo, useState } from 'react';

interface OrganizationFilterOption {
  id: string;
  name: string;
  personal_space: boolean;
}

const getOrganizationId = ({ id }: OrganizationFilterOption) => id;

interface UserOrganizationFilterProps {
  value?: string;
  onChange: (organizationId: string | undefined) => void;
  // Each list that filters by organization tracks its own choices.
  analyticsId?: AnalyticsElementId;
}

export const UserOrganizationFilter = ({
  value,
  onChange,
  analyticsId = 'admin_user_organizations_open',
}: UserOrganizationFilterProps) => {
  const t = useTranslate();
  const [searchTerm, setSearchTerm] = useState('');
  const {
    organizations: searchedOrganizations,
    isLoading,
    isError,
    isPlaceholderData,
  } = useOrganizations({ searchTerm });

  const organizations = useMemo<OrganizationFilterOption[]>(
    () => [
      {
        id: '',
        name: t('UserActions.AllOrganizations'),
        personal_space: false,
      },
      ...searchedOrganizations.filter(({ personal_space }) => !personal_space),
    ],
    [searchedOrganizations, t]
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
    setSearchTerm('');
    onChange(organization?.id || undefined);
  };

  const label = t('UserActions.Organization');

  return (
    <AppCombobox<OrganizationFilterOption>
      analyticsId={analyticsId}
      label={label}
      labelPosition="none"
      placeholder={label}
      options={keptOrganizations}
      loading={isLoading || isPlaceholderData}
      error={
        isError ? t('OrganizationActions.LoadOrganizationsError') : undefined
      }
      value={selectedOrganization ?? null}
      onValueChange={(next) => handleOnValueChange(next ?? undefined)}
      onInputChange={(text, { cause }) => {
        if (cause === 'type') setSearchTerm(text);
      }}
      getOptionLabel={(organization) => organization.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
    />
  );
};
