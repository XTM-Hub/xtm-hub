import { Page } from '@playwright/test';
import {
  clickRowAction,
  waitForDrawerToClose,
  waitForDrawerToOpen,
} from './common';
import { expect } from '../fixtures/baseFixtures';

export default class ServicePage {
  constructor(private page: Page) {}

  private getActiveDrawer() {
    return this.page.locator('body > [role="dialog"]').last();
  }

  async navigateToServiceListAdmin() {
    await this.page
      .getByRole('button', { name: 'Settings', exact: true })
      .click();
    await this.page.getByRole('link', { name: 'Service', exact: true }).click();
    await this.page.getByText('Name', { exact: true }).click();
  }

  async navigateToServiceItemAdmin(
    serviceName: string = 'OpenCTI Integrations Library'
  ) {
    await clickRowAction(
      this.page,
      this.page.getByRole('row', { name: serviceName }),
      'Manage'
    );
  }

  async addOrganizationIntoService(organizationName: string) {
    await this.page
      .getByRole('button', { name: 'Subscribe organization' })
      .click();

    const drawer = this.page.locator('body > [role="dialog"]').last();
    await expect(drawer).toBeVisible();

    await drawer.getByRole('button', { name: 'Organization' }).click();
    const organizationOption = this.page
      .getByRole('listbox', { name: /Suggestions/i })
      .getByRole('option', { name: organizationName, exact: true });
    await expect(organizationOption).toBeVisible();
    await organizationOption.click();
    await this.page.keyboard.press('Escape');

    const validateButton = drawer.getByRole('button', { name: 'Validate' });
    await expect(validateButton).toBeEnabled();
    await validateButton.click();
    await waitForDrawerToClose(this.page);
  }
  async addOrganizationIntoServiceWithCapabilities(organizationName: string) {
    await this.page
      .getByRole('button', { name: 'Subscribe organization' })
      .click();

    const drawer = this.page.locator('body > [role="dialog"]').last();
    await expect(drawer).toBeVisible();

    await drawer.getByRole('button', { name: 'Organization' }).click();
    const organizationOption = this.page
      .getByRole('listbox', { name: /Suggestions/i })
      .getByRole('option', { name: organizationName, exact: true });
    await expect(organizationOption).toBeVisible();
    await organizationOption.click();
    await this.page.keyboard.press('Escape');
    await drawer.getByRole('checkbox', { name: 'DELETE access:' }).click();
    await drawer.getByRole('checkbox', { name: 'UPLOAD access:' }).click();

    const validateButton = drawer.getByRole('button', { name: 'Validate' });
    await expect(validateButton).toBeEnabled();
    await validateButton.click();
    await waitForDrawerToClose(this.page);
  }

  async addUserIntoService(userEmail: string) {
    await this.page.getByRole('button', { name: 'Invite user' }).click();
    await this.page.getByRole('button', { name: 'Email' }).click();
    await this.page.getByPlaceholder('Search...').click();
    await this.page.getByPlaceholder('Search...').fill(userEmail);
    await this.page.getByText(userEmail).click();
    await this.page.getByRole('button', { name: 'Email' }).click();
    await this.page.getByRole('dialog').nth(1).press('Enter');
    await this.page.getByLabel('Manage access').click();
    await this.page.getByRole('button', { name: 'Validate' }).click();
    await waitForDrawerToClose(this.page);
  }

  async addUserIntoServiceWithCapability(
    userEmail: string,
    capability: string
  ) {
    await this.page.getByRole('button', { name: 'Invite user' }).click();
    await this.page.getByRole('button', { name: 'Email' }).click();
    await this.page.getByPlaceholder('Search...').click();
    await this.page.getByPlaceholder('Search...').fill('use');
    await this.page.getByText(userEmail).click();
    await this.page.getByRole('button', { name: 'Email' }).click();
    await this.page.getByRole('dialog').nth(1).press('Enter');
    await this.page.getByLabel(capability).click();
    await this.page.getByRole('button', { name: 'Validate' }).click();
    await waitForDrawerToClose(this.page);
  }

  async editUsersRightsForService(
    userEmail: string,
    newCapability: string = 'Manage access'
  ) {
    await clickRowAction(
      this.page,
      this.page.getByRole('row', { name: userEmail }),
      'Update'
    );
    await waitForDrawerToOpen(this.page);

    await this.page.getByLabel(newCapability).click();
    await this.page.getByRole('button', { name: 'Validate' }).click();
    await waitForDrawerToClose(this.page);
  }

  async deleteOrganizationFromService(organizationName: string = 'Thales') {
    await this.page.waitForTimeout(2000);
    const row = this.page.getByRole('row', { name: organizationName });
    await clickRowAction(this.page, row, 'Delete');
    // Wait for the dialog to appear and animation to finish
    await this.page.getByRole('button', { name: 'Remove access' }).click();
  }

  async addPictureService(
    firstPathName: string,
    secondPathName: string,
    serviceName: string = 'Filigran Academy'
  ) {
    await this.page
      .getByRole('row', { name: serviceName })
      .getByRole('button')
      .click();
    await this.page.getByRole('menuitem', { name: 'Pictures' }).click();
    const fileInputIllustration = this.page
      .locator('input[type="file"]')
      .nth(0);

    await fileInputIllustration.setInputFiles(firstPathName);
    const fileInputLogo = this.page.locator('input[type="file"]').nth(1);
    await fileInputLogo.setInputFiles(secondPathName);
    await this.page.getByRole('button', { name: 'Validate' }).click();
  }
}
