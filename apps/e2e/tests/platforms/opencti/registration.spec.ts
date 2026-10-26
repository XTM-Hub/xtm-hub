import { expect, test } from '../../fixtures/baseFixtures';
import DashboardPage, {
  DEPLOYABLE_JSON_FILE,
} from '../../model/dashboard.pageModel';
import { HomePage } from '../../model/home.pageModel';
import OneClickDeployPage from '../../model/one-click-deploy.pageModel';
import OpenctiNewsFeedPage from '../../model/platforms/opencti-news-feed.pageModel';
import {
  getPlatformUrl,
  OPENCTI,
} from '../../model/platforms/xtm-platform.pageModel';
import {
  describePlatformRegistration,
  signInToXtmHubAndPlatform,
  skipWithoutPlatform,
} from '../platform-registration';

describePlatformRegistration(OPENCTI);

const DASHBOARD = {
  name: 'e2e deployable dashboard',
  shortDescription: 'A dashboard to deploy in OpenCTI',
  version: '1.0.0',
  description: 'A dashboard deployed in a real OpenCTI',
  jsonFilePath: DEPLOYABLE_JSON_FILE.path,
};

test.describe('OpenCTI one-click deploy', () => {
  skipWithoutPlatform(OPENCTI);

  test('should deploy a custom dashboard from XTM Hub', async ({ page }) => {
    const platformPage = await signInToXtmHubAndPlatform(page, OPENCTI);
    await platformPage.connectToXtmHub('E2E OpenCTI');

    const dashboardPage = new DashboardPage(page);
    await test.step('publish a dashboard in XTM Hub', async () => {
      await new HomePage(page).navigateTo();
      await dashboardPage.navigateToDashboardService();
      await dashboardPage.addCustomDashboard(DASHBOARD);
    });

    await test.step('deploy it in OpenCTI', async () => {
      await dashboardPage.navigateToDashboard(DASHBOARD.shortDescription);
      const openctiTab = await new OneClickDeployPage(page).deployIn('OpenCTI');

      // OpenCTI gets a token from XTM Hub, downloads the dashboard, imports it and opens it.
      await expect(
        openctiTab.getByText('Dashboard successfully imported')
      ).toBeVisible();
      await expect(
        openctiTab.getByRole('heading', {
          name: DEPLOYABLE_JSON_FILE.dashboardName,
        })
      ).toBeVisible();
    });
  });
});

const NEWS_FEED_DASHBOARD = {
  name: 'e2e news feed dashboard',
  shortDescription: 'A dashboard announced in the OpenCTI news feed',
  version: '1.0.0',
  description: 'A dashboard published in XTM Hub while OpenCTI is connected',
};

test.describe('OpenCTI news feed', () => {
  skipWithoutPlatform(OPENCTI);

  test('should show a dashboard published in XTM Hub and open it back in XTM Hub', async ({
    page,
  }) => {
    // OpenCTI keeps the news feed of earlier attempts: a name of this attempt only.
    const dashboard = {
      ...NEWS_FEED_DASHBOARD,
      name: `${NEWS_FEED_DASHBOARD.name} ${Date.now()}`,
    };
    const platformPage = await signInToXtmHubAndPlatform(page, OPENCTI);
    // XTM Hub only announces a resource to the platforms connected when it is published.
    await platformPage.connectToXtmHub('E2E OpenCTI');

    await test.step('publish a dashboard in XTM Hub', async () => {
      const dashboardPage = new DashboardPage(page);
      await new HomePage(page).navigateTo();
      await dashboardPage.navigateToDashboardService();
      await dashboardPage.addCustomDashboard(dashboard);
    });

    const newsFeedPage = new OpenctiNewsFeedPage(page, getPlatformUrl(OPENCTI));
    await test.step('see it in the OpenCTI news feed', async () => {
      await newsFeedPage.waitForItem(dashboard.name);
    });

    await test.step('open it back in XTM Hub', async () => {
      const xtmHubTab = await newsFeedPage.openItemInXtmHub(dashboard.name);
      await expect(xtmHubTab).toHaveURL(
        /\/app\/service\/opencti_custom_dashboards\/[^/]+\/[^/?]+/
      );
      await expect(
        xtmHubTab.getByRole('heading', { name: dashboard.name })
      ).toBeVisible();
    });
  });
});
