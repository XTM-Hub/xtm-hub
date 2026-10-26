'use client';

import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useMeOrganizations } from '@/hooks/use-me-organizations';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { APP_PATH } from '@/utils/path/constant';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import { useChangeSelectedOrganizationMutation } from '@graphql/generated';
import { useMemo } from 'react';

interface HeaderOrganizationSwitcherProps {
  fitContainer?: boolean;
}

const HeaderOrganizationSwitcher = ({
  fitContainer = false,
}: HeaderOrganizationSwitcherProps) => {
  const t = useTranslate();
  const { data } = useMeOrganizations();
  const me = data?.me;

  const { mutate: changeSelectedOrganization } =
    useChangeSelectedOrganizationMutation(portalGraphqlClient);

  const organizationOptions = useMemo(
    () =>
      (me?.organizations ?? []).map((organization) => ({
        value: organization.id,
        label: organization.personal_space
          ? t('OrganizationSwitcher.PersonalSpace')
          : organization.name,
      })),
    [me?.organizations, t]
  );

  if (!me) {
    return null;
  }

  const handleOnValueChange = (organizationId: string) => {
    if (!organizationId || organizationId === me.selected_organization_id) {
      return;
    }

    changeSelectedOrganization(
      { organization_id: organizationId },
      {
        onSuccess: () => {
          window.location.href = `/${APP_PATH}`;
        },
        onError: (error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : 'UnknownError';
          showSnackbar({
            severity: 'error',
            title: t('Utils.Error'),
            description: <>{t(`Error.Server.${errorMessage}`)}</>,
          });
        },
      }
    );
  };

  return (
    <div className="flex flex-row items-center gap-3 text-default-primary">
      <span className="content-base whitespace-nowrap">
        {t('OrganizationSwitcher.Workspace')}
      </span>
      <div className={fitContainer ? 'min-w-0 flex-1' : 'w-full sm:w-55'}>
        <Select
          value={me.selected_organization_id}
          onValueChange={handleOnValueChange}>
          <SelectTrigger
            aria-label={t('OrganizationSwitcher.SelectOrganization')}
            className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            align="start"
            className="layer-1">
            {organizationOptions.map((organization) => (
              <SelectItem
                key={organization.value}
                value={organization.value}>
                {organization.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default HeaderOrganizationSwitcher;
