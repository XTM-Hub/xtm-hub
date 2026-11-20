import { expect, test } from '../fixtures/baseFixtures';
import LoginPage from '../model/login.pageModel';
import IntegrationPage from '../model/integration.pageModel';
import { addServiceCapability } from '../db-utils/service.helper';
import ServicePage from '../model/service.pageModel';
import { clickRowAction, META_DESCRIPTION_SUMMARY } from '../model/common';

const TEST_INTEGRATION = {
  name: 'e2e integration capability',
  metaDescription: META_DESCRIPTION_SUMMARY,
  shortDescription: 'e2e integration capability short description',
  description: 'e2e integration capability markdown description',
};

const SERVICE_CAPABILITY = {
  idUpload: '5b08530f-9112-4de7-be13-7a74d76f3ead',
  idDelete: 'df8a6142-153a-42a5-9325-baef5d212044',
  nameUpload: 'UPLOAD',
  nameDelete: 'DELETE',
};

const TEST_CAPABILITY = {
  integrationServiceDefId: '2634d52b-f061-4ebc-bed2-c6cc94297ad2',
  serviceName: 'OpenCTI Integrations Library',
  adminThalesEmail: 'admin@second-orga.com',
  userThalesEmail: 'user@second-orga.com',
  thalesOrgaId: '681fb117-e2c3-46d3-945a-0e921b5d4b6c',
  organizationName: 'SECOND ORGA',
};
test.describe('Capabilities', () => {
  let loginPage: LoginPage;
  let integrationPage: IntegrationPage;
  let servicePage: ServicePage;

  test.beforeEach(async ({ page }) => {
    await addServiceCapability({
      id: SERVICE_CAPABILITY.idUpload,
      name: SERVICE_CAPABILITY.nameUpload,
      service_definition_id: TEST_CAPABILITY.integrationServiceDefId,
    });
    await addServiceCapability({
      id: SERVICE_CAPABILITY.idDelete,
      name: SERVICE_CAPABILITY.nameDelete,
      service_definition_id: TEST_CAPABILITY.integrationServiceDefId,
    });

    loginPage = new LoginPage(page);
    integrationPage = new IntegrationPage(page);
    servicePage = new ServicePage(page);

    await loginPage.navigateToAndLogin();
  });
  test('Should add subscription with capabilities', async ({ page }) => {
    await test.step("Add orga's sub + user with manage access", async () => {
      await servicePage.navigateToServiceListAdmin();

      await servicePage.navigateToServiceItemAdmin(TEST_CAPABILITY.serviceName);

      await servicePage.addOrganizationIntoServiceWithCapabilities(
        TEST_CAPABILITY.organizationName
      );

      await clickRowAction(
        page,
        page.getByRole('row', {
          name: `${TEST_CAPABILITY.organizationName} DELETE UPLOAD Open menu`,
        }),
        'Manage users'
      );
      await servicePage.addUserIntoService(TEST_CAPABILITY.adminThalesEmail);

      await loginPage.logout();
    });
    await test.step('Add simple user access + upload capa', async () => {
      await loginPage.navigateToAndLogin(TEST_CAPABILITY.adminThalesEmail);

      await integrationPage.navigateToIntegrationsService();
      await page.getByRole('link', { name: /Manage access/i }).click();

      await servicePage.addUserIntoServiceWithCapability(
        TEST_CAPABILITY.userThalesEmail,
        'UPLOAD access:'
      );
      await expect(
        page.getByRole('row', { name: TEST_CAPABILITY.userThalesEmail })
      ).toContainText(new RegExp(SERVICE_CAPABILITY.nameUpload, 'i'));
      await loginPage.logout();
    });

    await test.step('Simple user create a new integration', async () => {
      await loginPage.navigateToAndLogin(TEST_CAPABILITY.userThalesEmail);
      await integrationPage.navigateToIntegrationsService();
      await integrationPage.fillCsvFeed(TEST_INTEGRATION);
      await expect(
        page.getByText(TEST_INTEGRATION.name, { exact: true })
      ).toBeVisible();
      await loginPage.logout();
    });

    await test.step('Admin user change simple user capa to delete', async () => {
      await loginPage.navigateToAndLogin(TEST_CAPABILITY.adminThalesEmail);
      await integrationPage.navigateToIntegrationsService();
      await page.getByRole('link', { name: /Manage access/i }).click();

      await servicePage.editUsersRightsForService(
        TEST_CAPABILITY.userThalesEmail,
        'DELETE access:'
      );
      await expect(
        page.getByRole('row', { name: TEST_CAPABILITY.userThalesEmail })
      ).toContainText(new RegExp(SERVICE_CAPABILITY.nameDelete, 'i'));
      await loginPage.logout();
    });
    await test.step('Simple user can delete integration', async () => {
      await loginPage.navigateToAndLogin(TEST_CAPABILITY.userThalesEmail);
      await integrationPage.navigateToIntegrationsService();

      const integrationCard = integrationPage.getIntegrationCard(
        TEST_INTEGRATION.name
      );
      await expect(integrationCard).toBeVisible();

      await integrationCard
        .getByRole('button', { name: 'Open menu', exact: true })
        .click();
      await integrationPage.deleteIntegration('menuitem');

      await expect(integrationCard).toHaveCount(0);
    });
  });
});
