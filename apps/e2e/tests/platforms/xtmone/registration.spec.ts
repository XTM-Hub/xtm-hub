import { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/baseFixtures';
import { getLastConnectivityCheck } from '../../db-utils/platform-configuration.helper';
import { waitForReactIdle } from '../../model/common';
import { HomePage } from '../../model/home.pageModel';
import LoginPage from '../../model/login.pageModel';
import { XtmHubRegistrationTab } from '../../model/register.pageModel';
import XtmOnePage, {
  getXtmOneUrl,
  isXtmOneRunning,
  XTMONE,
} from '../../model/platforms/xtmone.pageModel';

// Signs in to XTM Hub and to XTM One, in the same browser context, and opens XTM One's Settings > Platform, where its
// XTM Hub card shows "Not registered".
const signInToXtmHubAndXtmOne = async (page: Page) => {
  // The XTM Hub popups XTM One opens are signed in by this login.
  const loginPage = new LoginPage(page);
  await loginPage.navigateToAndLogin();
  await page.waitForURL('/app');

  const xtmOnePage = new XtmOnePage(page);
  await xtmOnePage.login();
  await xtmOnePage.navigateToSettings();
  await xtmOnePage.resetRegistration();
  return xtmOnePage;
};

// XTM One registers itself on XTM Hub the way a user does: from its settings it opens XTM Hub in a popup, and XTM Hub
// posts the platform token back to it. XTM One has no one-click deploy yet.
test.describe('XTM One registration', () => {
  test.skip(
    !isXtmOneRunning(),
    'Needs a running XTM One: see xtm-hub-dev/docker-compose-ci-xtmone.yml'
  );

  const displayedName = 'E2E XTM One';
  let xtmOnePage: XtmOnePage;

  test.beforeEach(async ({ page }) => {
    xtmOnePage = await signInToXtmHubAndXtmOne(page);
  });

  test('should register and unregister XTM One', async ({ page }) => {
    await test.step('register from XTM One', async () => {
      const xtmHubTab = new XtmHubRegistrationTab(
        await xtmOnePage.openRegistrationPopup()
      );
      await expect(xtmHubTab.getConnectionHeading(XTMONE.name)).toBeVisible();
      await xtmHubTab.connect(displayedName);

      await expect(page.getByText(XTMONE.connectedToast)).toBeVisible();
      await expect(
        xtmOnePage.getRegistrationStatus('Registered')
      ).toBeVisible();
    });

    await test.step('XTM One is listed in XTM Hub', async () => {
      const homePage = new HomePage(page);
      await homePage.navigateTo();
      await waitForReactIdle(page);
      await page.getByRole('button', { name: XTMONE.name }).click();
      await page.getByRole('button', { name: 'My product' }).click();
      await expect(
        page.getByRole('link', { name: displayedName, exact: true })
      ).toBeVisible();
    });

    await test.step('unregister from XTM One', async () => {
      await xtmOnePage.navigateToSettings();
      await expect(
        xtmOnePage.getRegistrationStatus('Registered')
      ).toBeVisible();
      const xtmHubTab = new XtmHubRegistrationTab(
        await xtmOnePage.openUnregistrationPopup()
      );
      await expect(
        xtmHubTab.getDisconnectionHeading(XTMONE.name)
      ).toBeVisible();
      await xtmHubTab.confirmDisconnection();

      await expect(page.getByText(XTMONE.disconnectedToast)).toBeVisible();
      await expect(
        xtmOnePage.getRegistrationStatus('Not registered')
      ).toBeVisible();
    });
  });

  test('should stay unregistered when the registration is canceled in XTM Hub', async () => {
    const xtmHubTab = new XtmHubRegistrationTab(
      await xtmOnePage.openRegistrationPopup()
    );
    await expect(xtmHubTab.getConnectionHeading(XTMONE.name)).toBeVisible();
    await xtmHubTab.cancel();

    await expect(xtmOnePage.getRegisterButton()).toBeEnabled();
    await expect(
      xtmOnePage.getRegistrationStatus('Not registered')
    ).toBeVisible();
  });

  test('should check its connectivity with XTM Hub each time it is asked to', async () => {
    await xtmOnePage.registerOnXtmHub(displayedName);
    const xtmOneUrl = getXtmOneUrl();

    // Two checks in a row: each one must reach XTM Hub, not only the first.
    for (const check of [1, 2]) {
      await test.step(`check ${check} from the XTM Hub card`, async () => {
        const previousCheck = await getLastConnectivityCheck(xtmOneUrl);
        expect(previousCheck).not.toBeNull();

        const checkResponse = await xtmOnePage.checkNow();
        expect(checkResponse.ok()).toBeTruthy();
        await expect(
          xtmOnePage.getRegistrationStatus('Registered')
        ).toBeVisible();

        await expect
          .poll(() => getLastConnectivityCheck(xtmOneUrl))
          .toBeGreaterThan(previousCheck ?? 0);
      });
    }
  });
});
