import { expect, test } from '../../fixtures/baseFixtures';
import OpenaevPage from '../../model/platforms/openaev.pageModel';
import { XtmHubRegistrationTab } from '../../model/register.pageModel';
import {
  getPlatformUrl,
  OPENAEV,
} from '../../model/platforms/xtm-platform.pageModel';
import {
  signInToXtmHubAndPlatform,
  skipWithoutPlatform,
} from '../platform-registration';

const XTM_HUB_ORIGIN = new URL(
  process.env.E2E_BASE_URL ?? 'http://localhost:3002'
).origin;
const isXtmHubUrl = (url: URL) => url.origin === XTM_HUB_ORIGIN;

test.describe('OpenAEV links to XTM Hub', () => {
  skipWithoutPlatform(OPENAEV);

  test('should land on the matching XTM Hub page from each OpenAEV link', async ({
    page,
  }) => {
    const platformPage = await signInToXtmHubAndPlatform(page, OPENAEV);
    const openaev = new OpenaevPage(page, getPlatformUrl(OPENAEV));

    await test.step('not connected, Filigran Experience: Explore XTM Hub', async () => {
      const xtmHubTab = await openaev.openXtmHubTab(
        openaev.getExploreXtmHubLink()
      );
      await expect(xtmHubTab).toHaveURL(isXtmHubUrl);
      await xtmHubTab.close();
    });

    await test.step('not connected, product switcher: XTM Hub starts the connection', async () => {
      await openaev.navigateTo('/scenarios');
      await openaev.openProductSwitcher();
      await openaev.getXtmHubProduct().click();
      await expect(openaev.getAuthorizeConnectionDialog()).toBeVisible();

      const xtmHubTab = new XtmHubRegistrationTab(
        await openaev.openXtmHubTab(
          openaev
            .getAuthorizeConnectionDialog()
            .getByRole('button', { name: 'Continue' })
        )
      );
      await expect(xtmHubTab.getConnectionHeading(OPENAEV.name)).toBeVisible();
      await xtmHubTab.cancel();
    });

    await platformPage.navigateToExperience();
    await platformPage.connectToXtmHub('E2E OpenAEV');

    await test.step('connected, Filigran Experience: Go to the Hub', async () => {
      const xtmHubTab = await openaev.openXtmHubTab(
        openaev.getGoToTheHubLink()
      );
      await expect(xtmHubTab).toHaveURL(isXtmHubUrl);
      await xtmHubTab.close();
    });

    await test.step('scenarios: Import from Hub', async () => {
      await openaev.navigateTo('/scenarios');
      const xtmHubTab = await openaev.openXtmHubTab(
        openaev.getImportFromHubLink()
      );
      await expect(xtmHubTab).toHaveURL(/\/app\/service\/openaev_scenarios\//);
      await xtmHubTab.close();
    });

    await test.step('connected, product switcher: XTM Hub', async () => {
      await openaev.openProductSwitcher();
      const xtmHubTab = await openaev.openXtmHubTab(openaev.getXtmHubProduct());
      await expect(xtmHubTab).toHaveURL(isXtmHubUrl);
      await xtmHubTab.close();
    });

    // These links always point to the production XTM Hub, whatever XTM Hub OpenAEV is configured with: the test only
    // checks where they lead, without opening production from the CI.
    await test.step('Getting Started: XTM Hub Library', async () => {
      await openaev.navigateTo('/getting_started');
      const libraryLinks = openaev.getXtmHubLibraryLinks();
      await expect(libraryLinks.first()).toBeVisible();
      for (const href of await libraryLinks.evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).href)
      )) {
        expect(new URL(href).pathname).toBe(
          '/cybersecurity-solutions/open-bas-scenarios'
        );
      }
    });
  });
});
