import { Page } from '@playwright/test';
import { expect, test } from '../fixtures/baseFixtures';
import { getLastConnectivityCheck } from '../db-utils/platform-configuration.helper';
import { waitForReactIdle } from '../model/common';
import { HomePage } from '../model/home.pageModel';
import LoginPage from '../model/login.pageModel';
import { XtmHubRegistrationTab } from '../model/register.pageModel';
import XtmPlatformPage, {
  getPlatformUrl,
  isPlatformRunning,
  XtmPlatform,
} from '../model/platforms/xtm-platform.pageModel';

export const skipWithoutPlatform = (platform: XtmPlatform) =>
  test.skip(
    !isPlatformRunning(platform),
    `Needs a running ${platform.name}: see xtm-hub-dev/docker-compose-ci-${platform.name.toLowerCase()}.yml`
  );

// Signs in to XTM Hub and to the platform, in the same browser context, and opens the platform's Filigran
// Experience settings, where it shows "Not connected".
export const signInToXtmHubAndPlatform = async (
  page: Page,
  platform: XtmPlatform
) => {
  // The XTM Hub tabs the platform opens are signed in by this login.
  const loginPage = new LoginPage(page);
  await loginPage.navigateToAndLogin();
  await page.waitForURL('/app');

  const platformPage = new XtmPlatformPage(page, platform);
  await platformPage.login();
  await platformPage.navigateToExperience();
  // XTM Hub forgot any previous registration when its database was reset: the platform resets itself too.
  await expect(platformPage.getConnectionStatus('Not connected')).toBeVisible();
  return platformPage;
};

// Connects a real platform to XTM Hub from the platform's own settings, the way a user does: the platform opens
// XTM Hub in a new tab, and XTM Hub sends the result back with postMessage.
export const describePlatformRegistration = (platform: XtmPlatform) => {
  test.describe(`${platform.name} registration`, () => {
    skipWithoutPlatform(platform);

    const displayedName = `E2E ${platform.name}`;
    let platformPage: XtmPlatformPage;

    test.beforeEach(async ({ page }) => {
      platformPage = await signInToXtmHubAndPlatform(page, platform);
    });

    test('should connect and disconnect the platform', async ({ page }) => {
      await test.step('connect from the platform', async () => {
        const xtmHubTab = new XtmHubRegistrationTab(
          await platformPage.openConnectionTab()
        );
        await expect(
          xtmHubTab.getConnectionHeading(platform.name)
        ).toBeVisible();
        await xtmHubTab.connect(displayedName);

        await expect(page.getByText(platform.connectedToast)).toBeVisible();
        await expect(
          platformPage.getConnectionStatus('Connected')
        ).toBeVisible();
      });

      await test.step('platform is listed in XTM Hub', async () => {
        const homePage = new HomePage(page);
        await homePage.navigateTo();
        await waitForReactIdle(page);
        await page.getByRole('button', { name: platform.name }).click();
        await page.getByRole('button', { name: 'My product' }).click();
        await expect(
          page.getByRole('link', { name: displayedName, exact: true })
        ).toBeVisible();
      });

      await test.step('disconnect from the platform', async () => {
        await platformPage.navigateToExperience();
        await expect(
          platformPage.getConnectionStatus('Connected')
        ).toBeVisible();
        const xtmHubTab = new XtmHubRegistrationTab(
          await platformPage.openDisconnectionTab()
        );
        await expect(
          xtmHubTab.getDisconnectionHeading(platform.name)
        ).toBeVisible();
        await xtmHubTab.confirmDisconnection();

        await expect(page.getByText(platform.disconnectedToast)).toBeVisible();
        await expect(
          platformPage.getConnectionStatus('Not connected')
        ).toBeVisible();
      });
    });

    test('should report a connection canceled in XTM Hub', async ({ page }) => {
      const xtmHubTab = new XtmHubRegistrationTab(
        await platformPage.openConnectionTab()
      );
      await expect(xtmHubTab.getConnectionHeading(platform.name)).toBeVisible();
      await xtmHubTab.cancel();

      await expect(
        page.getByText('You have canceled the connection process')
      ).toBeVisible();
    });

    test('should check its connectivity with XTM Hub each time the Filigran Experience opens', async ({
      page,
    }) => {
      await platformPage.connectToXtmHub(displayedName);
      const platformUrl = getPlatformUrl(platform);

      // Two visits in a row: each one must reach XTM Hub, not only the first.
      for (const visit of [1, 2]) {
        await test.step(`visit ${visit} of the Filigran Experience`, async () => {
          const previousCheck = await getLastConnectivityCheck(platformUrl);
          expect(previousCheck).not.toBeNull();

          // The page itself asks the platform to check: a background job of the platform may also do it.
          const connectivityCheck = page.waitForResponse((response) =>
            platform.isConnectivityCheckRequest(response.request())
          );
          await platformPage.navigateToExperience();
          const connectivityCheckResponse = await connectivityCheck;
          expect(connectivityCheckResponse.ok()).toBeTruthy();
          expect(await connectivityCheckResponse.text()).not.toContain(
            '"errors"'
          );

          await expect
            .poll(() => getLastConnectivityCheck(platformUrl))
            .toBeGreaterThan(previousCheck ?? 0);
        });
      }
    });
  });
};
