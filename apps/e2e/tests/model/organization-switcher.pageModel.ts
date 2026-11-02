import { Page } from '@playwright/test';

export default class OrganizationSwitcherPage {
  constructor(private page: Page) {}

  async switchTo(organizationName: string) {
    await this.page
      .getByRole('combobox', { name: 'Select an organization' })
      .click();
    // Switching reloads the whole app on /app, usually the URL already shown:
    // wait for the new page to load, or the next actions hit the old one
    await Promise.all([
      this.page.waitForEvent('load'),
      this.page
        .getByRole('option', { name: organizationName, exact: true })
        .click(),
    ]);
  }
}
