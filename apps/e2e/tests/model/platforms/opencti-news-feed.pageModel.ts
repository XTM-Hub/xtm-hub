import { Page, WebSocket } from '@playwright/test';
import { expect } from '../../fixtures/baseFixtures';

// What OpenCTI calls each news feed type: the toast announces "New <name>", the settings list "<name>".
export const NEWS_FEED_TYPES = {
  customDashboard: {
    settingsLabel: 'Custom Dashboard',
    toastLabel: 'New Custom Dashboard',
  },
  customView: {
    settingsLabel: 'Custom View',
    toastLabel: 'New Custom View',
  },
} as const;

const ALL_TYPES_SWITCH_LABEL = 'Enable News Feed notifications';
const TOAST_SUBSCRIPTION = 'NewsFeedToastManagerSubscription';
const PAGE_SUBSCRIPTION = 'RootMeSubscription';
const TOGGLE_SAVED_MUTATION = 'NewsFeedPageFieldPatchMutation';

// The XTM Hub News Feed of a real OpenCTI: its toasts, its datatable and the news feed preferences of the user.
export default class OpenctiNewsFeedPage {
  private changedSubscriptions = false;

  constructor(
    private page: Page,
    private openctiUrl: string
  ) {}

  getItem(title: string) {
    return this.page.getByRole('row').filter({ hasText: title });
  }

  // The toast of OpenCTI has no role, label or test id, and this repository does not change OpenCTI to give it one:
  // it is the nearest block around its title that holds the link to XTM Hub. Look for toasts on a page without the
  // News Feed datatable (see openDashboard): its rows hold the same titles and links.
  getToast(title: string) {
    return this.page
      .getByText(title, { exact: true })
      .locator('xpath=ancestor::div[.//a][1]');
  }

  getToastLink(title: string) {
    return this.getToast(title).getByRole('link');
  }

  getItemLink(title: string) {
    return this.getItem(title).getByRole('link', { name: 'Open in XTM Hub' });
  }

  async openDashboard() {
    await this.page.goto(`${this.openctiUrl}/dashboard`);
  }

  // The subscriptions OpenCTI sends over its websocket, as long as the watch is not stopped.
  private watchSubscriptions() {
    const sent: string[] = [];
    const watch = (webSocket: WebSocket) =>
      webSocket.on('framesent', ({ payload }) => {
        sent.push(String(payload));
      });
    this.page.on('websocket', watch);
    return {
      hasSent: (subscription: string) =>
        sent.some((frame) => frame.includes(subscription)),
      stop: () => this.page.off('websocket', watch),
    };
  }

  // OpenCTI announces an item with a toast through a subscription it opens when a page loads, and never replays it:
  // an item pulled before that is not announced. Opens a page where the toast shows, once the subscription is open.
  // A user unsubscribed from every type has no subscription: use openDashboardWithoutToasts for that user.
  async openToastPage() {
    const subscriptions = this.watchSubscriptions();
    try {
      await this.openDashboard();
      await expect
        .poll(() => subscriptions.hasSent(TOAST_SUBSCRIPTION), {
          message: 'OpenCTI did not subscribe to the news feed toasts',
        })
        .toBe(true);
    } finally {
      subscriptions.stop();
    }
  }

  // Opens a page of a user unsubscribed from every type, and checks that OpenCTI does not listen to toasts on it.
  // OpenCTI opens its RootMeSubscription on every page: once it is sent, the page has opened its subscriptions, so
  // the absence of the toast subscription is not just a page that has not finished loading.
  async openDashboardWithoutToasts() {
    const subscriptions = this.watchSubscriptions();
    try {
      await this.openDashboard();
      await expect
        .poll(() => subscriptions.hasSent(PAGE_SUBSCRIPTION), {
          message: 'OpenCTI did not open the subscriptions of its page',
        })
        .toBe(true);
      expect(
        subscriptions.hasSent(TOAST_SUBSCRIPTION),
        'OpenCTI subscribed to the news feed toasts of a user unsubscribed from all the types'
      ).toBe(false);
    } finally {
      subscriptions.stop();
    }
  }

