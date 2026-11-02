import { Page } from '@playwright/test';
import { selectUseCase, waitForDrawerToClose } from './common';
import { TEST_IMAGE_FILE } from './dashboard.pageModel';

// OpenCTI resources of XTM Hub other than dashboards and integrations, with the exports OpenCTI accepts to import.
export const OPENCTI_RESOURCES = {
  customView: {
    menuLink: 'Custom Views',
    addButton: 'Add new custom view',
    namePlaceholder: 'Custom View name',
    path: './tests/tests_files/assets/octi_custom_view_deployable.json',
    importedName: 'E2E deployed custom view',
  },
  playbook: {
    menuLink: 'Playbooks',
    addButton: 'Add new playbook',
    namePlaceholder: 'Playbook name',
    path: './tests/tests_files/assets/octi_playbook.json',
    importedName: 'E2E playbook',
  },
} as const;
export type OpenctiResourceKind = keyof typeof OPENCTI_RESOURCES;

export default class OpenctiResourcePage {
  constructor(
    private page: Page,
    private kind: OpenctiResourceKind
  ) {}

  async navigateToService() {
    await this.page.getByRole('button', { name: 'OpenCTI' }).click();
    const link = this.page.getByRole('link', {
      name: OPENCTI_RESOURCES[this.kind].menuLink,
    });
    await link.waitFor({ state: 'visible' });
    await link.click();
  }

  async addResource({
    name,
    shortDescription,
    version,
    description,
    entityType,
  }: {
    name: string;
    shortDescription: string;
    version: string;
    description: string;
    // Custom views only: the entity type OpenCTI attaches the view to.
    entityType?: string;
  }) {
    const resource = OPENCTI_RESOURCES[this.kind];
    await this.page.getByRole('button', { name: resource.addButton }).click();
    await this.page.getByPlaceholder(resource.namePlaceholder).fill(name);
    await this.page
      .getByPlaceholder('This is some catchphrases to')
      .fill(shortDescription);
    await this.page.getByPlaceholder('1.0.0').fill(version);
    await this.page
      .getByRole('textbox', { name: 'This is a paragraph to' })
      .fill(description);
    await this.page.getByLabel('Publish').click();
    await this.page
      .locator('input[type="file"][accept*="application/json"]')
      .setInputFiles(resource.path);
    await this.page
      .locator('input[type="file"][accept="image/jpeg, image/png"]')
      .setInputFiles(TEST_IMAGE_FILE.path);
    await selectUseCase(this.page);
    if (entityType) {
      await this.page
        .getByRole('combobox', { name: 'Entity types', exact: true })
        .click();
      await this.page
        .getByRole('option', { name: entityType, exact: true })
        .click();
      await this.page.keyboard.press('Escape');
    }
    await this.page.getByRole('button', { name: 'Validate' }).click();
    await waitForDrawerToClose(this.page);
  }

  async navigateToResource(shortDescription: string) {
    await this.page.getByRole('link', { name: shortDescription }).click();
  }
}
