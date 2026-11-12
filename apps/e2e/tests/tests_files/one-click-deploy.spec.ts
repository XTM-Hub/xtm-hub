import { expect, test } from '../fixtures/baseFixtures';
import LoginPage from '../model/login.pageModel';

import IntegrationPage from '../model/integration.pageModel';
import RegisterPage from '../model/register.pageModel';
import { HomePage } from '../model/home.pageModel';

const CSV_FEED_TEST = {
  name: 'e2e CSV Feed name',
  shortDescription: 'This is a short description',
  description: 'This is a CSV description markdown',
  csvFeedsServiceInstanceId: '0f4aad4b-bdd6-4084-8b1f-82c9c66578cc',
};

test.describe('One Click Deploy', () => {
  let loginPage: LoginPage;
  let csvFeedPage: IntegrationPage;
  let registerPage: RegisterPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    csvFeedPage = new IntegrationPage(page);
    homePage = new HomePage(page);
    await loginPage.navigateToAndLogin();
    await page.waitForURL('/app');

    registerPage = new RegisterPage(page);
    await registerPage.navigateToAndRegister('register-opencti');

    await homePage.navigateTo();
    await csvFeedPage.navigateToIntegrationsService();
    await csvFeedPage.fillCsvFeed(CSV_FEED_TEST);
  });

  test('should send telemetry event', async ({ page }) => {
    await test.step('Deploy in OpenCTI button is visible', async () => {
      await csvFeedPage.navigateToIntegration(CSV_FEED_TEST.shortDescription);
      await expect(
        page.getByRole('heading', { name: CSV_FEED_TEST.name })
      ).toBeVisible();
      await expect(
        page
          .getByRole('button', {
            name: 'Deploy in OpenCTI',
          })
          .first()
      ).toBeVisible();
    });
    await test.step('Click on Deploy in OpenCTI button displays popup', async () => {
      await page
        .getByRole('button', {
          name: 'Deploy in OpenCTI',
        })
        .first()
        .click();

      await expect(
        page.getByRole('heading', {
          name: `You're about to deploy the ${CSV_FEED_TEST.name} Integration OpenCTI`,
        })
      ).toBeVisible();
    });
    await test.step('Click on popup sends telemetry event and opens new tab', async () => {
      const [graphqlResponse] = await Promise.all([
        // Wait for the GraphQL network call (response ensures it actually completed)
        page.waitForResponse((res) => {
          if (
            !res.url().includes('/graphql') ||
            res.request().method() !== 'POST'
          )
            return false;
          try {
            const body = res.request().postDataJSON();
            return (
              typeof body.query === 'string' &&
              /mutation OneClickDeploy\b/.test(body.query)
            );
          } catch {
            return false;
          }
        }),

        // Trigger both by clicking the button
        page
          .getByRole('button', {
            name: 'Continue',
          })
          .click(),
      ]);

      expect(graphqlResponse.ok()).toBeTruthy();
    });
  });
});
