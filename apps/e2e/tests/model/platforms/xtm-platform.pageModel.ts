import { Page, Request } from '@playwright/test';
import { expect } from '../../fixtures/baseFixtures';
import { XtmHubRegistrationTab } from '../register.pageModel';

// A real OpenCTI or OpenAEV instance, started by xtm-hub-dev/docker-compose-ci-{opencti,openaev}.yml.
export interface XtmPlatform {
  name: 'OpenCTI' | 'OpenAEV';
  // Set by the CI compose override that starts the platform.
  urlVariable: 'OPENCTI_URL' | 'OPENAEV_URL';
  adminEmail: string;
  adminPassword: string;
  experiencePath: string;
  disconnectButtonName: string;
  connectedToast: string;
  disconnectedToast: string;
  // The call the Filigran Experience page makes to the platform when it opens, to check its connectivity with XTM Hub.
  isConnectivityCheckRequest: (request: Request) => boolean;
}

export const OPENCTI: XtmPlatform = {
  name: 'OpenCTI',
  urlVariable: 'OPENCTI_URL',
  adminEmail: process.env.OPENCTI_ADMIN_EMAIL ?? 'admin@opencti.io',
  adminPassword: process.env.OPENCTI_ADMIN_PASSWORD ?? 'admin',
  experiencePath: '/dashboard/settings/experience',
  disconnectButtonName: 'Disconnect from XTM Hub',
  connectedToast: 'Your OpenCTI product is successfully connected',
  disconnectedToast: 'Your OpenCTI product is successfully disconnected',
  isConnectivityCheckRequest: (request) =>
    request.method() === 'POST' &&
    request.url().endsWith('/graphql') &&
    (request.postData() ?? '').includes(
      'XtmHubSettingsCheckConnectivityMutation'
    ),
};

// OpenAEV prefixes its routes with the tenant: this is the id of its default tenant.
const OPENAEV_DEFAULT_TENANT_ID = '2cffad3a-0001-4078-b0e2-ef74274022c3';

export const OPENAEV: XtmPlatform = {
  name: 'OpenAEV',
  urlVariable: 'OPENAEV_URL',
  adminEmail: process.env.OPENAEV_ADMIN_EMAIL ?? 'admin@openaev.io',
  adminPassword: process.env.OPENAEV_ADMIN_PASSWORD ?? 'admin',
  experiencePath: `/${OPENAEV_DEFAULT_TENANT_ID}/admin/settings/experience`,
  disconnectButtonName: 'Disconnect XTM Hub',
  connectedToast: 'Your OpenAEV platform is successfully connected',
  disconnectedToast: 'Your OpenAEV platform is successfully disconnected',
  isConnectivityCheckRequest: (request) =>
    request.method() === 'POST' &&
    request.url().endsWith('/xtmhub/refresh-connectivity'),
};

export const isPlatformRunning = (platform: XtmPlatform) =>
  !!process.env[platform.urlVariable];

// The platform's URL, as the browser of the tests reaches it.
export const getPlatformUrl = (platform: XtmPlatform): string => {
  const url = process.env[platform.urlVariable];
  if (!url) {
    throw new Error(
      `${platform.name} is not running: ${platform.urlVariable} is not set`
    );
  }
  return url;
};

export default class XtmPlatformPage {
  constructor(
    private page: Page,
    private platform: XtmPlatform
  ) {}

  async login() {
    await this.page.goto(getPlatformUrl(this.platform));
    await this.page.getByLabel('Login').fill(this.platform.adminEmail);
    await this.page
      .getByLabel('Password', { exact: true })
      .fill(this.platform.adminPassword);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
    // OpenCTI shows its login form on any URL, so first wait for the form to go, then for the home page:
    // OpenAEV redirects there after login.
    await expect(this.page.getByLabel('Login')).toBeHidden();
    await this.page.waitForURL(/\/(dashboard|admin)/);
  }

  async navigateToExperience() {
    // A redirect the platform still runs after login can abort this navigation: retry until the card shows.
    await expect(async () => {
      await this.page.goto(
        `${getPlatformUrl(this.platform)}${this.platform.experiencePath}`
      );
      await expect(this.getXtmHubCard()).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 45_000 });
  }

  getXtmHubCard() {
    return this.page.getByTestId('experience-xtm-hub-card');
  }

  getConnectionStatus(status: 'Connected' | 'Not connected') {
    return this.getXtmHubCard().getByText(status, { exact: true }).first();
  }

  // Starts the connection or disconnection process and returns the XTM Hub tab it opens.
  async openXtmHubTab(buttonName: string) {
    await this.getXtmHubCard()
      .getByRole('button', { name: buttonName })
      .click();
    const xtmHubTabPromise = this.page.waitForEvent('popup');
    await this.page
      .getByRole('dialog')
      .getByRole('button', { name: 'Continue', exact: true })
      .click();
    const xtmHubTab = await xtmHubTabPromise;
    await xtmHubTab.waitForLoadState();
    return xtmHubTab;
  }

  openConnectionTab() {
    return this.openXtmHubTab('Connect to XTM Hub');
  }

  // Connects the platform from its settings, the way the user does, and waits for it to show "Connected".
  async connectToXtmHub(displayedName: string) {
    const xtmHubTab = new XtmHubRegistrationTab(await this.openConnectionTab());
    await xtmHubTab.connect(displayedName);
    await expect(this.getConnectionStatus('Connected')).toBeVisible();
  }

  openDisconnectionTab() {
    return this.openXtmHubTab(this.platform.disconnectButtonName);
  }
}
