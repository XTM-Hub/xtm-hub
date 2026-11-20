import { expect, test } from '../fixtures/baseFixtures';
import { META_DESCRIPTION_SUMMARY } from '../model/common';
import LoginPage from '../model/login.pageModel';
import IntegrationPage from '../model/integration.pageModel';

const STREAM_TEST = {
  name: 'e2e Stream name',
  metaDescription: META_DESCRIPTION_SUMMARY,
  shortDescription: 'This is a short description',
  description: 'This is a Stream description markdown',
  streamsServiceInstanceId: '0f4aad4b-bdd6-4084-8b1f-82c9c66578cc',
};

test.describe('Streams', () => {
  let loginPage: LoginPage;
  let integrationPage: IntegrationPage;
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    integrationPage = new IntegrationPage(page);

    await loginPage.navigateToAndLogin();
    await integrationPage.navigateToIntegrationsService();
    await integrationPage.fillStream(STREAM_TEST);
  });

  test('Should add Stream', async ({ page }) => {
    await integrationPage.navigateToIntegration(STREAM_TEST.shortDescription);

    await expect(
      page.getByRole('heading', { name: STREAM_TEST.name })
    ).toBeVisible();
  });

  test('Should delete Stream from the list', async ({ page }) => {
    await expect(
      page.getByText(STREAM_TEST.name, { exact: true })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await integrationPage.deleteIntegration('menuitem');

    await expect(
      page.getByText(STREAM_TEST.name, { exact: true })
    ).not.toBeVisible();
  });
  test('Should delete Stream from the detailed page', async ({ page }) => {
    await integrationPage.navigateToIntegration(STREAM_TEST.shortDescription);
    await integrationPage.deleteIntegration('button');
    //  Need to wait for the redirection to be over
    await page.waitForTimeout(2000);
    await expect(
      page.getByText(STREAM_TEST.name, { exact: true })
    ).not.toBeVisible();
  });
});
