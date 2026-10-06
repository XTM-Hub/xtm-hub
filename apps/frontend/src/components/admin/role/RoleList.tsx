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
      <h1>{t('MenuLinks.Roles')}</h1>
      <Tabs defaultValue="ssoGroups">
        <TabsList>
          <TabsTrigger value="ssoGroups">
            {t('RoleListPage.SsoGroups')}
          </TabsTrigger>
          <TabsTrigger value="capabilities">
            {t('RoleListPage.Capabilities')}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="ssoGroups"
          className="pt-l">
          <SsoGroupRolePortalList />
        </TabsContent>
        <TabsContent
          value="capabilities"
          className="pt-l">
          <RolePortalCapabilitiesList />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default RoleList;
