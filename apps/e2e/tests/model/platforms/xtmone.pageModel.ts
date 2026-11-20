import { Page } from '@playwright/test';
import { expect } from '../../fixtures/baseFixtures';
import { XtmHubRegistrationTab } from '../register.pageModel';

// A real XTM One, started by xtm-hub-dev/docker-compose-ci-xtmone.yml. Unlike OpenCTI and OpenAEV, XTM One registers
// itself from its Settings > Platform page, in a popup on XTM Hub that posts the platform token back to it.
export const XTMONE = {
  name: 'XTM One',
  // Set by the CI compose override that starts XTM One.
  urlVariable: 'XTMONE_URL',
  adminEmail: process.env.XTMONE_ADMIN_EMAIL ?? 'admin@xtmone.io',
  adminPassword: process.env.XTMONE_ADMIN_PASSWORD ?? 'xtmone-e2e-admin',
  connectedToast: 'This platform is registered with the XTM Hub',
  disconnectedToast: 'This platform is no longer registered with the XTM Hub',
} as const;

export const isXtmOneRunning = () => !!process.env[XTMONE.urlVariable];

// XTM One's URL, as the browser of the tests reaches it.
export const getXtmOneUrl = (): string => {
  const url = process.env[XTMONE.urlVariable];
  if (!url) {
    throw new Error(
      `${XTMONE.name} is not running: ${XTMONE.urlVariable} is not set`
    );
  }
  return url;
};

export type XtmOneRegistrationStatus = 'Registered' | 'Not registered';

export default class XtmOnePage {
  constructor(private page: Page) {}

  // A fresh XTM One proposes its organization setup, in a dialog over the whole app, to its first administrator:
  // answer it over the API so it never hides the Settings page.
  private async dismissOrganizationSetupPrompt() {
    const request = this.page.context().request;
    const login = await request.post(`${getXtmOneUrl()}/api/v1/auth/login`, {
      data: { email: XTMONE.adminEmail, password: XTMONE.adminPassword },
    });
    expect(login.ok()).toBeTruthy();
    const { access_token: token } = await login.json();
    const answer = await request.post(
      `${getXtmOneUrl()}/api/v1/organization-context/setup-prompt`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { outcome: 'dismissed' },
      }
    );
    expect(answer.ok()).toBeTruthy();
  }

  async login() {
    await this.dismissOrganizationSetupPrompt();
    await this.page.goto(`${getXtmOneUrl()}/login`);
    await this.page.getByLabel('Email').fill(XTMONE.adminEmail);
    await this.page
      .getByLabel('Password', { exact: true })
      .fill(XTMONE.adminPassword);
    await this.page.getByRole('button', { name: 'Sign In' }).click();
    await expect(
      this.page.getByRole('link', { name: 'Home', exact: true })
    ).toBeVisible();
  }

  async navigateToSettings() {
    await this.page.goto(`${getXtmOneUrl()}/settings/platform`);
    await expect(this.getXtmHubCard()).toBeVisible();
  }

  // The XTM Hub registration card of Settings > Platform, anchored as #xtm-hub so that links can open it.
  getXtmHubCard() {
    return this.page.locator('#xtm-hub');
  }

  // The status badge of the card header, apart from the "Registered" date the card also lists once registered: that
  // label stays when the status turns to "Connectivity lost" or "Register again". XTM One marks its badges with
  // data-slot="badge".
  getRegistrationStatus(status: XtmOneRegistrationStatus) {
    return this.getXtmHubCard()
      .locator('[data-slot="badge"]')
      .filter({ hasText: new RegExp(`^${status}$`) });
  }

  getRegisterButton() {
    return this.getXtmHubCard().getByRole('button', {
      name: 'Register on the XTM Hub',
    });
  }

  getCheckNowButton() {
    return this.getXtmHubCard().getByRole('button', { name: 'Check now' });
  }

  // XTM Hub forgot any previous registration when its database was reset, but XTM One only learns it from its next
  // check: XTM Hub then answers that it does not know the platform, and XTM One drops the registration.
  async resetRegistration() {
    const checkNow = this.getCheckNowButton();
    // The card shows "Not registered" until XTM One has loaded its saved registration, and keeps Register disabled
    // until then: wait for an enabled Register or Check now before reading the state.
    await expect(this.getRegisterButton().or(checkNow)).toBeEnabled();
    if (await checkNow.isVisible()) {
      await checkNow.click();
    }
    await expect(this.getRegistrationStatus('Not registered')).toBeVisible();
  }

  // Asks XTM Hub now, from the card, and waits for XTM One's answer.
  async checkNow() {
    const check = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('/xtm-hub/registration/check')
    );
    await this.getCheckNowButton().click();
    return check;
  }

  // Clicks a button of the card opening XTM Hub and returns the popup XTM One opens for it.
  private async openXtmHubPopup(buttonName: string) {
    const popupPromise = this.page.waitForEvent('popup');
    await this.getXtmHubCard()
      .getByRole('button', { name: buttonName, exact: true })
      .click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    return popup;
  }

  openRegistrationPopup() {
    return this.openXtmHubPopup('Register on the XTM Hub');
  }

  openUnregistrationPopup() {
    return this.openXtmHubPopup('Unregister');
  }

  // Registers XTM One from its settings, the way the user does, and waits for it to show "Registered".
  async registerOnXtmHub(displayedName: string) {
    const xtmHubTab = new XtmHubRegistrationTab(
      await this.openRegistrationPopup()
    );
    await xtmHubTab.connect(displayedName);
    await expect(this.getRegistrationStatus('Registered')).toBeVisible();
  }
}
