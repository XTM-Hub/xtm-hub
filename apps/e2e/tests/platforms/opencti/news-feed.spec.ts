import {
  addOpenctiNewsFeedItemToPull,
  isNewsFeedItemPulled,
  OpenctiResourceNewsFeedType,
} from '../../db-utils/news-feed.helper';
import { expect, test } from '../../fixtures/baseFixtures';
import DashboardPage from '../../model/dashboard.pageModel';
import { HomePage } from '../../model/home.pageModel';
import OpenctiNewsFeedPage, {
  NEWS_FEED_TYPES,
} from '../../model/platforms/opencti-news-feed.pageModel';
import {
  getPlatformUrl,
  OPENCTI,
} from '../../model/platforms/xtm-platform.pageModel';
import {
  signInToXtmHubAndPlatform,
  skipWithoutPlatform,
} from '../platform-registration';

// OpenCTI keeps the news feed of earlier attempts: a title of this attempt only.
const uniqueTitle = (name: string) => `${name} ${Date.now()}`;

const NEWS_FEED_DASHBOARD = {
  shortDescription: 'A dashboard announced in the OpenCTI news feed',
  version: '1.0.0',
  description: 'A dashboard published in XTM Hub while OpenCTI is connected',
};

// OpenCTI pulls the news feed only from its hub_registration_manager job, which the CI runs every second.
const waitUntilPulled = (id: string, title: string) =>
  expect
    .poll(() => isNewsFeedItemPulled(id), {
      message: `OpenCTI did not pull "${title}" from XTM Hub`,
      timeout: 20_000,
    })
    .toBe(true);

// Gives OpenCTI an item of a type to pull, and waits until it did.
const provisionAndWaitUntilPulled = async (
  type: OpenctiResourceNewsFeedType,
  title: string
) => {
  const id = await addOpenctiNewsFeedItemToPull({
    platformUrl: getPlatformUrl(OPENCTI),
    type,
    title,
  });
  await waitUntilPulled(id, title);
};

