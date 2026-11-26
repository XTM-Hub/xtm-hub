import Loader from '@/components/Loader';
import { RegistrationContext } from '@/components/registration/Context';
import { RegistrationLayout } from '@/components/registration/Layout';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  OrganizationCapability,
  useUsersWithCapabilitiesInOrganizationQuery,
} from '@graphql/generated';
import { useContext } from 'react';

interface UnregisterMissingCapabilityProps {
  cancel: () => void;
  organizationId: string;
}

export const UnregisterMissingCapability = ({
  cancel,
  organizationId,
}: UnregisterMissingCapabilityProps) => {
  const { capability, displayedIdentifier } = useContext(RegistrationContext);
  const t = useTranslate();
  const capabilities = [OrganizationCapability.AdministrateOrganization];
  if (capability) {
    capabilities.push(capability);
  }

  const { data } = useUsersWithCapabilitiesInOrganizationQuery(
    portalGraphqlClient,
    { input: { organizationId, capabilities } },
    {
      // Like Relay, a failed load reaches the error page; a failed background
      // refetch of a list already loaded keeps it shown.
      throwOnError: (_error, query) => query.state.data === undefined,
    }
  );

  if (!data) {
    return <Loader />;
  }

  return (
    <RegistrationLayout
      cancel={cancel}
      cancelAnalyticsId="platform_disconnection_cancel">
      <h1 className="title-sm">
        {t(`Unregister.Error.Capability.Title`, {
          capability: capability?.replaceAll('_', ' ') ?? '',
        })}
      </h1>
      <p>
        {t(`Unregister.Error.Capability.Description`, {
          platformIdentifier: displayedIdentifier,
        })}
      </p>
      <p>{t(`Unregister.Error.Capability.AdminListTitle`)}</p>
      <ul className="list-disc ml-4">
        {data.usersWithCapabilitiesInOrganization.map((administrator) => (
          <li key={administrator.id}>
            {administrator.first_name} {administrator.last_name} -{' '}
            {administrator.email}
          </li>
        ))}
      </ul>
    </RegistrationLayout>
  );
};
