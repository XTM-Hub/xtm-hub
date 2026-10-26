import { Page } from '@playwright/test';
import { expect } from '../../fixtures/baseFixtures';

// The XTM Hub News Feed page of a real OpenCTI.
export default class OpenctiNewsFeedPage {
  constructor(
    private page: Page,
    private openctiUrl: string
  ) {}

  getItem(title: string) {
    return this.page.getByRole('row').filter({ hasText: title });
  }

  // OpenCTI pulls the news feed from XTM Hub in a background job, not when the page opens: reload until it shows.
  // The job runs every second in the CI, and the wait must fit in what remains of the 60 s test timeout.
  async waitForItem(title: string) {
    await expect(async () => {
      await this.page.goto(`${this.openctiUrl}/dashboard/news-feed`);
      await expect(this.getItem(title)).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
  }

  // Opens the resource of a news feed item in XTM Hub, in the new tab OpenCTI opens for it.
  async openItemInXtmHub(title: string) {
    const xtmHubTabPromise = this.page.context().waitForEvent('page');
    await this.getItem(title)
      .getByRole('link', { name: 'Open in XTM Hub' })
      .click();
    const xtmHubTab = await xtmHubTabPromise;
    await xtmHubTab.waitForLoadState();
    return xtmHubTab;
  }
}
