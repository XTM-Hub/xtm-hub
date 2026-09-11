import { expect, test } from '../fixtures/baseFixtures';
import IntegrationPage from '../model/integration.pageModel';
import LoginPage from '../model/login.pageModel';
import RegisterPage from '../model/register.pageModel';
import { v4 as uuidv4 } from 'uuid';
import { insertDeploymentRequest } from '../db-utils/deployment.helper';
import { ADMIN_USER, PLATFORM_ORGANIZATION_UUID } from '../db-utils/const';

test.describe('Organization switcher', async () => {
  let loginPage: LoginPage;
  let integrationPage: IntegrationPage;
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    integrationPage = new IntegrationPage(page);
    registerPage = new RegisterPage(page);
  });

  test('Should see registered platforms, subscriptions and trials', async ({
    page,
  }) => {
    // Given
    // Have 1 active trial (OpenAEV)
    await insertDeploymentRequest({
      id: uuidv4(),
      user_requester_id: ADMIN_USER.ID,
      organization_requester_id: PLATFORM_ORGANIZATION_UUID,
      type: 'trial',
      request_date: new Date(),
      start_date: new Date(),
      end_date: new Date(new Date().getDate() + 1), // Tomorrow
      platform_identifier: 'opencti',
      hub_status: 'active',
      target_state: 'active',
      actual_state: 'active',
      ordering: 1,
      counts_in_orga_quota: true,
      region: 'us-west',
      platform_token: uuidv4(),
    });
    // Have subscription
    await loginPage.navigateToAndLogin();
    await integrationPage.navigateToIntegrationsService();
    // Have registered platform (OpenCTI)
    await registerPage.navigateToAndRegister('register-opencti');
    await loginPage.navigateTo();
    await test.step("Should see his organization's items", async () => {
      await page.getByRole('button', { name: 'OpenCTI' }).click();
      await page.getByRole('button', { name: 'My products' }).click();
      await expect(
        page.getByRole('link', { name: 'Open CTI Instance', exact: true })
      ).toBeVisible();
      await expect(page.getByText('2 connected products')).toBeVisible();
    });

    // When User switch on personal space
    await test.step("Should not see his organization's items but personal ones", async () => {
      await page
        .getByRole('combobox', { name: 'Select an organization' })
        .click();
      await page.getByText('Personal space').click();
      // Then he should not see his subscriptions, registrations and trials
      await page.getByRole('button', { name: 'OpenCTI' }).click();
      await expect(
        page.getByRole('button', { name: 'My products' })
      ).not.toBeVisible();

      await expect(page.getByText('2 connected products')).not.toBeVisible();
    });

    // WHen User comes back to organization
    await test.step("Should see his organization's items", async () => {
      await page
        .getByRole('combobox', { name: 'Select an organization' })
        .click();
      await page.getByText('Filigran', { exact: true }).click();
      // Then he should see again its subscriptions, registrations and trials
      await page.getByRole('button', { name: 'OpenCTI' }).click();
      await page.getByRole('button', { name: 'My products' }).click();
      await expect(
        page.getByRole('link', { name: 'Open CTI Instance', exact: true })
      ).toBeVisible();

      await expect(page.getByText('2 connected products')).toBeVisible();
    });
  });
});
