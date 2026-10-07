import { Page } from '@playwright/test';
import { expect } from '../fixtures/baseFixtures';

export class CybersecuritySolutionsPage {
  constructor(private page: Page) {}

  async clickOnSignIn() {
    await this.page.getByRole('link', { name: /log in/i }).click();
  }

  async clickOnSignUp() {
    await this.page.getByRole('link', { name: /sign up/i }).click();
  }

  async navigateTo() {
    await this.page.goto('/');
  }

  async assertCurrentPage() {
    await this.page.waitForURL('/en');
    await expect(
      this.page.getByRole('heading', {
        level: 1,
        name: 'Extend and scale your XTM Platform',
      })
    ).toBeVisible();
  }
}
