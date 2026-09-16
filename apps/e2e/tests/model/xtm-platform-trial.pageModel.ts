import { Page } from '@playwright/test';
import { expect } from '../fixtures/baseFixtures';

export default class XtmPlatformTrialPage {
  constructor(private page: Page) {}

  async navigateTo() {
    await this.page.goto('/app/service/xtm-platform-trial');
  }

  async navigateToManageTrials() {
    await this.page.goto('/app/admin/manage-trials');
  }

  private getEmptySelect(placeholder: string) {
    return this.page
      .getByRole('combobox')
      .filter({ hasText: placeholder })
      .first();
  }

  private async selectOption(placeholder: string, optionName: string) {
    await this.getEmptySelect(placeholder).click();
    await this.page
      .getByRole('option', { name: optionName, exact: true })
      .click();
  }

  getProductCheckbox(platformIdentifier: string) {
    return this.page.locator(`#product-${platformIdentifier}`);
  }

  getStatusProductCheckbox(platformIdentifier: string) {
    return this.page.locator(`#status-product-${platformIdentifier}`);
  }

  async requestBundleTrial() {
    // OpenCTI, OpenAEV and XTM One are pre-selected by the form, and XTM One
    // is mandatory in a bundle so its checkbox cannot be unticked
    await expect(this.getProductCheckbox('opencti')).toBeChecked();
    await expect(this.getProductCheckbox('openaev')).toBeChecked();
    await expect(this.getProductCheckbox('xtmone')).toBeChecked();
    await expect(this.getProductCheckbox('xtmone')).toBeDisabled();

    await this.selectOption(
      'Select your preferred region for hosting',
      'Europe West'
    );
    await this.selectOption('Select your job title', 'CISO/CSO/CIO');
    await this.selectOption(
      'Select your activity sector',
      'Financial Services'
    );
    // The two use case selects share the same placeholder, OpenCTI comes first
    await this.selectOption('Select your use case', 'Threat Hunting');
    await this.selectOption('Select your use case', 'Run penetration testing');

    await this.page.locator('#acceptTerms').click();
    await this.page
      .getByRole('button', { name: 'Request XTM Platform trial' })
      .click();
  }

  async cancelTrial(
    cancelButtonName: string,
    reason = 'Incompatible with our existing security stack'
  ) {
    await this.page.getByRole('button', { name: cancelButtonName }).click();

    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText('Are you sure you wish to cancel this trial ?')
    ).toBeVisible();
    await expect(
      dialog.getByText(
        'Once cancelled, you will not be able to request a new trial'
      )
    ).toBeVisible();

    await dialog.getByRole('combobox').click();
    await this.page.getByRole('option', { name: reason, exact: true }).click();

    const confirmButton = dialog.getByRole('button', { name: 'Confirm' });
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();
  }
}
