import { Page } from '@playwright/test';
import { selectSolutionCategories, selectUseCase } from './common';

const TEST_JSON_FILE = {
  path: './tests/tests_files/assets/octi_csv_feed.json',
  name: 'octi_csv_feed.json',
};
const TEST_IMAGE_FILE = {
  path: './tests/tests_files/assets/test.png',
  name: 'test.png',
};

export default class IntegrationPage {
  constructor(private page: Page) {}

  async navigateToIntegrationsService() {
    await this.page.getByRole('button', { name: 'OpenCTI' }).click();
    const integrationsLink = this.page.getByRole('link', {
      name: 'Integrations',
    });
    await integrationsLink.waitFor({ state: 'visible' });
    await integrationsLink.click();
    await this.page.waitForURL(/\/app\/service\/opencti_integrations\//);
  }

  getIntegrationCard(name: string) {
    return this.page.getByRole('listitem').filter({
      has: this.page.getByText(name, { exact: true }),
    });
  }
  async uploadJsonDocument(filePath: string) {
    const fileInput = this.page.locator(
      'input[type="file"][accept*="application/json"]'
    );
    await fileInput.setInputFiles(filePath);
  }

  async uploadImageDocument(filePath: string) {
    const fileInput = this.page.locator(
      'input[type="file"][accept="image/jpeg, image/png"]'
    );
    await fileInput.setInputFiles(filePath);
  }

  async fillTaxiiFeed({
    name,
    shortDescription,
    description,
  }: {
    name: string;
    shortDescription: string;
    description: string;
  }) {
    await this.page
      .getByRole('button', { name: 'Add new Integration' })
      .click();
    await this.page.getByRole('menuitem', { name: 'TAXII Feeds' }).click();
    await this.page
      .getByRole('textbox', { name: 'Name', exact: true })
      .fill(name);
    await this.page
      .getByRole('textbox', { name: 'Short Description' })
      .fill(shortDescription);
    await this.page
      .getByRole('textbox', { name: 'This is a paragraph to' })
      .fill(description);
    await this.page
      .getByRole('checkbox', { name: 'Is the TAXII Feed published?' })
      .click();
    await this.uploadJsonDocument(TEST_JSON_FILE.path);
    await this.uploadImageDocument(TEST_IMAGE_FILE.path);
    await selectUseCase(this.page);
    await selectSolutionCategories(this.page);
    await this.page.getByRole('radio', { name: 'Commercial' }).click();
    await this.page.getByRole('button', { name: 'Validate' }).click();
  }
  async fillRssFeed({
    name,
    shortDescription,
    description,
  }: {
    name: string;
    shortDescription: string;
    description: string;
  }) {
    await this.page
      .getByRole('button', { name: 'Add new Integration' })
      .click();
    await this.page.getByRole('menuitem', { name: 'RSS Feeds' }).click();
    await this.page
      .getByRole('textbox', { name: 'Name', exact: true })
      .fill(name);
    await this.page
      .getByRole('textbox', { name: 'Short Description' })
      .fill(shortDescription);
    await this.page
      .getByRole('textbox', { name: 'This is a paragraph to' })
      .fill(description);
    await this.uploadJsonDocument(TEST_JSON_FILE.path);
    await this.uploadImageDocument(TEST_IMAGE_FILE.path);
    await selectUseCase(this.page);
    await selectSolutionCategories(this.page);
    await this.page.getByRole('radio', { name: 'Commercial' }).click();
    await this.page.getByRole('button', { name: 'Validate' }).click();
  }

  async fillStream({
    name,
    shortDescription,
    description,
  }: {
    name: string;
    shortDescription: string;
    description: string;
  }) {
    await this.page
      .getByRole('button', { name: 'Add new Integration' })
      .click();
    await this.page.getByRole('menuitem', { name: 'OpenCTI Streams' }).click();
    await this.page
      .getByRole('textbox', { name: 'Name', exact: true })
      .fill(name);
    await this.page
      .getByRole('textbox', { name: 'Short Description' })
      .fill(shortDescription);
    await this.page
      .getByRole('textbox', { name: 'This is a paragraph to' })
      .fill(description);
    await this.page
      .getByRole('checkbox', { name: 'Is the Stream published?' })
      .click();
    await this.uploadJsonDocument(TEST_JSON_FILE.path);
    await this.uploadImageDocument(TEST_IMAGE_FILE.path);
    await selectUseCase(this.page);
    await selectSolutionCategories(this.page);
    await this.page.getByRole('radio', { name: 'Commercial' }).click();
    await this.page.getByRole('button', { name: 'Validate' }).click();
  }
  async fillCsvFeed({
    name,
    shortDescription,
    description,
  }: {
    name: string;
    shortDescription: string;
    description: string;
  }) {
    await this.page
      .getByRole('button', { name: 'Add new Integration' })
      .click();
    await this.page.getByRole('menuitem', { name: 'CSV Feeds' }).click();
    await this.page
      .getByRole('textbox', { name: 'Name', exact: true })
      .fill(name);
    await this.page
      .getByRole('textbox', { name: 'Short Description' })
      .fill(shortDescription);
    await this.page
      .getByRole('textbox', { name: 'This is a paragraph to' })
      .fill(description);
    await this.page
      .getByRole('checkbox', { name: 'Is the CSV Feed published?' })
      .click();
    await this.uploadJsonDocument(TEST_JSON_FILE.path);
    await this.uploadImageDocument(TEST_IMAGE_FILE.path);
    await selectUseCase(this.page);
    await selectSolutionCategories(this.page);
    await this.page.getByRole('radio', { name: 'Commercial' }).click();
    await this.page.getByRole('button', { name: 'Validate' }).click();
  }

  async fillThirdPartyIntegration({
    name,
    shortDescription,
    description,
  }: {
    name: string;
    shortDescription: string;
    description: string;
  }) {
    await this.page
      .getByRole('button', { name: 'Add new Integration' })
      .click();
    await this.page
      .getByRole('menuitem', { name: 'Third party integration' })
      .click();
    await this.page
      .getByRole('textbox', { name: 'Name', exact: true })
      .fill(name);
    await this.page
      .getByRole('textbox', { name: 'Short Description' })
      .fill(shortDescription);
    await this.page
      .getByRole('textbox', { name: 'This is a paragraph to' })
      .fill(description);
    await this.page
      .getByRole('checkbox', {
        name: 'Is the Third party integration published?',
      })
      .click();
    await this.page
      .getByRole('textbox', { name: 'Vendor link (url)' })
      .fill('https://example.com');
    await this.page
      .getByRole('textbox', { name: 'Github link (url)' })
      .fill('https://text.com');
    await this.page
      .getByRole('textbox', { name: 'OpenCTI compatibility version' })
      .fill('1.2.3');
    await this.uploadImageDocument(TEST_IMAGE_FILE.path);
    await selectUseCase(this.page);
    await selectSolutionCategories(this.page);
    await this.page.getByRole('radio', { name: 'Commercial' }).click();
    await this.page.getByRole('button', { name: 'Validate' }).click();
  }

  async navigateToIntegration(shortDescription: string) {
    await this.page.getByRole('link', { name: shortDescription }).click();
  }

  async deleteIntegration(deleteButtonRole: 'menuitem' | 'button') {
    if (deleteButtonRole === 'menuitem') {
      const menu = this.page.getByRole('menu').last();
      await menu.waitFor({ state: 'visible' });
      await menu.getByRole('menuitem', { name: 'Delete' }).click();
    } else {
      await this.page.getByRole('button', { name: 'Delete' }).first().click();
    }

    await this.page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Delete' })
      .click();
  }
}
