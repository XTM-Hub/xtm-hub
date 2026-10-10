import { useKeepSelectedOptions } from '@/hooks/use-keep-selected-options';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { DEBOUNCE_TIME } from '@/utils/constant';
import {
  FilterKey,
  OrderingMode,
  useMeOrganizationDomainsQuery,
  UserAccountStatus,
  UserOrdering,
  UsersQuery,
  UsersQueryVariables,
  useUsersQuery,
} from '@graphql/generated';
import { meOrganizationDomainsKeys } from '@graphql/me/me.keys';
import { usersKeys } from '@graphql/user/users.keys';
import { keepPreviousData } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';
import { toNewEmailEntry, TrialUserOption } from './manage-trial.const';
import { canInviteEmail, getUserStatusLabel } from './manage-trial.utils';

type OrganizationUser = UsersQuery['users']['edges'][number]['node'];

interface UseTrialUserOptionsParams {
  organizationId?: string | null;
  bundleUsers: { id: string; email: string }[];
  isTrialInviteEnabled: boolean;
  canInviteUsers: boolean;
  canInviteOutsideOrganizationDomains: boolean;
}

const USERS_PAGE_SIZE = 50;

const getTrialUserOptionValue = ({ value }: TrialUserOption) => value;

export const useTrialUserOptions = ({
  organizationId,
  bundleUsers,
  isTrialInviteEnabled,
  canInviteUsers,
  canInviteOutsideOrganizationDomains,
}: UseTrialUserOptionsParams) => {
  const t = useTranslate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  const handleInputChange = useDebounceCallback((value: string) => {
    setSearchTerm(value.trim());
  }, DEBOUNCE_TIME);

  const usersVariables: UsersQueryVariables = {
    first: USERS_PAGE_SIZE,
    orderBy: UserOrdering.Email,
    orderMode: OrderingMode.Asc,
    filters: organizationId
      ? [{ key: FilterKey.OrganizationId, value: [organizationId] }]
      : [],
    searchTerm: isTrialInviteEnabled && searchTerm ? searchTerm : null,
  };
  const {
    data: usersData,
    isSuccess,
    isPlaceholderData,
  } = useUsersQuery(portalGraphqlClient, usersVariables, {
    queryKey: usersKeys.list(usersVariables),
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
  });

  const isInviteRestrictedToDomains =
    isTrialInviteEnabled &&
    canInviteUsers &&
    !canInviteOutsideOrganizationDomains;
  const { data: domainsData, isSuccess: areDomainsLoaded } =
    useMeOrganizationDomainsQuery(portalGraphqlClient, undefined, {
      queryKey: meOrganizationDomainsKeys.detail(),
      enabled: isInviteRestrictedToDomains,
    });
  const allowedDomains = useMemo(
    () =>
      isInviteRestrictedToDomains
        ? (domainsData?.me?.organizations?.find(
            ({ id }) => id === organizationId
          )?.domains ?? [])
        : null,
    [isInviteRestrictedToDomains, domainsData, organizationId]
  );

  const organizationUsers = useMemo(
    () => (usersData?.users.edges ?? []).map(({ node }) => node),
    [usersData]
  );

  const userOptions = useMemo(() => {
    const bundleUserIds = new Set(bundleUsers.map(({ id }) => id));
    const formatLabel = ({ email, status }: OrganizationUser) => {
      const statusLabel = isTrialInviteEnabled
        ? getUserStatusLabel(status)
        : null;
      return statusLabel
        ? `${email} (${t(`Service.Bundle.ManageTrial.AddUserDialog.Status.${statusLabel}`)})`
        : email;
    };

    return organizationUsers
      .filter(({ id }) => !bundleUserIds.has(id))
      .map((user) => ({
        label: formatLabel(user),
        value: user.id,
        status: user.status,
      }));
  }, [organizationUsers, bundleUsers, isTrialInviteEnabled, t]);

  // Only offered once the server search for this exact term has resolved,
  // so an existing organization member is never mistaken for a new email
  const inviteOption = useMemo(() => {
    if (
      !isTrialInviteEnabled ||
      !canInviteUsers ||
      !searchTerm ||
      !isSuccess ||
      isPlaceholderData ||
      (isInviteRestrictedToDomains && !areDomainsLoaded)
    ) {
      return null;
    }
    const knownEmails = [
      ...organizationUsers.map(({ email }) => email),
      ...bundleUsers.map(({ email }) => email),
    ];
    if (!canInviteEmail({ email: searchTerm, knownEmails, allowedDomains })) {
      return null;
    }
    return {
      label: t('Service.Bundle.ManageTrial.AddUserDialog.InviteEmail', {
        email: searchTerm,
      }),
      value: toNewEmailEntry(searchTerm),
    };
  }, [
    isTrialInviteEnabled,
    canInviteUsers,
    searchTerm,
    isSuccess,
    isPlaceholderData,
    isInviteRestrictedToDomains,
    areDomainsLoaded,
    allowedDomains,
    organizationUsers,
    bundleUsers,
    t,
  ]);

  const searchOptions = useMemo<TrialUserOption[]>(
    () => (inviteOption ? [inviteOption, ...userOptions] : userOptions),
    [inviteOption, userOptions]
  );
  const usersOptions = useKeepSelectedOptions({
    options: searchOptions,
    value: selectedValues,
    getId: getTrialUserOptionValue,
  });

  const hasSelectedExpiredUsers = useMemo(() => {
    const selectedValueSet = new Set(selectedValues);
    return usersOptions.some(
      ({ value, status }) =>
        selectedValueSet.has(value) && status === UserAccountStatus.Expired
    );
  }, [usersOptions, selectedValues]);

  return {
    usersOptions,
    onUsersInputChange: isTrialInviteEnabled ? handleInputChange : undefined,
    onUsersChange: setSelectedValues,
    hasSelectedExpiredUsers: isTrialInviteEnabled && hasSelectedExpiredUsers,
  };
};
