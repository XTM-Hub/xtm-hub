import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  OrganizationCapability,
  useConnectProductOrganizationAdminsQuery,
} from '@graphql/generated';

const MAX_DISPLAYED_ADMINISTRATORS = 5;

interface TrialOrganizationAdminContactsProps {
  organizationId: string;
}

export const TrialOrganizationAdminContacts = ({
  organizationId,
}: TrialOrganizationAdminContactsProps) => {
  const t = useTranslate();

  const { data } = useConnectProductOrganizationAdminsQuery(
    portalGraphqlClient,
    {
      input: {
        organizationId,
        capabilities: [
          OrganizationCapability.AdministrateOrganization,
          OrganizationCapability.ManagePlatformRegistration,
        ],
      },
    },
    {
      enabled: organizationId.length > 0,
    }
  );

  const administrators = (
    data?.usersWithCapabilitiesInOrganization ?? []
  ).slice(0, MAX_DISPLAYED_ADMINISTRATORS);

  if (administrators.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="content-body-base">
        {t('Service.Trials.XtmPlatform.Page.NotAdmin.AdminListTitle', {
          count: administrators.length,
        })}
        :
      </div>
      {administrators.map((administrator) => (
        <div
          className="content-body-base"
          key={administrator.id}>
          {administrator.email}
        </div>
      ))}
    </div>
  );
};
