import { expect, test } from '../fixtures/baseFixtures';
import LoginPage from '../model/login.pageModel';
import RegisterPage, { PlatformDetails } from '../model/register.pageModel';
import { HomePage } from '../model/home.pageModel';
import { waitForReactIdle } from '../model/common';
import NavigationMenu from '../model/navigation-menu.pageModel';
import RegisteredPlatformDetailPage from '../model/registered-platform-detail.pageModel';

const OPENAEV_PLATFORM_URL: PlatformDetails = {
  url: 'http://localhost:3000',
  title: 'Open AEV Instance',
  id: '916121bf-d246-4a43-8522-24be19537b91',
  contract: 'EE',
  version: '1.0.0',
};

const OPENCTI_PLATFORM_URL: PlatformDetails = {
  url: 'http://localhost:3000',
  title: 'Open CTI Instance',
  id: '916121bf-d246-4a43-8522-24be19537b91',
  contract: 'EE',
};

const XTMONE_PLATFORM_URL: PlatformDetails = {
  url: 'http://localhost:3000',
  title: 'XTM One Instance',
  id: '5b0b4f0e-9a3c-4b7e-8f2d-1c6e7a9d3b21',
  contract: 'EE',
  version: '1.0.0',
};

test.describe('Registration', () => {
  let loginPage: LoginPage;
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigateToAndLogin();
    await page.waitForURL('/app');
  });

  test('should register openAEV platform', async ({ page }) => {
    await test.step('display register page', async () => {
      registerPage = new RegisterPage(page);
      await registerPage.navigateTo('register-openaev', OPENAEV_PLATFORM_URL);
      await expect(
        page.getByRole('heading', {
          name: "You're about to connect your OpenAEV product to XTM Hub",
        })
      ).toBeVisible();
      await expect(
        page.getByRole('radio', {
          name: 'Filigran (Organizational workspace) - Recommended',
          exact: true,
        })
      ).toBeVisible();
      await expect(
        page.getByRole('radio', {
          name: 'admin@filigran.io (Personal workspace)',
          exact: true,
        })
      ).toBeVisible();
    });
    await test.step('register platform', async () => {
      await page.getByRole('button', { name: 'Connect' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'OpenAEV product connected successfully',
        })
      ).toBeVisible();
    });
    await test.step('instance should be visible', async () => {
      const homePage = new HomePage(page);

      await homePage.navigateTo();
      await waitForReactIdle(page);
      await page.getByRole('button', { name: 'OpenAEV' }).click();
      await page.getByRole('button', { name: 'My product' }).click();
      await expect(
        page.getByRole('link', { name: 'Open AEV Instance', exact: true })
      ).toBeVisible();
    });
  });

  test('should register openCTI platform', async ({ page }) => {
    await test.step('display register page', async () => {
      registerPage = new RegisterPage(page);
      await registerPage.navigateTo('register-opencti', OPENCTI_PLATFORM_URL);
      await expect(
        page.getByRole('heading', {
          name: "You're about to connect your OpenCTI product to XTM Hub",
        })
      ).toBeVisible();
      await expect(
        page.getByRole('radio', {
          name: 'Filigran (Organizational workspace) - Recommended',
          exact: true,
        })
      ).toBeVisible();
      await expect(
        page.getByRole('radio', {
          name: 'admin@filigran.io (Personal workspace)',
          exact: true,
        })
      ).toBeVisible();
    });
    await test.step('register platform', async () => {
      await page.getByRole('button', { name: 'Connect' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'OpenCTI product connected successfully',
        })
      ).toBeVisible();
    });
    await test.step('instance should be visible', async () => {
      const homePage = new HomePage(page);

      await homePage.navigateTo();
      await waitForReactIdle(page);
      await page.getByRole('button', { name: 'OpenCTI' }).click();
      await page.getByRole('button', { name: 'My product' }).click();
      await expect(
        page.getByRole('link', { name: 'Open CTI Instance', exact: true })
      ).toBeVisible();
    });
  });

  test('should register XTM One platform', async ({ page }) => {
    await test.step('display register page', async () => {
      registerPage = new RegisterPage(page);
      await registerPage.navigateTo('register-xtmone', XTMONE_PLATFORM_URL);
      await expect(
        page.getByRole('heading', {
          name: "You're about to connect your XTM One product to XTM Hub",
        })
      ).toBeVisible();
    });
    await test.step('register platform', async () => {
      await page.getByRole('button', { name: 'Connect' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'XTM One product connected successfully',
        })
      ).toBeVisible();
    });
    await test.step('instance should lead to its details page', async () => {
      const homePage = new HomePage(page);
      const navigationMenu = new NavigationMenu(page);
      const detailPage = new RegisteredPlatformDetailPage(page);

      await homePage.navigateTo();
      await waitForReactIdle(page);
      await navigationMenu.openMyProduct('XTM One', XTMONE_PLATFORM_URL.title);

      await detailPage.assertCurrentPage('xtmone_registration');
      await expect(detailPage.getAccessLink('XTM One')).toHaveAttribute(
        'href',
        XTMONE_PLATFORM_URL.url
      );
      await expect(detailPage.getXtmSectionTitle()).toBeVisible();
      await expect(detailPage.getProductCard('XTM One')).toBeVisible();
      await expect(
        detailPage.getQuickStartLink(/XTM One Documentation/)
      ).toHaveAttribute('href', 'https://docs.xtmone.io/');
    });
  });
});
