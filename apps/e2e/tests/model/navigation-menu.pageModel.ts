import { Page } from '@playwright/test';
import { expect } from '../fixtures/baseFixtures';

export default class NavigationMenu {
  constructor(private page: Page) {}

  async expandSection(sectionName: string) {
    const trigger = this.page.getByRole('button', { name: sectionName });
    // A click landing before hydration is lost, so retry until the section reports it is expanded.
    await expect(async () => {
      if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
        await trigger.click();
      }
      await expect(trigger).toHaveAttribute('aria-expanded', 'true', {
        timeout: 1_000,
      });
    }).toPass();
    return this.page.getByRole('region', { name: sectionName });
  }

  async getSectionLink(sectionName: string, linkName: string | RegExp) {
    const section = await this.expandSection(sectionName);
    return section.getByRole('link', { name: linkName });
  }
}
