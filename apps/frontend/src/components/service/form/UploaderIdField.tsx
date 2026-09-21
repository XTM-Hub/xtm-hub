import { PortalContext } from '@/components/me/AppPortalContext';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { FormControl, FormItem, FormLabel } from '@filigran/ui';
import { Combobox } from '@filigran/ui/clients';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { OrderingMode, UserOrdering, useUsersQuery } from '@graphql/generated';
import { usersKeys } from '@graphql/user/users.keys';
import { keepPreviousData } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { useDebounceCallback } from 'usehooks-ts';

interface ServiceFormUploaderIdFieldProps {
  field: ControllerRenderProps<FieldValues, string>;
  document?: documentItem_fragment$data;
  disabled?: boolean;
}

const USERS_PAGE_SIZE = 50;

export const ServiceFormUploaderIdField = ({
  field,
  document,
  disabled,
}: ServiceFormUploaderIdFieldProps) => {
  const t = useTranslations();
  const { me } = useContext(PortalContext);
  const [selectedUser, setSelectedUser] = useState<
    { id: string; email: string } | undefined
  >(() =>
    document?.uploader
      ? { id: document.uploader.id, email: document.uploader.email }
      : me
        ? { id: me.id, email: me.email }
        : undefined
  );
  const [searchTerm, setSearchTerm] = useState('');

  const debouncedSetSearchTerm = useDebounceCallback(
    setSearchTerm,
    DEBOUNCE_TIME
  );

  const usersVariables = {
    first: USERS_PAGE_SIZE,
    orderBy: UserOrdering.Email,
    orderMode: OrderingMode.Asc,
    filters: null,
    searchTerm: searchTerm || null,
  };
  const { data } = useUsersQuery(portalGraphqlClient, usersVariables, {
    queryKey: usersKeys.list(usersVariables),
    placeholderData: keepPreviousData,
  });

  const options = (data?.users.edges ?? []).map(({ node }) => ({
    id: node.id,
    email: node.email,
  }));

  return (
    <FormItem>
      <FormLabel>{t('Service.Form.Author')}</FormLabel>
      <FormControl>
        <Combobox
          dataTab={options}
          order={t('InviteUserServiceForm.Email')}
          placeholder={t('UserActions.SearchUser')}
          emptyCommand={t('Utils.NotFound')}
          value={selectedUser}
          keyValue="id"
          keyLabel="email"
          shouldFilter={false}
          disabled={disabled}
          onInputChange={debouncedSetSearchTerm}
          onValueChange={(user) => {
            setSelectedUser(user);
            field.onChange(user?.id ?? '');
          }}
        />
      </FormControl>
    </FormItem>
  );
};
