import { expect, test } from '../fixtures/baseFixtures';
import { META_DESCRIPTION_SUMMARY } from '../model/common';
import LoginPage from '../model/login.pageModel';
import IntegrationPage from '../model/integration.pageModel';

const ThirdPartyIntegration_TEST = {
  name: 'e2e Third Party Integration name',
  metaDescription: META_DESCRIPTION_SUMMARY,
  shortDescription: 'This is a short description',
  description: 'This is a Third party integration description markdown',
  thirdPartyIntegrationFeedsServiceInstanceId:
    '0f4aad4b-bdd6-4084-8b1f-82c9c66578cc',
};

test.describe('Third Party Integrations', () => {
  let loginPage: LoginPage;
  let integrationPage: IntegrationPage;
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    integrationPage = new IntegrationPage(page);

    await loginPage.navigateToAndLogin();
    await integrationPage.navigateToIntegrationsService();
    await integrationPage.fillThirdPartyIntegration(ThirdPartyIntegration_TEST);
  });

  test('Should add Third Party Integration', async ({ page }) => {
    await integrationPage.navigateToIntegration(
      ThirdPartyIntegration_TEST.shortDescription
    );

    await expect(
      page.getByRole('heading', { name: ThirdPartyIntegration_TEST.name })
    ).toBeVisible();
  });
  test('Should delete Third Party Integration from the list', async ({
    page,
  }) => {
    await expect(
      page.getByText(ThirdPartyIntegration_TEST.name, { exact: true })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await integrationPage.deleteIntegration('menuitem');

    await expect(
      page.getByText(ThirdPartyIntegration_TEST.name, { exact: true })
    ).not.toBeVisible();
  });
  test('Should delete Third Party Integration from the detailed page', async ({
    page,
  }) => {
    await integrationPage.navigateToIntegration(
      ThirdPartyIntegration_TEST.shortDescription
    );
    await integrationPage.deleteIntegration('button');
    //  Need to wait for the redirection to be over
    await page.waitForTimeout(2000);
    await expect(
      page.getByText(ThirdPartyIntegration_TEST.name, { exact: true })
    ).not.toBeVisible();
  });
});
