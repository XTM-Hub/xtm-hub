import { expect, test } from '../fixtures/baseFixtures';
import LoginPage from '../model/login.pageModel';
import DashboardPage, {
  TEST_2_IMAGE_FILE,
  TEST_2_JSON_FILE,
  TEST_3_IMAGE_FILE,
  TEST_JSON_FILE,
} from '../model/dashboard.pageModel';
import { waitForDrawerToClose } from '../model/common';
import { waitForAllImageLoaded } from '../utils/wait-for-all-image-loaded';

const DASHBOARD_TEST = {
  name: 'e2e dashboard name',
  shortDescription: 'This is a short description',
  version: '1.0.0',
  description: 'This is a dashboard description markdown',
};

const UPDATED_DASHBOARD_TEST = {
  name: 'e2e updated dashboard name',
  shortDescription: 'This is a short updated description',
  version: '2.0.0',
  description: 'This is a dashboard description markdown updated',
};

test.describe('Custom dashboards', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    await loginPage.navigateToAndLogin();
    await dashboardPage.navigateToDashboardService();
    await dashboardPage.addCustomDashboard(DASHBOARD_TEST);
  });

  test('Should add custom dashboard', async ({ page }) => {
    await dashboardPage.navigateToDashboard(DASHBOARD_TEST.shortDescription);

    await expect(
      page.getByRole('heading', { name: DASHBOARD_TEST.name })
    ).toBeVisible();
  });

  test('Should see the custom dashboard on public page', async ({ page }) => {
    await page.goto('/');

    await dashboardPage.navigateToPublicCustomDashboard();
    await page.evaluate(() => window.scrollTo(0, 0));

    await dashboardPage.navigateToPublicDashboardDetail(
      DASHBOARD_TEST.shortDescription
    );
    await waitForAllImageLoaded(page);
  });

  test('Should edit a custom dashboard', async ({ page }) => {
    const openUpdateDrawer = async () => {
      await page
        .getByRole('button', { name: 'Open menu', exact: true })
        .click();
      await page.getByRole('menuitem', { name: 'Update' }).click();
    };

    await expect(
      page.getByText(DASHBOARD_TEST.name, { exact: true })
    ).toBeVisible();

    await openUpdateDrawer();

    let test_step = 0;
    await test.step('Update only texts', async () => {
      test_step++;
      await page
        .getByRole('textbox', { name: 'Name', exact: true })
        .fill(`${UPDATED_DASHBOARD_TEST.name} // ${test_step}`);
      await page
        .getByRole('textbox', { name: 'Short Description' })
        .fill(UPDATED_DASHBOARD_TEST.shortDescription);
      await page
        .getByRole('textbox', { name: 'OpenCTI compatibility version' })
        .fill(UPDATED_DASHBOARD_TEST.version);
      await page
        .getByRole('textbox', { name: 'This is a paragraph to' })
        .fill(UPDATED_DASHBOARD_TEST.description);
      await page
        .getByRole('checkbox', { name: 'Is the Custom Dashboard published?' })
        .click();
      await page.getByRole('button', { name: 'Validate' }).click();
      await waitForDrawerToClose(page);
      await expect(
        page.getByText(`${UPDATED_DASHBOARD_TEST.name} // ${test_step}`, {
          exact: true,
        })
      ).toBeVisible();
    });

    await test.step('Add a new one image', async () => {
      test_step++;
      await openUpdateDrawer();
      await page
        .getByRole('textbox', { name: 'Name', exact: true })
        .fill(`${UPDATED_DASHBOARD_TEST.name} // ${test_step}`);
      await dashboardPage.uploadImageDocument(TEST_2_IMAGE_FILE.path);
      await page.getByRole('button', { name: 'Validate' }).click();
      await waitForDrawerToClose(page);
      await expect(
        page.getByText(`${UPDATED_DASHBOARD_TEST.name} // ${test_step}`, {
          exact: true,
        })
      ).toBeVisible();
    });

    await test.step('Delete the old image and add a new one', async () => {
      test_step++;
      await openUpdateDrawer();
      await page
        .getByRole('textbox', { name: 'Name', exact: true })
        .fill(`${UPDATED_DASHBOARD_TEST.name} // ${test_step}`);
      await page.getByTestId('images-grid').getByRole('button').nth(1).click();

      await dashboardPage.uploadImageDocument(TEST_3_IMAGE_FILE.path);

      await page.getByRole('button', { name: 'Validate' }).click();
      await waitForDrawerToClose(page);
      await expect(
        page.getByText(`${UPDATED_DASHBOARD_TEST.name} // ${test_step}`, {
          exact: true,
        })
      ).toBeVisible();
    });

    await test.step('Delete the old image and add a new one', async () => {
      test_step++;
      await openUpdateDrawer();
      await page
        .getByRole('textbox', { name: 'Name', exact: true })
        .fill(`${UPDATED_DASHBOARD_TEST.name} // ${test_step}`);
      await page.getByTestId('images-grid').getByRole('button').nth(1).click();

      await dashboardPage.uploadImageDocument(TEST_3_IMAGE_FILE.path);

      await page.getByRole('button', { name: 'Validate' }).click();
      await waitForDrawerToClose(page);
      await expect(
        page.getByText(`${UPDATED_DASHBOARD_TEST.name} // ${test_step}`, {
          exact: true,
        })
      ).toBeVisible();
    });

    await test.step('Delete the old image and add a new one', async () => {
      test_step++;
      await openUpdateDrawer();
      await page
        .getByRole('textbox', { name: 'Name', exact: true })
        .fill(`${UPDATED_DASHBOARD_TEST.name} // ${test_step}`);
      await page.getByTestId('images-grid').getByRole('button').nth(1).click();

      await dashboardPage.uploadImageDocument(TEST_3_IMAGE_FILE.path);

      await page.getByRole('button', { name: 'Validate' }).click();
      await waitForDrawerToClose(page);
      await expect(
        page.getByText(`${UPDATED_DASHBOARD_TEST.name} // ${test_step}`, {
          exact: true,
        })
      ).toBeVisible();
    });

    await test.step('Update the dashboard', async () => {
      test_step++;
      await openUpdateDrawer();
      await page
        .getByRole('textbox', { name: 'Name', exact: true })
        .fill(`${UPDATED_DASHBOARD_TEST.name} // ${test_step}`);

      await page
        .getByText(`Existing JSON file: ${TEST_JSON_FILE.name}`)
        .waitFor();

      await dashboardPage.uploadJsonDocument(TEST_2_JSON_FILE.path);

      await page.getByRole('button', { name: 'Validate' }).click();
      await waitForDrawerToClose(page);
      await expect(
        page.getByText(`${UPDATED_DASHBOARD_TEST.name} // ${test_step}`, {
          exact: true,
        })
      ).toBeVisible();
      await openUpdateDrawer();
      await page
        .getByText(`Existing JSON file: ${TEST_2_JSON_FILE.name}`)
        .waitFor();
    });
  });
});
