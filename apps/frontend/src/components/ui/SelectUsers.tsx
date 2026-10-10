import { useUserListLocalstorage } from '@/components/admin/user/user-list-localstorage';
import { UserFragment } from '@/components/admin/user/UserList';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useKeepSelectedOptions } from '@/hooks/use-keep-selected-options';
import { useTranslate } from '@/hooks/use-translate';
import { useUsersList } from '@/hooks/use-users-list';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { UserList_fragment$key } from '@generated/UserList_fragment.graphql';
import { useMemo } from 'react';
import { readInlineData } from 'react-relay';
import { useDebounceCallback } from 'usehooks-ts';

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
  const { data, refetch } = useUsersList({
    orderBy,
    orderMode,
    pageSize: 50,
    filter: {
      search: '',
    },
  });

  const users = useMemo(
    () =>
      data?.users?.edges?.map((edge) => {
        const user = readInlineData<UserList_fragment$key>(
          UserFragment,
          edge.node
        );
        return {
          value: user.id,
          label: user.email,
        };
      }) || [],
    [data?.users?.edges]
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
    refetch({
      count: 10,
      orderMode,
      orderBy,
      searchTerm,
    });
  }, DEBOUNCE_TIME);

  return (
    <AppCombobox<UserOption>
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
      disabled={disabled}
      contentClassName="layer-2"
    />
  );
};

export default SelectUsersFormField;