test.describe('OpenCTI news feed', () => {
  skipWithoutPlatform(OPENCTI);

  let newsFeedPage: OpenctiNewsFeedPage;

  test.beforeEach(async ({ page }) => {
    // Before anything can fail: afterEach resets what this page model changed.
    newsFeedPage = new OpenctiNewsFeedPage(page, getPlatformUrl(OPENCTI));
    const platformPage = await signInToXtmHubAndPlatform(page, OPENCTI);
    // XTM Hub only announces a resource to the platforms connected when it is published.
    await platformPage.connectToXtmHub('E2E OpenCTI');
  });

  test.afterEach(async () => {
    await newsFeedPage.resetSubscriptions();
  });

  test('should announce a dashboard published in XTM Hub with a toast and in the News Feed, and open it back in XTM Hub', async ({
    page,
  }) => {
    const dashboard = {
      ...NEWS_FEED_DASHBOARD,
      name: uniqueTitle('e2e news feed dashboard'),
    };
    // OpenCTI announces an item with a toast on the page it has open when it pulls the item: XTM Hub is used
    // in another tab, signed in by the same login.
    await newsFeedPage.openToastPage();
    const xtmHubTab = await page.context().newPage();

    await test.step('publication: publish a dashboard in XTM Hub', async () => {
      const dashboardPage = new DashboardPage(xtmHubTab);
      await new HomePage(xtmHubTab).navigateTo();
      await dashboardPage.navigateToDashboardService();
      await dashboardPage.addCustomDashboard(dashboard);
    });

    let toastHref: string | null = null;
    await test.step('toast: OpenCTI announces it', async () => {
      const toast = newsFeedPage.getToast(dashboard.name);
      await expect(toast).toBeVisible({ timeout: 30_000 });
      await expect(toast).toContainText(
        NEWS_FEED_TYPES.customDashboard.toastLabel
      );
      toastHref = await newsFeedPage
        .getToastLink(dashboard.name)
        .getAttribute('href');
    });

    await test.step('datatable: it is in the News Feed of OpenCTI', async () => {
      await newsFeedPage.waitForItem(dashboard.name);
    });

    await test.step('link: it opens the dashboard in XTM Hub', async () => {
      await expect(newsFeedPage.getItemLink(dashboard.name)).toHaveAttribute(
        'href',
        toastHref ?? ''
      );
      const openedTab = await newsFeedPage.openItemInXtmHub(dashboard.name);
      await expect(openedTab).toHaveURL(
        /\/app\/service\/opencti_custom_dashboards\/[^/]+\/[^/?]+/
      );
      await expect(
        openedTab.getByRole('heading', { name: dashboard.name })
      ).toBeVisible();
    });
  });

  test('should not announce a dashboard to a user unsubscribed from dashboards', async () => {
    const ignored = uniqueTitle('e2e ignored dashboard');
    const announced = uniqueTitle('e2e announced custom view');

    await test.step('preferences: unsubscribe from dashboards', async () => {
      await newsFeedPage.setSubscription(
        NEWS_FEED_TYPES.customDashboard,
        false
      );
      await newsFeedPage.openToastPage();
    });

    await test.step('publication: OpenCTI pulls a dashboard, then a custom view', async () => {
      // The custom view is given once the dashboard was pulled: OpenCTI is done with the dashboard when it
      // announces the custom view, whatever the user does not receive.
      await provisionAndWaitUntilPulled('RESOURCE_CUSTOM_DASHBOARD', ignored);
      await addOpenctiNewsFeedItemToPull({
        platformUrl: getPlatformUrl(OPENCTI),
        type: 'RESOURCE_CUSTOM_VIEW',
        title: announced,
      });
    });

    await test.step('toast: only the custom view is announced', async () => {
      await expect(newsFeedPage.getToast(announced)).toBeVisible({
        timeout: 30_000,
      });
      await expect(newsFeedPage.getToast(ignored)).toHaveCount(0);
    });

    await test.step('datatable: only the custom view is in the News Feed', async () => {
      await newsFeedPage.waitForItem(announced);
      await expect(newsFeedPage.getItem(ignored)).toHaveCount(0);
    });
  });

  test('should announce nothing to a user unsubscribed from all the news feed types', async () => {
    const ignoredDashboard = uniqueTitle('e2e ignored dashboard');
    const ignoredCustomView = uniqueTitle('e2e ignored custom view');
    const barrier = uniqueTitle('e2e barrier dashboard');
    const ignored = [ignoredDashboard, ignoredCustomView];

    await test.step('preferences: unsubscribe from all the types', async () => {
      await newsFeedPage.setSubscription('all', false);
    });

    // OpenCTI announces an item to the pages that listen to toasts: a user unsubscribed from every type has none,
    // so no toast can show, whatever XTM Hub gives. The News Feed of the user checks what OpenCTI delivered.
    await test.step('toast: OpenCTI does not listen to the toasts', async () => {
      await newsFeedPage.openDashboardWithoutToasts();
    });

    await test.step('publication: OpenCTI pulls a dashboard, a custom view, then a barrier', async () => {
      await provisionAndWaitUntilPulled(
        'RESOURCE_CUSTOM_DASHBOARD',
        ignoredDashboard
      );
      await provisionAndWaitUntilPulled(
        'RESOURCE_CUSTOM_VIEW',
        ignoredCustomView
      );
      // OpenCTI starts the pull of the barrier when it is done with the custom view, which is then no longer
      // waiting to arrive. The barrier itself may still be processed: it is not checked.
      await provisionAndWaitUntilPulled('RESOURCE_CUSTOM_DASHBOARD', barrier);
    });

    await test.step('datatable: nothing is in the News Feed', async () => {
      const received = await newsFeedPage.getReceivedTitles();
      for (const title of ignored) {
        expect(received).not.toContain(title);
      }
    });
  });
});
