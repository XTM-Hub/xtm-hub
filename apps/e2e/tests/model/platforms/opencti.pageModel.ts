import { Locator, Page } from '@playwright/test';

// Screens of a real OpenCTI reached from, or leading to, XTM Hub.
export default class OpenctiPage {
  constructor(
    private page: Page,
    private openctiUrl: string
  ) {}

  async navigateTo(path: string) {
    await this.page.goto(`${this.openctiUrl}${path}`);
  }

  getText(text: string) {
    return this.page.getByText(text, { exact: true });
  }

  getNameField() {
    return this.page.getByRole('textbox', { name: /^Name\s*\*?$/ });
  }

  getCreateButton() {
    return this.page.getByRole('button', { name: 'Create', exact: true });
  }

  getImportFromHubLink() {
    return this.page.getByRole('link', { name: 'Import from Hub' });
  }

  // On Integrations > Available, one per built-in integration XTM Hub can provide.
  getImportFromHubButtons() {
    return this.page.getByRole('button', { name: 'Import from Hub' });
  }

  getBrowseMoreLink() {
    return this.page.getByRole('link', { name: 'Browse More' });
  }

  getGoToTheHubLink() {
    return this.page.getByRole('link', { name: 'Go to the Hub' });
  }

  // Clicks a link to XTM Hub and returns the new tab OpenCTI opens for it.
  async openXtmHubTab(link: Locator) {
    const xtmHubTabPromise = this.page.context().waitForEvent('page');
    await link.click();
    const xtmHubTab = await xtmHubTabPromise;
    await xtmHubTab.waitForLoadState();
    return xtmHubTab;
  }
}
