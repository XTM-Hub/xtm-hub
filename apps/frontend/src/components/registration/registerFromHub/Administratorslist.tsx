import { useTranslate } from '@/hooks/use-translate';
import { ConnectProductOrganizationAdminsQuery } from '@graphql/generated';

interface AdministratorslistProps {
  admins?: ConnectProductOrganizationAdminsQuery;
}

export const Administratorslist = ({ admins }: AdministratorslistProps) => {
  const t = useTranslate();

  if (!admins) {
    return null;
  }
  return (
    <div className="space-y-1">
      <div className="content-body-base">
        {t('Register.ConnectFromHub.Administrators', {
          count: admins.usersWithCapabilitiesInOrganization?.length ?? 0,
        })}
        :
      </div>
      {admins.usersWithCapabilitiesInOrganization?.map((user) => {
        return (
          <div
            className="content-body-base"
            key={user.id}>
            {user.email}
          </div>
        );
      })}
    </div>
  );
};
