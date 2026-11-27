import { Page } from '@playwright/test';
import { expect, test } from '../fixtures/baseFixtures';
import {
  getLastConnectivityCheck,
  getServiceInstanceGlobalId,
  setCommercialModel,
} from '../db-utils/platform-configuration.helper';
import { waitForReactIdle } from '../model/common';
import { HomePage } from '../model/home.pageModel';
import LoginPage from '../model/login.pageModel';
import NavigationMenu from '../model/navigation-menu.pageModel';
import { XtmHubRegistrationTab } from '../model/register.pageModel';
import XtmPlatformPage, {
  getPlatformUrl,
  isPlatformRunning,
  RunningPlatform,
  XtmPlatform,
} from '../model/platforms/xtm-platform.pageModel';

export const skipWithoutPlatform = (platform: RunningPlatform) =>
  test.skip(
    !isPlatformRunning(platform),
    `Needs a running ${platform.name}: see xtm-hub-dev/docker-compose-ci-${platform.name.toLowerCase().replace(/\s+/g, '')}.yml`
  );

// Signs in to XTM Hub. The XTM Hub tabs and popups a platform opens later in the same browser context are signed in
// by this login.
export const signInToXtmHub = async (page: Page) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigateToAndLogin();
  await page.waitForURL('/app');
};

// The platform registered as displayedName is listed under "My product" of its section of the XTM Hub home page.
export const expectPlatformListedInXtmHub = async (
  page: Page,
  productName: string,
  displayedName: string
) => {
  await new HomePage(page).navigateTo();
  await waitForReactIdle(page);
  const link = await new NavigationMenu(page).getMyProductLink(
    productName,
    displayedName
  );
  await expect(link).toBeVisible();
};

// Signs in to XTM Hub and to the platform, in the same browser context, and opens the platform's Filigran
// Experience settings, where it offers to connect to XTM Hub.
export const signInToXtmHubAndPlatform = async (
  page: Page,
  platform: XtmPlatform
) => {
  await signInToXtmHub(page);

  const platformPage = new XtmPlatformPage(page, platform);
  await platformPage.login();
  await platformPage.navigateToExperience();
  // XTM Hub forgot any previous registration when its database was reset: the platform resets itself too.
  await platformPage.expectNotConnected();
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
        await expect(platformPage.getConnectedStatus()).toBeVisible();
      });

      await test.step('platform is listed in XTM Hub', async () => {
        await expectPlatformListedInXtmHub(page, platform.name, displayedName);
      });

      await test.step('disconnect from the platform', async () => {
        await platformPage.navigateToExperience();
        await expect(platformPage.getConnectedStatus()).toBeVisible();
        const xtmHubTab = new XtmHubRegistrationTab(
          await platformPage.openDisconnectionTab()
        );
        await expect(
          xtmHubTab.getDisconnectionHeading(platform.name)
        ).toBeVisible();
        await xtmHubTab.confirmDisconnection();

        await expect(page.getByText(platform.disconnectedToast)).toBeVisible();
        await platformPage.expectNotConnected();
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
          // The body is read as soon as the check answers: a redirect or a retried load of the page
          // that follows would discard it before the assertion below reads it.
          let connectivityCheckBody = '';
          const connectivityCheck = page.waitForResponse(async (response) => {
            if (!platform.isConnectivityCheckRequest(response.request())) {
              return false;
            }
            connectivityCheckBody = await response.text();
            return true;
          });
          await platformPage.navigateToExperience();
          const connectivityCheckResponse = await connectivityCheck;
          expect(connectivityCheckResponse.ok()).toBeTruthy();
          expect(connectivityCheckBody).not.toContain('"errors"');

          await expect
            .poll(() => getLastConnectivityCheck(platformUrl))
            .toBeGreaterThan(previousCheck ?? 0);
        });
      }
    });

    test('should open its page in XTM Hub from its SaaS metrics', async () => {
      // TODO: enable for OpenCTI once its rolling image ships "See my OpenCTI metrics" (OpenCTI #19678).
      test.fixme(
        platform.name === 'OpenCTI',
        'The OpenCTI rolling image does not show its SaaS metrics yet: OpenCTI #19678 is not merged'
      );
      await platformPage.connectToXtmHub(displayedName);
      const platformUrl = getPlatformUrl(platform);

      await test.step(`if SaaS and connected, display redirection on ${platform.name}`, async () => {
        // The platform learns its commercial model from its next connectivity check: the Filigran Experience runs one
        // each time it opens, alongside the query it renders from, so the metrics may only show from the next visit.
        await expect(async () => {
          await setCommercialModel(platformUrl, 'SAAS');
          await platformPage.navigateToExperience();
          await expect(platformPage.getSeeMetricsLink()).toBeVisible({
            timeout: 5_000,
          });
        }).toPass({ timeout: 45_000 });
      });

      await test.step(`${platform.seeMetricsLinkName} opens the platform page in XTM Hub`, async () => {
        const serviceInstanceGlobalId =
          await getServiceInstanceGlobalId(platformUrl);
        const xtmHubTab = await platformPage.openSeeMetricsTab();
        await expect(xtmHubTab).toHaveURL(
          new RegExp(
            `/app/service/${platform.registrationServiceIdentifier}/${encodeURIComponent(serviceInstanceGlobalId)}$`
          )
        );
      });
    });
  });
};
