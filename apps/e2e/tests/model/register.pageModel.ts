import { Page } from '@playwright/test';

export type PlatformDetails = {
  url: string;
  title: string;
  id: string;
  contract: string;
  version?: string;
};

export const OPENCTI_PLATFORM_URL: PlatformDetails = {
  url: 'http://localhost:3000',
  title: 'Open CTI Instance',
  id: '916121bf-d246-4a43-8522-24be19537b91',
  contract: 'EE',
};
export default class RegisterPage {
  constructor(private page: Page) {}

  async navigateTo(redirectionKey: string, platformDetails: PlatformDetails) {
    const params = new URLSearchParams({
      platform_url: platformDetails.url,
      platform_title: platformDetails.title,
      platform_id: platformDetails.id,
      platform_contract: platformDetails.contract,
      ...(platformDetails.version !== undefined && {
        platform_version: platformDetails.version,
      }),
    });
    await this.page.goto(`/redirect/${redirectionKey}?${params.toString()}`);
  }

  async navigateToAndRegister(redirectionKey: string) {
    await this.navigateTo(redirectionKey, OPENCTI_PLATFORM_URL);
    await this.page.getByRole('button', { name: 'Connect' }).click();
  }
}

// The XTM Hub tab a real platform opens to connect or disconnect itself.
export class XtmHubRegistrationTab {
  constructor(private tab: Page) {}

  getConnectionHeading(platformName: string) {
    return this.tab.getByRole('heading', {
      name: `You're about to connect your ${platformName} product to XTM Hub`,
    });
  }

  getDisconnectionHeading(platformName: string) {
    return this.tab.getByRole('heading', {
      name: new RegExp(
        `You are about to disconnect your ${platformName} product`
      ),
    });
  }

  // The platform closes this tab itself once it gets the message from XTM Hub.
  private async clickAndWaitForClose(buttonName: string) {
    const closed = this.tab.waitForEvent('close');
    await this.tab
      .getByRole('button', { name: buttonName, exact: true })
      .click();
    await closed;
  }

  async connect(displayedName: string) {
    await this.tab.getByLabel('Name displayed in XTM Hub').fill(displayedName);
    await this.clickAndWaitForClose('Connect');
  }

  async confirmDisconnection() {
    await this.clickAndWaitForClose('Confirm');
  }

  async cancel() {
    await this.clickAndWaitForClose('Cancel');
  }
}
