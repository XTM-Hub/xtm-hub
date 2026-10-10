'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import { useTranslate } from '@/hooks/use-translate';
import { APP_PATH } from '@/utils/path/constant';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import { OrganizationSwitcherMutation as OrganizationSwitcherMutationType } from '@generated/OrganizationSwitcherMutation.graphql';
import { useContext, useMemo } from 'react';
import { graphql, useMutation } from 'react-relay';

export const organizationSwitcherMutation = graphql`
  mutation OrganizationSwitcherMutation($organization_id: OrganizationId!) {
    changeSelectedOrganization(organization_id: $organization_id) {
      id
      selected_organization_id
      selected_org_capabilities
    }
  }
`;

interface HeaderOrganizationSwitcherProps {
  fitContainer?: boolean;
}

const HeaderOrganizationSwitcher = ({
  fitContainer = false,
}: HeaderOrganizationSwitcherProps) => {
  const { me } = useContext(PortalContext);
  const t = useTranslate();

  const [commitOrganizationSwitcherMutation] =
    useMutation<OrganizationSwitcherMutationType>(organizationSwitcherMutation);

  if (!me) {
    return null;
  }

  const parsedOrganizations = useMemo(() => {
    return me.organizations.map((org) => ({
      ...org,
      name: org.personal_space
        ? t('OrganizationSwitcher.PersonalSpace')
        : org.name,
    }));
  }, [me.organizations, t]);

  const organizationOptions = useMemo(() => {
    return parsedOrganizations.map((organization) => ({
      value: organization.id,
      label: organization.name,
    }));
  }, [parsedOrganizations]);

  const handleOnValueChange = (organizationId: string) => {
    if (!organizationId || organizationId === me.selected_organization_id) {
      return;
    }

    commitOrganizationSwitcherMutation({
      variables: {
        organization_id: organizationId,
      },
      onCompleted: () => {
        window.location.href = `/${APP_PATH}`;
      },
    });
  };

  return (
    <div className="flex flex-row items-center gap-m text-text-default-primary">
      <span className="content-body-base whitespace-nowrap">
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
          <SelectContent align="start">
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
