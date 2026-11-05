import { expect, test } from '../fixtures/baseFixtures';
import {
  addBlogPostNewsFeedItem,
  deleteNewsFeedItem,
  loadServiceInstanceGlobalIdByDefinitionIdentifier,
} from '../db-utils/news-feed.helper';
import LoginPage from '../model/login.pageModel';
import { NewsFeedRedirectPage } from '../model/news-feed-redirect.pageModel';

const BLOG_POST_SLUG = 'e2e-blog-post';
const SERVICE_IDENTIFIER = 'opencti_custom_dashboards';
const PLATFORM_ID = '9b0c7a3e-1111-4a9e-8d6f-0d4f5a7c9e10';

test.describe('News feed redirect', () => {
  let newsFeedRedirectPage: NewsFeedRedirectPage;
  let newsFeedItemId: string | undefined;

  test.beforeEach(({ page }) => {
    newsFeedRedirectPage = new NewsFeedRedirectPage(page);
  });

  test.afterEach(async () => {
    if (newsFeedItemId) {
      await deleteNewsFeedItem(newsFeedItemId);
      newsFeedItemId = undefined;
    }
  });

  test('should redirect a news feed blog post link to filigran.io, without being logged in', async () => {
    newsFeedItemId = await addBlogPostNewsFeedItem(BLOG_POST_SLUG);

    const response = await newsFeedRedirectPage.requestExternalRedirect(
      newsFeedItemId,
      `utm_source=opencti&utm_medium=newsfeed&utm_campaign=blog_posts&utm_content=blog_posts&platform_id=${PLATFORM_ID}`
    );

    expect(response.status()).toBe(302);
    // The host depends on the environment (staging.filigran.io outside production)
    const location = new URL(response.headers()['location']);
    expect(location.protocol).toBe('https:');
    expect(location.hostname).toMatch(/(^|\.)filigran\.io$/);
    expect(location.pathname).toBe(`/blog/${BLOG_POST_SLUG}`);
    // Only the utm parameters are forwarded to the destination, platform_id is not
    expect(location.search).toBe(
      '?utm_source=opencti&utm_medium=newsfeed&utm_campaign=blog_posts&utm_content=blog_posts'
    );
    expect(response.headers()['cache-control']).toBe('no-store');
    expect(response.headers()['set-cookie']).toBeUndefined();
  });

  test('should redirect a news feed resource link to the resource service when the user is logged in', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigateToAndLogin();
    await page.waitForURL('/app');
    const serviceInstanceGlobalId =
      await loadServiceInstanceGlobalIdByDefinitionIdentifier(
        SERVICE_IDENTIFIER
      );

    await newsFeedRedirectPage.navigateToResourceRedirect(
      SERVICE_IDENTIFIER,
      'utm_source=opencti&utm_medium=newsfeed&utm_campaign=hub_resources&utm_content=custom_dashboard'
    );

    await expect(page).toHaveURL(
      `/app/service/${SERVICE_IDENTIFIER}/${encodeURIComponent(serviceInstanceGlobalId)}?utm_source=opencti&utm_medium=newsfeed&utm_campaign=hub_resources&utm_content=custom_dashboard`
    );
  });
});
