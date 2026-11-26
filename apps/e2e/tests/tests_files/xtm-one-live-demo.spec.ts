import { expect, test } from '../fixtures/baseFixtures';
import { CybersecuritySolutionsPage } from '../model/cybersecurity-solutions.pageModel';
import { HomePage } from '../model/home.pageModel';
import LoginPage from '../model/login.pageModel';
import NavigationMenu from '../model/navigation-menu.pageModel';

const XTM_ONE_SECTION_NAME = 'XTM One';
const LIVE_DEMO_LINK_NAME = /Live Demo/;
const XTM_ONE_LIVE_DEMO_URL = 'https://demo.xtmone.io/login';

test.describe('XTM One Live Demo navigation link', () => {
  let cyberSecurityPage: CybersecuritySolutionsPage;
  let loginPage: LoginPage;
  let homePage: HomePage;
  let navigationMenu: NavigationMenu;

  test.beforeEach(({ page }) => {
    cyberSecurityPage = new CybersecuritySolutionsPage(page);
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);
    navigationMenu = new NavigationMenu(page);
  });

  test('should open the XTM One public demo in a new tab when clicking Live Demo in the public navigation', async () => {
    // Given
    await cyberSecurityPage.navigateTo();
    await cyberSecurityPage.assertCurrentPage();

    // When
    const liveDemoLink = await navigationMenu.getSectionLink(
      XTM_ONE_SECTION_NAME,
      LIVE_DEMO_LINK_NAME
    );

    // Then
    await expect(liveDemoLink).toHaveAttribute('href', XTM_ONE_LIVE_DEMO_URL);
    await expect(liveDemoLink).toHaveAttribute('target', '_blank');
  });

  test('should open the XTM One public demo in a new tab when clicking Live Demo in the private navigation', async () => {
    // Given
    await loginPage.navigateToAndLogin();
    await homePage.assertCurrentPage();

    // When
    const liveDemoLink = await navigationMenu.getSectionLink(
      XTM_ONE_SECTION_NAME,
      LIVE_DEMO_LINK_NAME
    );

    // Then
    await expect(liveDemoLink).toHaveAttribute('href', XTM_ONE_LIVE_DEMO_URL);
    await expect(liveDemoLink).toHaveAttribute('target', '_blank');
  });
});
