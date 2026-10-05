import { expect, test } from '../fixtures/baseFixtures.js';
import LoginPage from '../model/login.pageModel';
import ServicePage from '../model/service.pageModel';
import { clickRowAction, waitForReactIdle } from '../model/common.js';

const TEST_SUBSCRIPTION = {
  organizationName: 'SECOND ORGA',
  organizationId: '681fb117-e2c3-46d3-945a-0e921b5d4b6c',
  adminOrgaEmail: 'admin@second-orga.com',
  userInOrgaEmail: 'user@second-orga.com',
  serviceName: 'OpenCTI Integrations Library',
};

export const GENERIC_CAPABILITY = {
  manageAccess: 'MANAGE_ACCESS',
  access: 'ACCESS',
};
test.describe('Service Management', () => {
  let loginPage: LoginPage;
  let servicePage: ServicePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    servicePage = new ServicePage(page);

    await loginPage.navigateToAndLogin();
    await servicePage.navigateToServiceListAdmin();
    await servicePage.navigateToServiceItemAdmin();
  });

  test('should be able to admin service', async ({ page }) => {
    await test.step("Add orga's sub + admin with manage access", async () => {
      await servicePage.addOrganizationIntoService(
        TEST_SUBSCRIPTION.organizationName
      );
      await expect(
        page.getByRole('cell', { name: TEST_SUBSCRIPTION.organizationName })
      ).toBeVisible();
    });

    await test.step("Add user's rights for service", async () => {
      await clickRowAction(
        page,
        page.getByRole('row', { name: TEST_SUBSCRIPTION.organizationName }),
        'Manage users'
      );

      await servicePage.addUserIntoService(TEST_SUBSCRIPTION.userInOrgaEmail);

      await expect(
        page.getByRole('cell', { name: TEST_SUBSCRIPTION.userInOrgaEmail })
      ).toBeVisible();
      await expect(
        page.getByText(GENERIC_CAPABILITY.manageAccess)
      ).toBeVisible();
    });

    await test.step("Edit user's rights for service", async () => {
      await servicePage.editUsersRightsForService(
        TEST_SUBSCRIPTION.userInOrgaEmail
      );
      await expect(page.getByText(GENERIC_CAPABILITY.access)).toBeVisible();
    });

    await test.step('Add user that is not in organization', async () => {
      await page.getByRole('button', { name: 'Invite user' }).click();
      await page.getByRole('button', { name: 'Email' }).click();
      await page.getByPlaceholder('Search...').click();
      await page.getByPlaceholder('Search...').fill('user15');
      await expect(page.getByText('user15')).not.toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();
    });

    await test.step("Delete an organization's subscription", async () => {
      await page
        .getByRole('link', { name: TEST_SUBSCRIPTION.serviceName })
        .click();
      await expect(
        page.getByRole('heading', { name: TEST_SUBSCRIPTION.serviceName })
      ).toBeVisible();
      await waitForReactIdle(page);

      await servicePage.deleteOrganizationFromService(
        TEST_SUBSCRIPTION.organizationName
      );

      await expect(
        page.getByRole('cell', { name: TEST_SUBSCRIPTION.organizationName })
      ).not.toBeVisible();
    });
  });
});
