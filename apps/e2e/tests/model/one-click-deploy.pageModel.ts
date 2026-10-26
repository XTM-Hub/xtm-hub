import { Page } from '@playwright/test';

// The "Deploy in <platform>" flow of a resource page in XTM Hub.
export default class OneClickDeployPage {
  constructor(private page: Page) {}

  getDeployButton(platformName: string) {
    return this.page
      .getByRole('button', { name: `Deploy in ${platformName}` })
      .first();
  }

  // Deploys the resource to the only connected platform and returns the platform tab it opens.
  async deployIn(platformName: string) {
    await this.getDeployButton(platformName).click();
    const platformTabPromise = this.page.waitForEvent('popup');
    await this.page.getByRole('button', { name: 'Continue' }).click();
    const platformTab = await platformTabPromise;
    await platformTab.waitForLoadState();
    return platformTab;
  }
}
