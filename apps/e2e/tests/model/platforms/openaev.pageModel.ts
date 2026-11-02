import { Locator, Page } from '@playwright/test';

// OpenAEV prefixes its routes with the tenant: this is the id of its default tenant.
const OPENAEV_DEFAULT_TENANT_PATH = '/2cffad3a-0001-4078-b0e2-ef74274022c3';

// Screens of a real OpenAEV leading to XTM Hub.
export default class OpenaevPage {
  constructor(
    private page: Page,
    private openaevUrl: string
  ) {}

  async navigateTo(adminPath: string) {
    await this.page.goto(
      `${this.openaevUrl}${OPENAEV_DEFAULT_TENANT_PATH}/admin${adminPath}`
    );
  }

  getImportFromHubLink() {
    return this.page.getByRole('link', { name: 'Import from Hub' });
  }

  getXtmHubLibraryLinks() {
    return this.page.getByRole('link', { name: /XTM Hub Library/ });
  }

  getExploreXtmHubLink() {
    return this.page.getByRole('link', { name: 'Explore XTM Hub' });
  }

  getGoToTheHubLink() {
    return this.page.getByRole('link', { name: 'Go to the Hub' });
  }

  async openProductSwitcher() {
    await this.page
      .getByRole('button', { name: 'Filigran products' })
      .first()
      .click();
  }

  // Not connected: leads to OpenAEV's own connection flow. Connected: opens XTM Hub in a new tab.
  getXtmHubProduct() {
    return this.page
      .getByRole('menu', { name: 'Filigran products' })
      .getByRole('menuitem', { name: /^XTM Hub/ });
  }

  getAuthorizeConnectionDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ hasText: 'Allow OpenAEV to connect with XTM Hub' });
  }

  // Clicks a link or button opening XTM Hub and returns the new tab OpenAEV opens for it.
  async openXtmHubTab(target: Locator) {
    const xtmHubTabPromise = this.page.context().waitForEvent('page');
    await target.click();
    const xtmHubTab = await xtmHubTabPromise;
    await xtmHubTab.waitForLoadState();
    return xtmHubTab;
  }
}
