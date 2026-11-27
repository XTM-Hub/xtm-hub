import { Page } from '@playwright/test';
import { expect } from '../fixtures/baseFixtures';

// Settings › Management › Registered platforms, for platform admins: every registration, whatever its organization.
export default class AdminRegisteredPlatformsPage {
  constructor(private page: Page) {}

  async navigateTo() {
    await this.page.goto('/app/admin/registered-platforms');
    await expect(
      this.page.getByRole('heading', { level: 1, name: 'Registered platforms' })
    ).toBeAttached();
  }

  async search(term: string) {
    await this.page
      .getByRole('searchbox', {
        name: 'Search by title, URL, organization, email or ID',
      })
      .fill(term);
  }

  getRow(platformTitle: string) {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByText(platformTitle, { exact: true }) });
  }

  getStatus(platformTitle: string, status: 'Active' | 'Inactive') {
    return this.getRow(platformTitle).getByText(status, { exact: true });
  }

  getUnregisterButton(platformTitle: string) {
    return this.getRow(platformTitle).getByRole('button', {
      name: 'Unregister',
      exact: true,
    });
  }

  async unregister(platformTitle: string) {
    await this.getUnregisterButton(platformTitle).click();
    const dialog = this.page.getByRole('alertdialog');
    await expect(dialog).toContainText(
      `Unregister the platform "${platformTitle}"?`
    );
    await dialog
      .getByRole('button', { name: 'Unregister', exact: true })
      .click();
  }

  getUnregisterSuccess(platformTitle: string) {
    // Exact text on purpose: while the toast is announced, a status region also holds this
    // message after "Notification", and a substring match would resolve to both elements.
    return this.page.getByText(
      `The platform "${platformTitle}" has been unregistered`,
      { exact: true }
    );
  }
}
