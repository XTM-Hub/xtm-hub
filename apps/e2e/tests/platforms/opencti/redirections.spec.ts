import { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/baseFixtures';
import { HomePage } from '../../model/home.pageModel';
import IntegrationPage, {
  DEPLOYABLE_INTEGRATIONS,
  DeployableIntegrationKind,
} from '../../model/integration.pageModel';
import OneClickDeployPage from '../../model/one-click-deploy.pageModel';
import OpenctiResourcePage, {
  OPENCTI_RESOURCES,
} from '../../model/opencti-resource.pageModel';
import OpenctiPage from '../../model/platforms/opencti.pageModel';
import {
  getPlatformUrl,
  OPENCTI,
} from '../../model/platforms/xtm-platform.pageModel';
import {
  signInToXtmHubAndPlatform,
  skipWithoutPlatform,
} from '../platform-registration';

const XTM_HUB_ORIGIN = new URL(
  process.env.E2E_BASE_URL ?? 'http://localhost:3002'
).origin;
const isXtmHubUrl = (url: URL) => url.origin === XTM_HUB_ORIGIN;

const connectOpencti = async (page: Page) => {
  const platformPage = await signInToXtmHubAndPlatform(page, OPENCTI);
  await platformPage.connectToXtmHub('E2E OpenCTI');
};

// Publishes a free integration in XTM Hub and deploys it in OpenCTI: returns the OpenCTI tab.
const deployIntegration = async (
  page: Page,
  kind: DeployableIntegrationKind
) => {
  const integrationPage = new IntegrationPage(page);
  const shortDescription = `A ${kind} integration to deploy in OpenCTI`;
  await new HomePage(page).navigateTo();
  await integrationPage.navigateToIntegrationsService();
  await integrationPage.addDeployableIntegration(kind, {
    name: `e2e deployable ${kind} integration`,
    shortDescription,
    description: `A ${kind} integration deployed in a real OpenCTI`,
  });
  await integrationPage.navigateToIntegration(shortDescription);
  return new OneClickDeployPage(page).deployIn('OpenCTI');
};

test.describe('OpenCTI one-click deploy of each resource type', () => {
  skipWithoutPlatform(OPENCTI);

  test.beforeEach(async ({ page }) => {
    await connectOpencti(page);
  });

  // OpenCTI opens its import drawer prefilled from the file, and creates the feed when the user confirms.
  for (const { kind, drawerTitle, deployedKind } of [
    {
      kind: 'taxii',
      drawerTitle: 'Import a Taxii Feed',
      deployedKind: 'taxii',
    },
    { kind: 'rss', drawerTitle: 'Import an RSS Feed', deployedKind: 'rss' },
  ] as const) {
    test(`should deploy a ${kind} feed from XTM Hub`, async ({ page }) => {
      const openctiTab = await deployIntegration(page, kind);
      const opencti = new OpenctiPage(openctiTab, getPlatformUrl(OPENCTI));
      await expect(opencti.getText(drawerTitle)).toBeVisible();
      await expect(opencti.getNameField()).toHaveValue(
        DEPLOYABLE_INTEGRATIONS[kind].feedName
      );

      // OpenCTI keeps the feeds between tests: a new name avoids a duplicated service account.
      const feedName = `${DEPLOYABLE_INTEGRATIONS[kind].feedName} ${Date.now()}`;
      await opencti.getNameField().fill(feedName);
      await opencti.getCreateButton().click();

      await expect(openctiTab).toHaveURL(
        new RegExp(`/dashboard/integrations/deployed\\?kind=${deployedKind}`)
      );
      await expect(opencti.getText(feedName)).toBeVisible();
    });
  }

  // These feeds can only be created once OpenCTI reached the source (a CSV file, a remote OpenCTI), which the test
  // stack does not provide: the test stops at the prefilled import drawer.
  for (const { kind, drawerTitle } of [
    { kind: 'csv', drawerTitle: 'Import a CSV feed' },
    { kind: 'stream', drawerTitle: 'Create an OpenCTI Stream' },
  ] as const) {
    test(`should open the ${kind} feed deployed from XTM Hub in the OpenCTI import form`, async ({
      page,
    }) => {
      const opencti = new OpenctiPage(
        await deployIntegration(page, kind),
        getPlatformUrl(OPENCTI)
      );
      await expect(opencti.getText(drawerTitle)).toBeVisible();
      await expect(opencti.getNameField()).toHaveValue(
        DEPLOYABLE_INTEGRATIONS[kind].feedName
      );
      await expect(opencti.getCreateButton()).toBeDisabled();
    });
  }

  test('should deploy a custom view from XTM Hub', async ({ page }) => {
    const customViewPage = new OpenctiResourcePage(page, 'customView');
    const shortDescription = 'A custom view to deploy in OpenCTI';
    await new HomePage(page).navigateTo();
    await customViewPage.navigateToService();
    await customViewPage.addResource({
      name: 'e2e deployable custom view',
      shortDescription,
      version: '1.0.0',
      description: 'A custom view deployed in a real OpenCTI',
      entityType: 'Intrusion Set',
    });
    await customViewPage.navigateToResource(shortDescription);

    const opencti = new OpenctiPage(
      await new OneClickDeployPage(page).deployIn('OpenCTI'),
      getPlatformUrl(OPENCTI)
    );
    await expect(
      opencti.getText('Custom view successfully imported')
    ).toBeVisible();
    await expect(
      opencti.getText(OPENCTI_RESOURCES.customView.importedName).first()
    ).toBeVisible();
  });

  // OpenCTI only imports playbooks in Enterprise Edition: XTM Hub does not offer the deploy to a Community one.
  test('should not offer to deploy a playbook in a Community Edition OpenCTI', async ({
    page,
  }) => {
    const playbookPage = new OpenctiResourcePage(page, 'playbook');
    const shortDescription = 'A playbook for an Enterprise Edition OpenCTI';
    await new HomePage(page).navigateTo();
    await playbookPage.navigateToService();
    await playbookPage.addResource({
      name: 'e2e playbook',
      shortDescription,
      version: '1.0.0',
      description: 'A playbook XTM Hub cannot deploy in a Community Edition',
    });
    await playbookPage.navigateToResource(shortDescription);

    await expect(
      new OneClickDeployPage(page).getDeployButton('OpenCTI')
    ).toBeDisabled();
  });
});

test.describe('OpenCTI links to XTM Hub', () => {
  skipWithoutPlatform(OPENCTI);

  test('should land on the matching XTM Hub page from each OpenCTI link', async ({
    page,
  }) => {
    await connectOpencti(page);
    const opencti = new OpenctiPage(page, getPlatformUrl(OPENCTI));

    await test.step('dashboards: Import from Hub', async () => {
      await opencti.navigateTo('/dashboard/workspaces/dashboards');
      const xtmHubTab = await opencti.openXtmHubTab(
        opencti.getImportFromHubLink()
      );
      await expect(xtmHubTab).toHaveURL(
        /\/app\/service\/opencti_custom_dashboards\//
      );
      await xtmHubTab.close();
    });

    await test.step('integrations: Import from Hub of each built-in integration', async () => {
      await opencti.navigateTo('/dashboard/integrations/available');
      const importButtons = opencti.getImportFromHubButtons();
      await expect(importButtons.first()).toBeVisible();

      const integrationTypes: string[] = [];
      for (let index = 0; index < (await importButtons.count()); index++) {
        const xtmHubTab = await opencti.openXtmHubTab(importButtons.nth(index));
        await expect(xtmHubTab).toHaveURL(
          /\/app\/service\/opencti_integrations\/.*integrationType=/
        );
        integrationTypes.push(
          new URL(xtmHubTab.url()).searchParams.get('integrationType') ?? ''
        );
        await xtmHubTab.close();
      }
      expect(integrationTypes.sort()).toEqual([
        'csv_feed',
        'rss_feed',
        'stream',
        'taxii_feed',
      ]);
    });

    await test.step('integrations: Browse More', async () => {
      const xtmHubTab = await opencti.openXtmHubTab(
        opencti.getBrowseMoreLink()
      );
      await expect(xtmHubTab).toHaveURL(
        /\/cybersecurity-solutions\/opencti-integrations/
      );
      await xtmHubTab.close();
    });

    await test.step('Filigran Experience: Go to the Hub', async () => {
      await opencti.navigateTo(OPENCTI.experiencePath);
      const xtmHubTab = await opencti.openXtmHubTab(
        opencti.getGoToTheHubLink()
      );
      await expect(xtmHubTab).toHaveURL(isXtmHubUrl);
      await xtmHubTab.close();
    });
  });
});
