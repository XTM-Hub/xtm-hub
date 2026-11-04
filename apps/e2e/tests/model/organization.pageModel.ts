import { Page } from '@playwright/test';
import { expect } from '../fixtures/baseFixtures';

export default class OrganizationPage {
  constructor(private page: Page) {}

  async navigateToOrgaAdmin() {
    await this.page
      .getByRole('button', { name: 'Settings', exact: true })
      .click();
    const organizationLink = this.page.getByRole('link', {
      name: 'Organization',
    });
    await expect(organizationLink).toBeVisible();
    await organizationLink.click();
    await expect(this.page.getByRole('heading', { level: 1 })).toContainText(
      'Organization'
    );
  }

  async createOrganization(
    organizationName: string,
    organizationDomain: string
  ) {
    await this.page
      .getByRole('button', { name: 'Create Organization' })
      .click();
    await this.page.getByPlaceholder('Name').fill(organizationName);
    await this.page.getByPlaceholder('Add a domain').click();
    await this.page.getByPlaceholder('Add a domain').fill(organizationDomain);
    await this.page.getByPlaceholder('Add a domain').press('Enter');

    await this.page.getByRole('button', { name: 'Validate' }).click();
  }

  async editOrganization(
    organizationName: string,
    organizationDomain: string,
    organizationNewName: string
  ) {
    await this.page
      .getByRole('row', {
        name: `${organizationName} ${organizationDomain} Open`,
      })
      .getByRole('button')
      .click();
    await this.page.getByRole('menuitem', { name: 'Update' }).click();
    await this.page.getByPlaceholder('Name').fill(organizationNewName);

    await this.page.getByRole('button', { name: 'Validate' }).click();
  }

  async deleteOrganization(
    organizationName: string,
    organizationDomain: string
  ) {
    await this.page
      .getByRole('row', {
        name: `${organizationName} ${organizationDomain} Open`,
      })
      .getByRole('button')
      .click();
    await this.page.getByRole('menuitem', { name: 'Delete' }).click();

    await this.page.getByRole('button', { name: 'Delete' }).click();
  }
}
