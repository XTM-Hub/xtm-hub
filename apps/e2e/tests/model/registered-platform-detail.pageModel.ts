import { Page } from '@playwright/test';
import { expect } from '../fixtures/baseFixtures';

// The Hub page of a registered platform: /app/service/<identifier>_registration/<id>.
export default class RegisteredPlatformDetailPage {
  constructor(private page: Page) {}

  async assertCurrentPage(serviceDefinitionIdentifier: string) {
    await expect(this.page).toHaveURL(
      new RegExp(`/app/service/${serviceDefinitionIdentifier}/`)
    );
  }

  getAccessLink(platformName: string) {
    return this.page.getByRole('link', { name: `Access ${platformName}` });
  }

  getXtmSectionTitle() {
    return this.page.getByRole('heading', {
      level: 2,
      name: 'Your eXtended Threat Management (XTM) Platform',
    });
  }

  // The left menu's section titles are level 3 headings too.
  getProductCard(productName: string) {
    return this.page.getByRole('main').getByRole('heading', {
      level: 3,
      name: productName,
      exact: true,
    });
  }

  getQuickStartLink(name: string | RegExp) {
    return this.page.getByRole('link', { name });
  }
}