  // OpenCTI pulls the news feed from XTM Hub in a background job, not when the page opens: reload until it shows.
  // The job runs every second in the CI, and the wait must fit in what remains of the 60 s test timeout.
  async waitForItem(title: string) {
    await expect(async () => {
      await this.page.goto(`${this.openctiUrl}/dashboard/news-feed`);
      await expect(this.getItem(title)).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
  }

  // The titles of the items OpenCTI gave to the signed-in user, read from OpenCTI rather than from the datatable:
  // an empty datatable cannot be told from one that is still loading.
  async getReceivedTitles() {
    const data = await this.graphql<{
      myNewsFeeds: { edges: { node: { title: string } }[] };
    }>(
      `query NewsFeedE2eReceived {
        myNewsFeeds(first: 100, orderBy: creation_date, orderMode: desc) {
          edges { node { title } }
        }
      }`
    );
    return data.myNewsFeeds.edges.map(({ node }) => node.title);
  }

  // Opens the resource of a news feed item in XTM Hub, in the new tab OpenCTI opens for it.
  async openItemInXtmHub(title: string) {
    const xtmHubTabPromise = this.page.context().waitForEvent('page');
    await this.getItemLink(title).click();
    const xtmHubTab = await xtmHubTabPromise;
    await xtmHubTab.waitForLoadState();
    return xtmHubTab;
  }

  getSubscriptionSwitch(label: string) {
    return this.page
      .locator('li')
      .filter({ hasText: new RegExp(`^${label}$`) })
      .getByRole('switch');
  }

  // Turns the news feed notifications of the signed-in user on or off, for all the types or for one, from the
  // Settings tab. The list of types only shows once OpenCTI pulled it from XTM Hub: reload until it does.
  async setSubscription(
    target: 'all' | (typeof NEWS_FEED_TYPES)[keyof typeof NEWS_FEED_TYPES],
    subscribed: boolean
  ) {
    const label =
      target === 'all' ? ALL_TYPES_SWITCH_LABEL : target.settingsLabel;
    const subscriptionSwitch = this.getSubscriptionSwitch(label);
    await expect(async () => {
      await this.page.goto(`${this.openctiUrl}/dashboard/news-feed`);
      await this.page.getByRole('tab', { name: 'Settings' }).click();
      await expect(subscriptionSwitch).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 30_000 });

    // The switch follows the preference OpenCTI saved: it only changes once the save is done.
    this.changedSubscriptions = true;
    if ((await subscriptionSwitch.isChecked()) !== subscribed) {
      const saved = this.page.waitForResponse((response) =>
        (response.request().postData() ?? '').includes(TOGGLE_SAVED_MUTATION)
      );
      await subscriptionSwitch.click();
      await saved;
    }
    await expect(subscriptionSwitch).toBeChecked({ checked: subscribed });
  }

  // OpenCTI keeps the preferences of the user between tests, and the next ones expect to be announced everything.
  async resetSubscriptions() {
    if (!this.changedSubscriptions) {
      return;
    }
    await this.graphql(
      `mutation NewsFeedE2eReset($input: [EditInput]!) {
        meEdit(input: $input) { id }
      }`,
      { input: [{ key: 'unsubscribed_news_feed_types', value: [] }] }
    );
    this.changedSubscriptions = false;
  }

  // Calls OpenCTI as the signed-in user of the page.
  private async graphql<T>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    const response = await this.page.request.post(
      `${this.openctiUrl}/graphql`,
      { data: { query, variables } }
    );
    expect(response.ok()).toBeTruthy();
    const { data, errors } = await response.json();
    expect(errors).toBeUndefined();
    return data as T;
  }
}
