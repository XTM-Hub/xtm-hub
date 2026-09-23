import { RegistrationContext } from '@/components/registration/Context';
import { RegistrationLayout } from '@/components/registration/Layout';
import { useTranslate } from '@/hooks/use-translate';
import UserWithCapabilitiesInOrganizationQueryGraphql, {
  userWithCapabilitiesInOrganizationQuery,
} from '@generated/userWithCapabilitiesInOrganizationQuery.graphql';
import { OrganizationCapability } from '@graphql/generated';
import { useContext } from 'react';
import { useLazyLoadQuery } from 'react-relay';

interface RegisterStateMissingCapabilityProps {
  cancel: () => void;
  organizationId: string;
}

export const RegisterStateMissingCapability = ({
  organizationId,
  cancel,
}: RegisterStateMissingCapabilityProps) => {
  const { capability, displayedIdentifier } = useContext(RegistrationContext);
  const t = useTranslate();
  const capabilities = [OrganizationCapability.AdministrateOrganization];
  if (capability) {
    capabilities.push(capability);
  }

  const { usersWithCapabilitiesInOrganization } =
    useLazyLoadQuery<userWithCapabilitiesInOrganizationQuery>(
      UserWithCapabilitiesInOrganizationQueryGraphql,
      {
        input: {
          organizationId,
          capabilities,
        },
      }
    );

  return (
    <RegistrationLayout cancel={cancel}>
      <h1>
        {t(`Register.Error.Capability.Title`, {
          capability: capability?.replaceAll('_', ' ') ?? '',
        })}
      </h1>
      <p>
        {t(`Register.Error.Capability.Description`, {
          platformIdentifier: displayedIdentifier,
        })}
      </p>
      <p>{t(`Register.Error.Capability.AdminListTitle`)}</p>
      <ul className="list-disc ml-l">
        {usersWithCapabilitiesInOrganization.map((administrator) => (
          <li key={administrator.id}>
            {administrator.first_name} {administrator.last_name} -{' '}
            {administrator.email}
          </li>
        ))}
      </ul>
    </RegistrationLayout>
  );
};
