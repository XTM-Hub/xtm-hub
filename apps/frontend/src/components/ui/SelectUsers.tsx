import { useUserListLocalstorage } from '@/components/admin/user/user-list-localstorage';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useKeepSelectedOptions } from '@/hooks/use-keep-selected-options';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { UsersQueryVariables, useUsersQuery } from '@graphql/generated';
import { keepPreviousData } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

// As with the Relay refetch it replaces, a search loads fewer users than the
// first load, even once the search is cleared.
const INITIAL_USERS_COUNT = 50;
const SEARCHED_USERS_COUNT = 10;

interface UserOption {
  value: string;
  label: string;
}

const getUserId = ({ value }: UserOption) => value;

interface SelectUsersFormFieldProps {
  label: string;
  /** The user behind the initial value, labelled before any search returns it. */
  defaultUser?: UserOption;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

const SelectUsersFormField = ({
  label,
  defaultUser,
  value,
  onValueChange,
  disabled,
  error,
}: SelectUsersFormFieldProps) => {
  const t = useTranslate();

  const { orderMode, orderBy } = useUserListLocalstorage();
  const [search, setSearch] = useState({
    first: INITIAL_USERS_COUNT,
    searchTerm: '',
  });
  const variables = useMemo<UsersQueryVariables>(
    () => ({
      first: search.first,
      orderBy,
      orderMode,
      searchTerm: search.searchTerm,
      filters: null,
    }),
    [search, orderBy, orderMode]
  );
  const { data, isLoading, isPlaceholderData } = useUsersQuery(
    portalGraphqlClient,
    variables,
    {
      // A search keeps the previous data, so the field never goes back to empty.
      placeholderData: keepPreviousData,
      // Like Relay, a failed load reaches the error page; a failed background
      // refetch keeps the options shown.
      throwOnError: (_error, query) => query.state.data === undefined,
    }
  );

  const users = useMemo(
    () =>
      data?.users.edges.map(({ node }) => ({
        value: node.id,
        label: node.email,
      })) ?? [],
    [data]
  );

  const defaultUserId = defaultUser?.value;
  const defaultUserLabel = defaultUser?.label;
  const initialUsers = useMemo(
    () =>
      defaultUserId && defaultUserLabel
        ? [{ value: defaultUserId, label: defaultUserLabel }]
        : undefined,
    [defaultUserId, defaultUserLabel]
  );
  const keptUsers = useKeepSelectedOptions({
    options: users,
    value,
    getId: getUserId,
    initialOptions: initialUsers,
  });

  // The form can set its value after mount, so the selection follows `value`
  const selectedUser = useMemo<UserOption | null>(() => {
    if (!value) return null;
    return (
      keptUsers.find((user) => user.value === value) ?? { value, label: value }
    );
  }, [value, keptUsers]);

  const handleSearch = useDebounceCallback((searchTerm: string) => {
    setSearch({ first: SEARCHED_USERS_COUNT, searchTerm });
  }, DEBOUNCE_TIME);

  return (
    <AppCombobox<UserOption>
      formField
      label={label}
      placeholder={t('InviteUserServiceForm.Email')}
      error={error}
      options={keptUsers}
      value={selectedUser}
      onValueChange={(user) => onValueChange(user?.value ?? '')}
      onInputChange={(text, meta) => {
        if (meta.cause === 'type') handleSearch(text);
      }}
      getOptionLabel={(user) => user.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      filterOptions={(options) => options}
      loading={isLoading || isPlaceholderData}
      disabled={disabled}
    />
  );
};

export default SelectUsersFormField;
