import { expect, test } from '../fixtures/baseFixtures.js';
import LoginPage from '../model/login.pageModel';
import OrganizationPage from '../model/organization.pageModel';

const TEST_ORGANIZATION = {
  name: 'newOrgae2e',
  newName: 'newName',
  domain: 'newOrgae2e.fr',
};
test.describe('Organization Management', () => {
  let loginPage;
  let organizationPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    organizationPage = new OrganizationPage(page);

    await loginPage.navigateToAndLogin();
    await organizationPage.navigateToOrgaAdmin();
  });

  test('should perform complete CRUD operations on organizations', async ({
    page,
  }) => {
    await test.step('Create new organization', async () => {
      await organizationPage.createOrganization(
        TEST_ORGANIZATION.name,
        TEST_ORGANIZATION.domain
      );
      await expect(
        page.getByRole('cell', { name: TEST_ORGANIZATION.name, exact: true })
      ).toBeVisible();
    });

    await test.step('Edit organization', async () => {
      await organizationPage.editOrganization(
        TEST_ORGANIZATION.name,
        TEST_ORGANIZATION.newName
      );
      await expect(
        page.getByRole('cell', { name: TEST_ORGANIZATION.newName, exact: true })
      ).toBeVisible();
    });

    await test.step('Delete organization', async () => {
      await organizationPage.deleteOrganization(TEST_ORGANIZATION.newName);
      await expect(
        page.getByRole('cell', { name: TEST_ORGANIZATION.newName })
      ).not.toBeVisible();
    });
  });
});
