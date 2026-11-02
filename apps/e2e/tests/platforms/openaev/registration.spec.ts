import { expect, test } from '../../fixtures/baseFixtures';
import { HomePage } from '../../model/home.pageModel';
import OneClickDeployPage from '../../model/one-click-deploy.pageModel';
import OpenaevScenarioPage, {
  DEPLOYABLE_SCENARIO_FILE,
} from '../../model/openaev-scenario.pageModel';
import { OPENAEV } from '../../model/platforms/xtm-platform.pageModel';
import {
  describePlatformRegistration,
  signInToXtmHubAndPlatform,
  skipWithoutPlatform,
} from '../platform-registration';

describePlatformRegistration(OPENAEV);

const SCENARIO = {
  name: 'e2e deployable scenario',
  shortDescription: 'A scenario to deploy in OpenAEV',
  version: '1.0.0',
  description: 'A scenario deployed in a real OpenAEV',
};

test.describe('OpenAEV one-click deploy', () => {
  skipWithoutPlatform(OPENAEV);

  test('should deploy a scenario from XTM Hub', async ({ page }) => {
    const platformPage = await signInToXtmHubAndPlatform(page, OPENAEV);
    await platformPage.connectToXtmHub('E2E OpenAEV');

    const scenarioPage = new OpenaevScenarioPage(page);
    await test.step('publish a scenario in XTM Hub', async () => {
      await new HomePage(page).navigateTo();
      await scenarioPage.navigateToScenarioService();
      await scenarioPage.addScenario(SCENARIO);
    });

    await test.step('deploy it in OpenAEV', async () => {
      await scenarioPage.navigateToScenario(SCENARIO.shortDescription);
      const openaevTab = await new OneClickDeployPage(page).deployIn('OpenAEV');

      // OpenAEV gets a token from XTM Hub, downloads the scenario, imports it and lists it with an "(Import)" suffix.
      await expect(
        openaevTab.getByText('The element has been successfully created')
      ).toBeVisible();
      // OpenAEV keeps the scenarios of earlier attempts: the toast above is the one of this import.
      await expect(
        openaevTab
          .getByText(`${DEPLOYABLE_SCENARIO_FILE.scenarioName} (Import)`)
          .first()
      ).toBeVisible();
    });
  });
});
