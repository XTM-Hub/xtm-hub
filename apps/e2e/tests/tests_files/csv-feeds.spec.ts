import { expect, test } from '../fixtures/baseFixtures';
import LoginPage from '../model/login.pageModel';
import IntegrationPage from '../model/integration.pageModel';
import { publishResource } from '../model/common';

const CSV_FEED_TEST = {
  name: 'e2e CSV Feed name',
  shortDescription: 'This is a short description',
  description: 'This is a CSV description markdown',
  csvFeedsServiceInstanceId: '0f4aad4b-bdd6-4084-8b1f-82c9c66578cc',
};

test.describe('CSV Feeds', () => {
  let loginPage: LoginPage;
  let integrationPage: IntegrationPage;
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    integrationPage = new IntegrationPage(page);

    await loginPage.navigateToAndLogin();
    await integrationPage.navigateToIntegrationsService();
    await integrationPage.fillCsvFeed(CSV_FEED_TEST);
  });

  test('Should add CSV Feed', async ({ page }) => {
    await integrationPage.navigateToIntegration(CSV_FEED_TEST.shortDescription);

    await expect(
      page.getByRole('heading', { name: CSV_FEED_TEST.name })
    ).toBeVisible();
  });
  test('Should move a requested CSV Feed from In validation to published', async ({
    page,
  }) => {
    const inValidationTitle = page.getByText('In validation:', { exact: true });
    await expect(inValidationTitle).toBeVisible();
    await expect(
      page.getByText(CSV_FEED_TEST.name, { exact: true })
    ).toBeVisible();

    await publishResource(page, CSV_FEED_TEST.name);

    await expect(inValidationTitle).not.toBeVisible();
    await expect(
      page.getByText(CSV_FEED_TEST.name, { exact: true })
    ).toBeVisible();
  });
  test('Should delete CSV Feed from the list', async ({ page }) => {
    await expect(
      page.getByText(CSV_FEED_TEST.name, { exact: true })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await integrationPage.deleteIntegration('menuitem');

    await expect(
      page.getByText(CSV_FEED_TEST.name, { exact: true })
    ).not.toBeVisible();
  });
  test('Should delete CSV Feed from the detailed page', async ({ page }) => {
    await integrationPage.navigateToIntegration(CSV_FEED_TEST.shortDescription);
    await integrationPage.deleteIntegration('button');
    //  Need to wait for the redirection to be over
    await page.waitForTimeout(2000);
    await expect(
      page.getByText(CSV_FEED_TEST.name, { exact: true })
    ).not.toBeVisible();
  });
});
