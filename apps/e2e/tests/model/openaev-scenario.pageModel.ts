import { Page } from '@playwright/test';
import { selectUseCase, waitForDrawerToClose } from './common';
import { TEST_IMAGE_FILE } from './dashboard.pageModel';

// A real OpenAEV scenario export, that a real OpenAEV accepts to import.
export const DEPLOYABLE_SCENARIO_FILE = {
  path: './tests/tests_files/assets/oaev_scenario_deployable.zip',
  name: 'oaev_scenario_deployable.zip',
  scenarioName: 'E2E deployed scenario',
};

export default class OpenaevScenarioPage {
  constructor(private page: Page) {}

  async navigateToScenarioService() {
    await this.page.getByRole('button', { name: 'OpenAEV' }).click();
    await this.page.getByRole('link', { name: 'Scenarios' }).click();
  }

  async addScenario({
    name,
    shortDescription,
    version,
    description,
  }: {
    name: string;
    shortDescription: string;
    version: string;
    description: string;
  }) {
    await this.page.getByRole('button', { name: 'Add new scenario' }).click();
    await this.page.getByPlaceholder('Scenario name').fill(name);
    await this.page
      .getByPlaceholder('This is some catchphrases to')
      .fill(shortDescription);
    await this.page.getByPlaceholder('1.0.0').fill(version);
    await this.page
      .getByRole('textbox', { name: 'This is a paragraph to' })
      .fill(description);
    await this.page.getByLabel('Publish').click();
    await this.page
      .locator('input[type="file"][accept*="zip"]')
      .setInputFiles(DEPLOYABLE_SCENARIO_FILE.path);
    await this.page
      .locator('input[type="file"][accept="image/jpeg, image/png"]')
      .setInputFiles(TEST_IMAGE_FILE.path);
    await selectUseCase(this.page);
    await this.page.getByRole('button', { name: 'Validate' }).click();
    await waitForDrawerToClose(this.page);
  }

  async navigateToScenario(shortDescription: string) {
    await this.page.getByRole('link', { name: shortDescription }).click();
  }
}
