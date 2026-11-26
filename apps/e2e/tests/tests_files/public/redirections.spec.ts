import { expect, test } from '../../fixtures/baseFixtures';
import LoginPage from '../../model/login.pageModel';
import { CybersecuritySolutionsPage } from '../../model/cybersecurity-solutions.pageModel';
import { HomePage } from '../../model/home.pageModel';
import UserPage from '../../model/user.pageModel';

test.describe('Public redirections', () => {
  let cyberSecurityPage: CybersecuritySolutionsPage;
  let loginPage: LoginPage;
  let homePage: HomePage;
  let userPage: UserPage;

  test.beforeEach(({ page }) => {
    cyberSecurityPage = new CybersecuritySolutionsPage(page);
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);
    userPage = new UserPage(page);
  });

  test('should redirect user between public pages and login page', async ({
    page,
  }) => {
    await test.step('should redirect user to sign up page if unlogged', async () => {
      await homePage.navigateTo();
      await page.waitForURL('**/sign-up**');
      await expect(page.locator('#hubspot-form')).toBeAttached();
    });

    await test.step('should navigate user to auth provider from a public page', async () => {
      await cyberSecurityPage.navigateTo();
      await cyberSecurityPage.clickOnSignIn();
      await page.waitForURL((url) => !url.pathname.startsWith('/en'), {
        timeout: 5000,
      });
    });

    await test.step('should navigate user to sign up page from a public page', async () => {
      await cyberSecurityPage.navigateTo();
      await cyberSecurityPage.clickOnSignUp();
      await page.waitForURL('**/sign-up**');
      await expect(page.locator('#hubspot-form')).toBeAttached();
    });

    await test.step('should navigate user to login page from sign up page', async () => {
      await page.goto('/sign-up');
      await page.getByRole('link', { name: /log in with local/i }).click();
      await loginPage.assertCurrentPage();
    });

    await test.step('should log in user and redirect him to home', async () => {
      await loginPage.navigateToAndLogin();
      await homePage.assertCurrentPage();
    });

    await test.step('should let user see public pages', async () => {
      await cyberSecurityPage.navigateTo();
      await cyberSecurityPage.assertCurrentPage();
    });

    await test.step('should redirect user to public pages when user logs out', async () => {
      await homePage.navigateTo();
      await loginPage.logout();
      await cyberSecurityPage.assertCurrentPage();
    });

    await test.step('should redirect to specified page after sign in', async () => {
      const redirectParam = encodeURIComponent(btoa('/app/manage/user'));
      await page.goto(`/login?redirect=${redirectParam}`);
      await loginPage.login();
      await userPage.assertCurrentPage();
    });
  });
});
