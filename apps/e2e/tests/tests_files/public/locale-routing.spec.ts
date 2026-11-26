import { expect, test } from '../../fixtures/baseFixtures';
import LoginPage from '../../model/login.pageModel';
import ProfilePage from '../../model/profile.pageModel';

test.describe('Locale routing', () => {
  test('redirects unprefixed root to /en/', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/en\/?$/);
  });

  test.describe('with a French browser', () => {
    test.use({ locale: 'fr-FR' });

    test('redirects unprefixed root to /fr/', async ({ page }) => {
      await page.goto('/');
      await page.waitForURL(/\/fr\/?$/);
    });
  });

  test('returns 404 for unsupported locale prefix', async ({ page }) => {
    const response = await page.goto('/de/');
    expect(response?.status()).toBe(404);
  });

  test('emits canonical and hreflang on /en/ home', async ({ page }) => {
    await page.goto('/en/');

    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute('href');
    expect(canonical).toMatch(/\/en\/?$/);

    for (const locale of ['en', 'fr', 'ja'] as const) {
      const href = await page
        .locator(`link[rel="alternate"][hreflang="${locale}"]`)
        .getAttribute('href');
      expect(href).toMatch(new RegExp(`/${locale}/?$`));
    }

    const xDefault = await page
      .locator('link[rel="alternate"][hreflang="x-default"]')
      .getAttribute('href');
    expect(xDefault).toMatch(/\/en\/?$/);
  });

  test('html lang reflects the active locale', async ({ page }) => {
    await page.goto('/ja/');
    expect(await page.locator('html').getAttribute('lang')).toBe('ja');
  });

  test('logout from french preference lands on /fr/ public page', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const profilePage = new ProfilePage(page);
    await loginPage.navigateToAndLogin();
    await profilePage.navigateTo();
    await profilePage.changeLanguage('Français');
    await page
      .getByRole('button', { name: 'Ouvrir le menu utilisateur' })
      .click();
    await page.getByRole('menuitem', { name: 'Déconnexion' }).click();
    await expect(page).toHaveURL(/\/fr/);
  });

  test('language preference persists across logout/login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const profilePage = new ProfilePage(page);

    await loginPage.navigateToAndLogin();
    await profilePage.navigateTo();
    await profilePage.changeLanguage('Français');

    await page
      .getByRole('button', { name: 'Ouvrir le menu utilisateur' })
      .click();
    await page.getByRole('menuitem', { name: 'Déconnexion' }).click();
    await expect(page).toHaveURL(/\/fr/);
    await page.context().clearCookies({ name: 'NEXT_LOCALE' });

    await loginPage.navigateToAndLogin();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(
      page.getByRole('button', { name: 'Ouvrir le menu utilisateur' })
    ).toBeVisible();
  });
});
