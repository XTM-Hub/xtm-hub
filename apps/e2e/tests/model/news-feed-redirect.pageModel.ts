import { Page } from '@playwright/test';

export class NewsFeedRedirectPage {
  constructor(private page: Page) {}

  // The redirect is not followed: the destination is an external website
  async requestExternalRedirect(newsFeedItemId: string, query: string) {
    return this.page.request.get(
      `/redirect/news-feed/${newsFeedItemId}?${query}`,
      { maxRedirects: 0 }
    );
  }

  async navigateToResourceRedirect(identifier: string, query: string) {
    await this.page.goto(`/redirect/${identifier}?${query}`);
  }
}
