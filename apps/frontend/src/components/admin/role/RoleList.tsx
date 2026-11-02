import RolePortalCapabilitiesList from '@/components/admin/role/RolePortalCapabilitiesList';
import SsoGroupRolePortalList from '@/components/admin/role/SsoGroupRolePortalList';
import { useTranslate } from '@/hooks/use-translate';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@filigran/design-system';

const RoleList = () => {
  const t = useTranslate();

  return (
    <>
      <h1 className="sr-only">{t('MenuLinks.Roles')}</h1>
      <Tabs defaultValue="capabilities">
        <TabsList>
          <TabsTrigger value="capabilities">
            {t('RoleListPage.Capabilities')}
          </TabsTrigger>
          <TabsTrigger value="ssoGroups">
            {t('RoleListPage.SsoGroups')}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="capabilities"
          className="pt-4">
          <RolePortalCapabilitiesList />
        </TabsContent>
        <TabsContent
          value="ssoGroups"
          className="pt-4">
          <SsoGroupRolePortalList />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default RoleList;
