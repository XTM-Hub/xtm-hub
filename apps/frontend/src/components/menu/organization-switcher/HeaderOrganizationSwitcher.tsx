'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { APP_PATH } from '@/utils/path/constant';
import { ArrowDropDownIcon } from '@filigran/icon';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@filigran/ui';
import { OrganizationSwitcherMutation as OrganizationSwitcherMutationType } from '@generated/OrganizationSwitcherMutation.graphql';
import { useContext, useId, useMemo, useState } from 'react';
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

interface OrganizationOption {
  value: string;
  label: string;
}

interface HeaderOrganizationSwitcherProps {
  fitContainer?: boolean;
}

const HeaderOrganizationSwitcher = ({
  fitContainer = false,
}: HeaderOrganizationSwitcherProps) => {
  const { me } = useContext(PortalContext);
  const t = useTranslate();
  const [openPopover, setOpenPopover] = useState(false);
  const listboxId = useId();

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

  const selectedOrganization = useMemo(() => {
    return organizationOptions.find(
      ({ value }) => value === me.selected_organization_id
    );
  }, [organizationOptions, me.selected_organization_id]);

  const handleOnValueChange = (selectedValue?: OrganizationOption) => {
    if (!selectedValue || selectedValue.value === me.selected_organization_id) {
      setOpenPopover(false);
      return;
    }

    commitOrganizationSwitcherMutation({
      variables: {
        organization_id: selectedValue.value,
      },
      onCompleted: () => {
        window.location.href = `/${APP_PATH}`;
      },
    });

    setOpenPopover(false);
  };

  return (
    <div className="flex flex-row items-center gap-m text-text-default-primary">
      <span className="content-body-base whitespace-nowrap">
        {t('OrganizationSwitcher.Workspace')}
      </span>
      <Popover
        open={openPopover}
        onOpenChange={setOpenPopover}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            role="combobox"
            aria-label={t('OrganizationSwitcher.SelectOrganization')}
            aria-controls={listboxId}
            aria-expanded={openPopover}
            aria-haspopup="listbox"
            className={cn(
              'justify-between border-none bg-elevation-surface-highlight text-text-default-primary',
              fitContainer ? 'flex-1 min-w-0 py-2 pl-4 pr-2' : 'w-full sm:w-55'
            )}>
            <span className="truncate">{selectedOrganization?.label}</span>
            <ArrowDropDownIcon
              aria-hidden={true}
              focusable={false}
              className="ml-s h-5 w-5 shrink-0 text-text-default-primary"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) p-s"
          align="start">
          <ul
            id={listboxId}
            role="listbox"
            aria-label={t('OrganizationSwitcher.SelectOrganization')}
            className="flex flex-col gap-xs">
            {organizationOptions.map((organization) => {
              const isSelected =
                organization.value === me.selected_organization_id;

              return (
                <li key={organization.value}>
                  <Button
                    type="button"
                    variant="tertiary"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleOnValueChange(organization)}
                    className="w-full justify-start truncate normal-case text-text-default-primary">
                    {organization.label}
                  </Button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default HeaderOrganizationSwitcher;
