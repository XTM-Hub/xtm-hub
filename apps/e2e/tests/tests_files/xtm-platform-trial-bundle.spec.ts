import { expect, test } from '../fixtures/baseFixtures';
import { ADMIN_USER, PLATFORM_ORGANIZATION_UUID } from '../db-utils/const';
import {
  activateBundleDeploymentRequest,
  loadBundleDeploymentRequest,
  loadBundleProducts,
} from '../db-utils/deployment.helper';
import LoginPage from '../model/login.pageModel';
import XtmPlatformTrialPage from '../model/xtm-platform-trial.pageModel';

const BUNDLE_PRODUCTS = ['openaev', 'opencti', 'xtmone'];

test.describe('XTM Platform bundle trial', () => {
  let loginPage: LoginPage;
  let trialPage: XtmPlatformTrialPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    trialPage = new XtmPlatformTrialPage(page);
    await loginPage.navigateToAndLogin();
    await page.waitForURL('/app');
  });

  test('Should request, activate and cancel a bundle trial', async ({
    page,
  }) => {
    await test.step('Organization admin requests the bundle trial', async () => {
      await trialPage.navigateTo();
      await expect(
        page.getByRole('heading', { name: 'Start your 30-day free trial' })
      ).toBeVisible();

      await trialPage.requestBundleTrial();

      // Then the request is waiting for the platform team
      await expect(
        page.getByText("Thanks! We've received your request.")
      ).toBeVisible();
      await expect(
        page.getByText('Our team will be in touch shortly.')
      ).toBeVisible();
      await expect(page.getByText('Requested on')).toBeVisible();
      await expect(
        page.getByText('Products included in your trial request')
      ).toBeVisible();
      for (const product of BUNDLE_PRODUCTS) {
        await expect(trialPage.getStatusProductCheckbox(product)).toBeChecked();
      }
      await expect(
        page.getByRole('button', { name: 'Cancel trial request' })
      ).toBeVisible();
    });

    await test.step('The bundle and one deployment request per product are created', async () => {
      const bundle = await loadBundleDeploymentRequest(
        PLATFORM_ORGANIZATION_UUID
      );
      expect(bundle.type).toEqual('bundle');
      expect(bundle.platform_identifier).toBeNull();
      expect(bundle.parent_id).toBeNull();
      // A bundle goes straight to pending as long as the region has quota left
      expect(bundle.hub_status).toEqual('pending');

      const products = await loadBundleProducts(bundle.id);
      expect(products).toHaveLength(BUNDLE_PRODUCTS.length);
      expect(
        products.map(({ platform_identifier }) => platform_identifier).sort()
      ).toEqual(BUNDLE_PRODUCTS);
      products.forEach((product) => {
        expect(product.type).toEqual('trial');
        expect(product.hub_status).toEqual('pending');
      });
    });

    await test.step('The platform team sees the bundle and its products', async () => {
      await trialPage.navigateToManageTrials();
      await expect(
        page.getByRole('heading', { name: 'Manage trials' })
      ).toBeVisible();

      // The waiting tab only lists queued bundles, a pending one is running
      await expect(page.getByRole('tab', { name: 'Waiting' })).toBeVisible();
      await page.getByRole('tab', { name: 'Running' }).click();

      const row = page.getByRole('row', { name: ADMIN_USER.EMAIL });
      await expect(row).toBeVisible();
      await expect(row.getByText('Filigran', { exact: true })).toBeVisible();
      for (const product of BUNDLE_PRODUCTS) {
        await expect(
          row.getByText(product.toUpperCase(), { exact: true })
        ).toBeVisible();
      }
      await expect(
        row.getByRole('button', { name: 'Cancel the bundle trial' })
      ).toBeVisible();
    });

    await test.step('Once every platform is activated, the trial is counting down', async () => {
      await activateBundleDeploymentRequest(PLATFORM_ORGANIZATION_UUID);

      await trialPage.navigateToManageTrials();
      await page.getByRole('tab', { name: 'Running' }).click();
      const row = page.getByRole('row', { name: ADMIN_USER.EMAIL });
      await expect(row).toBeVisible();
      await expect(
        row.getByRole('cell', { name: '30', exact: true })
      ).toBeVisible();
    });

    await test.step('The user gets its bundle dashboard', async () => {
      await trialPage.navigateTo();
      await expect(
        page.getByRole('heading', {
          name: 'Welcome to your XTM Platform Trial',
        })
      ).toBeVisible();

      const trialDetails = page.getByRole('main');
      await expect(
        trialDetails.getByText('XTM Product Trial details:')
      ).toBeVisible();
      await expect(
        trialDetails.getByText('Filigran', { exact: true })
      ).toBeVisible();
      await expect(trialDetails.getByText('30 days')).toBeVisible();
      await expect(trialDetails.getByText(ADMIN_USER.EMAIL)).toBeVisible();

      for (const productName of ['OpenCTI', 'OpenAEV']) {
        await expect(
          page.getByRole('button', { name: `Access ${productName}` })
        ).toBeDisabled();
      }
      await expect(
        page.getByText('None. Please contact the trial requester.')
      ).toHaveCount(2);
      await expect(
        page.getByRole('link', { name: 'Access XTM One' })
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Manage users' })
      ).toBeVisible();
    });

    await test.step('Cancelling the bundle cancels every product', async () => {
      await trialPage.cancelTrial('Cancel trial');

      await expect(
        page.getByText('Unfortunately, your trial has been cancelled.')
      ).toBeVisible();

      const bundle = await loadBundleDeploymentRequest(
        PLATFORM_ORGANIZATION_UUID
      );
      expect(bundle.hub_status).toEqual('cancelled');
      const products = await loadBundleProducts(bundle.id);
      products.forEach((product) =>
        expect(product.hub_status).toEqual('cancelled')
      );
    });
  });
});
