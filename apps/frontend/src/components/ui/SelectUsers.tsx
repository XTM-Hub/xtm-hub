import { useUserListLocalstorage } from '@/components/admin/user/user-list-localstorage';
import { UserFragment } from '@/components/admin/user/UserList';
import { AppCombobox } from '@/components/ui/AppCombobox';
import { useTranslate } from '@/hooks/use-translate';
import { useUsersList } from '@/hooks/use-users-list';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { UserList_fragment$key } from '@generated/UserList_fragment.graphql';
import { useMemo, useState } from 'react';
import { readInlineData } from 'react-relay';
import { useDebounceCallback } from 'usehooks-ts';

interface UserOption {
  value: string;
  label: string;
}

interface SelectUsersFormFieldProps {
  label: string;
  defaultValue?: string;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

const SelectUsersFormField = ({
  label,
  defaultValue,
  value,
  onValueChange,
  disabled,
}: SelectUsersFormFieldProps) => {
  const t = useTranslate();
  // Keeps the email of a picked user that a later search drops from the options
  const [pickedUser, setPickedUser] = useState<UserOption | null>(null);

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

  // The form can set its value after mount, so the selection follows `value`
  const selectedUser = useMemo<UserOption | null>(() => {
    if (!value) return null;
    const label =
      (pickedUser?.value === value ? pickedUser.label : undefined) ??
      users.find((user) => user.value === value)?.label ??
      defaultValue ??
      value;
    return { value, label };
  }, [value, pickedUser, users, defaultValue]);

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
      options={users}
      value={selectedUser}
      onValueChange={(user) => {
        setPickedUser(user);
        onValueChange(user?.value ?? '');
      }}
      onInputChange={(text, meta) => {
        if (meta.cause === 'type') handleSearch(text);
      }}
      getOptionLabel={(user) => user.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      filterOptions={(options) => options}
      disabled={disabled}
    />
  );
};

export default SelectUsersFormField;
