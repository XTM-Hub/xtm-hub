import { Page } from '@playwright/test';

export default class LoginPage {
  constructor(private page: Page) {}

  getLoginInput() {
    return this.page.getByPlaceholder('email');
  }

  async fillLoginInput(input: string) {
    await this.getLoginInput().click();
    return this.getLoginInput().fill(input);
  }

  async fillPasswordInput(input: string) {
    await this.getPasswordInput().click();
    return this.getPasswordInput().fill(input);
  }

  getPasswordInput() {
    return this.page.getByPlaceholder('password');
  }

  getSignInButton() {
    return this.page.getByRole('button', { name: 'Sign in' });
  }

  async navigateTo() {
    await this.page.goto('/login');
  }
  async navigateToPublicPages() {
    await this.page.goto('/en/cybersecurity-solutions');
  }

  async navigateToAndLogin(userEmail = 'admin@filigran.io') {
    await this.navigateTo();
    return this.login(userEmail);
  }

  async login(userEmail = 'admin@filigran.io') {
    await this.fillLoginInput(userEmail);
    await this.fillPasswordInput('admin');
    return this.getSignInButton().click();
  }

  async logout() {
    await this.page.getByRole('button', { name: 'Open menu user' }).click();
    await this.page.getByRole('menuitem', { name: 'Log out' }).click();
    await this.page.waitForURL('/en');
  }

  async assertCurrentPage() {
    await this.page.waitForURL('**/login**', { timeout: 3000 });
  }
}
