import { expect, Locator, Page } from '@playwright/test';

const TEST_IMAGE_FILE = {
  path: './tests/tests_files/assets/test.png',
  name: 'test.png',
};
export default class XTMPlatformRoadmapPage {
  constructor(private page: Page) {}

  private async openForm() {
    const form = this.page.locator('body > [role="dialog"]').last();
    await expect(form).toBeVisible();
    return form;
  }

  private async waitForFormToClose() {
    await expect(this.page.locator('body > [role="dialog"]')).toHaveCount(0);
  }

  async openEpicDetail(title: string) {
    await this.page.getByText(title).click();
    return this.openForm();
  }

  async closeEpicDetail() {
    await this.page.keyboard.press('Escape');
    await this.waitForFormToClose();
  }

  private async selectProducts(form: Locator, products: string[]) {
    await form.getByLabel('Clear all selections').click();
    await form.locator('button').filter({ hasText: 'Product' }).click();
    for (const product of products) {
      const option = this.page.getByRole('option', {
        name: product,
        exact: true,
      });
      await expect(option).toBeVisible();
      await option.click();
    }
    await this.page.keyboard.press('Escape');
  }

  async filterByProducts(products: string[]) {
    const list = this.page.locator('main');
    const clearAll = list.getByLabel('Clear all selections');
    if (await clearAll.isVisible()) {
      await clearAll.click();
    }
    await list
      .locator('button')
      .filter({ hasText: 'Filter by product' })
      .click();
    for (const product of products) {
      const option = this.page.getByRole('option', { name: product });
      await expect(option).toBeVisible();
      await option.click();
    }
    await this.page.keyboard.press('Escape');
  }

  private async selectTimeline(form: Locator, timeline: string) {
    await form.getByRole('combobox', { name: 'Timeline' }).click();
    const option = this.page.getByRole('option', {
      name: timeline,
      exact: true,
    });
    await expect(option).toBeVisible();
    await option.click();
  }

  private async fillSlackLink(
    form: Locator,
    {
      slackLinkOption,
      slackLink,
    }: {
      slackLinkOption?: string;
      slackLink?: string;
    }
  ) {
    const field = form.getByRole('combobox', { name: 'Slack link' });
    if (slackLinkOption) {
      await field.click();
      const option = this.page
        .getByRole('listbox', { name: 'Slack link' })
        .getByRole('option', { name: slackLinkOption, exact: false });
      await expect(option).toBeVisible();
      await option.click();
      return;
    }
    if (slackLink) {
      await field.fill(slackLink);
      await this.page.keyboard.press('Escape');
    }
  }

  async addEpic({
    title,
    short_description,
    description,
    products = ['OpenCTI'],
    timeline = 'Now',
    integration = false,
    draft = true,
    edition_type = 'CE',
    slackLinkOption,
    slackLink,
  }: {
    title: string;
    short_description: string;
    description: string;
    products?: string[];
    timeline?: string;
    integration?: boolean;
    draft?: boolean;
    edition_type?: string;
    slackLinkOption?: string;
    slackLink?: string;
  }) {
    await this.page
      .locator('main')
      .getByRole('button', { name: 'Create' })
      .click();
    const form = await this.openForm();
    await form.getByRole('textbox', { name: 'Title' }).fill(title);
    await form
      .getByRole('textbox', { name: 'Short description' })
      .fill(short_description);
    await form
      .getByRole('textbox', { name: 'This is a paragraph to' })
      .fill(description);
    await this.selectProducts(form, products);
    await this.fillSlackLink(form, { slackLinkOption, slackLink });
    await form.getByRole('radio', { name: edition_type, exact: true }).click();
    await this.selectTimeline(form, timeline);
    if (!draft) {
      await form.getByRole('checkbox', { name: 'Active' }).check();
    }
    if (integration) {
      await form.getByRole('checkbox', { name: 'Is an integration' }).click();
      await this.uploadImageDocument(TEST_IMAGE_FILE.path);
    }
    await form.getByRole('button', { name: 'Create' }).click();
    await this.waitForFormToClose();
  }

  async deleteEpic() {
    await this.page
      .getByRole('button', { name: 'Open menu', exact: true })
      .click();
    await this.page.getByRole('menuitem', { name: 'Delete' }).click();
    await this.page.getByRole('button', { name: 'Delete' }).click();
  }

  async updateEpic({
    title,
    short_description,
    description,
    products,
    timeline,
    draft,
    edition_type,
    slackLinkOption,
    slackLink,
  }: {
    title?: string;
    short_description?: string;
    description?: string;
    products?: string[];
    timeline?: string;
    draft: boolean;
    edition_type?: string;
    slackLinkOption?: string;
    slackLink?: string;
  }) {
    await this.page
      .getByRole('button', { name: 'Open menu', exact: true })
      .click();
    await this.page.getByRole('menuitem', { name: 'Update' }).click();
    const form = await this.openForm();
    if (title) await form.getByRole('textbox', { name: 'Title' }).fill(title);
    if (short_description)
      await form
        .getByRole('textbox', { name: 'Short description' })
        .fill(short_description);
    if (description)
      await form
        .getByRole('textbox', { name: 'This is a paragraph to' })
        .fill(description);
    if (products) {
      await this.selectProducts(form, products);
    }
    await this.fillSlackLink(form, { slackLinkOption, slackLink });
    if (edition_type) {
      await form
        .getByRole('radio', { name: edition_type, exact: true })
        .click();
    }
    if (timeline) {
      await this.selectTimeline(form, timeline);
    }
    const publishedCheckbox = form.getByRole('checkbox', {
      name: 'Is this EPIC published? (By default your EPIC is in draft mode)',
    });
    if (!draft) {
      await publishedCheckbox.check();
    }
    if (draft) {
      await publishedCheckbox.uncheck();
    }
    await form.getByRole('button', { name: 'Update' }).click();
    await this.waitForFormToClose();
  }

  async uploadImageDocument(filePath: string) {
    await this.page.locator('input[type="file"]').setInputFiles(filePath);
  }

  async navigateToService() {
    const link = this.page.getByRole('link', { name: 'XTM Platform Roadmap' });
    await link.first().scrollIntoViewIfNeeded();
    await link.first().click();
  }
}
