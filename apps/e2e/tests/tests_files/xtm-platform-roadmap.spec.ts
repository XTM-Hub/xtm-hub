import { expect, test } from '../fixtures/baseFixtures';
import LoginPage from '../model/login.pageModel';
import XTMPlatformRoadmapPage from '../model/xtm-platform-roadmap.pageModel';
import { addEpic } from '../db-utils/epic.helper';
import { ADMIN_USER } from '../db-utils/const';

test.describe('XTM Platform Roadmap', () => {
  let loginPage: LoginPage;
  let xtmPlatformRoadmapPage: XTMPlatformRoadmapPage;
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    xtmPlatformRoadmapPage = new XTMPlatformRoadmapPage(page);
  });

  async function seedNextEpics() {
    await addEpic({
      title: 'TitleDraft1',
      short_description: 'Short description for a draft',
      description: 'This is a draft epic',
      product: ['opencti'],
      active: false,
      timeline: 'next',
      uploader_id: ADMIN_USER.ID,
    });
    await addEpic({
      title: 'Title2',
      short_description: 'Short description',
      description: 'This is an epic',
      product: ['opencti'],
      active: true,
      timeline: 'next',
      uploader_id: ADMIN_USER.ID,
    });
    await addEpic({
      title: 'Title3',
      short_description: 'Short description for another epic',
      description: 'This is a second epic',
      product: ['openaev'],
      active: true,
      timeline: 'next',
      uploader_id: ADMIN_USER.ID,
    });
  }

  test('Should allow Filigran user to perform a CRUD of an epic', async ({
    page,
  }) => {
    await loginPage.navigateToAndLogin();
    await xtmPlatformRoadmapPage.navigateToService();
    await test.step('Add an epic', async () => {
      await xtmPlatformRoadmapPage.addEpic({
        title: 'Title',
        short_description: 'Short description',
        description: 'This is a test epic',
        edition_type: 'EE',
      });

      await expect(
        page.getByRole('button').filter({ hasText: 'OpenCTI (1)' })
      ).toBeVisible();

      await expect(page.getByText(/^Title$/)).toBeVisible();
      await expect(page.getByText(/^EE$/)).toBeVisible();
    });
    await test.step('Update an epic', async () => {
      await xtmPlatformRoadmapPage.updateEpic({
        title: 'TitleModified',
        description: 'This is a test epicModified',
        draft: false,
      });
      await expect(
        page.getByRole('button').filter({ hasText: 'OpenCTI (1)' })
      ).toBeVisible();
      await expect(page.getByText('TitleModified')).toBeVisible();
    });
    await test.step('Delete an epic', async () => {
      await xtmPlatformRoadmapPage.deleteEpic();
      await expect(
        page.getByRole('button').filter({ hasText: 'OpenCTI (0)' })
      ).toBeVisible();
    });
    await test.step('Create an epic integration', async () => {
      await xtmPlatformRoadmapPage.addEpic({
        title: 'Title integration',
        short_description: 'Short description for an integration',
        description: 'This is an integration epic',
        integration: true,
      });
      await expect(
        page.getByRole('button').filter({ hasText: 'OpenCTI (1)' })
      ).toBeVisible();
      await expect(page.getByText(/^EE$/)).not.toBeVisible();
      await expect(page.getByText(/^CE$/)).not.toBeVisible();
      await expect(page.getByText(/^Partial EE$/)).not.toBeVisible();
    });
    await test.step('Create an epic draft', async () => {
      await xtmPlatformRoadmapPage.addEpic({
        title: 'TitleDraft',
        short_description: 'Short description for a draft',
        description: 'This is a draft epic',
        draft: true,
      });
      await expect(
        page.getByRole('button').filter({ hasText: 'OpenCTI (2)' })
      ).toBeVisible();
    });
    await test.step('Create an epic on several products', async () => {
      await xtmPlatformRoadmapPage.addEpic({
        title: 'TitleMultiProduct',
        short_description: 'Short description for several products',
        description: 'This is a multi product epic',
        products: ['OpenCTI', 'OpenAEV'],
      });

      await xtmPlatformRoadmapPage.filterByProducts(['OpenAEV (1)']);
      await expect(page.getByText('TitleMultiProduct')).toBeVisible();

      await xtmPlatformRoadmapPage.filterByProducts(['OpenCTI (3)']);
      await expect(page.getByText('TitleMultiProduct')).toBeVisible();
    });
    await test.step('Create an epic with a slack link picked from the list', async () => {
      await xtmPlatformRoadmapPage.addEpic({
        title: 'TitleSlackOption',
        short_description: 'Short description for a picked slack link',
        description: 'This is an epic with a picked slack link',
        slackLinkOption: 'XTM Hub',
      });

      const detail =
        await xtmPlatformRoadmapPage.openEpicDetail('TitleSlackOption');
      await expect(
        detail.getByRole('link', {
          name: 'Stay in the loop on the Filigran Community',
        })
      ).toHaveAttribute(
        'href',
        'https://filigran-community.slack.com/archives/C08HU35NPD4'
      );
      await xtmPlatformRoadmapPage.closeEpicDetail();
    });
    await test.step('Create an epic with a slack link typed by hand', async () => {
      await xtmPlatformRoadmapPage.addEpic({
        title: 'TitleSlackFreeText',
        short_description: 'Short description for a typed slack link',
        description: 'This is an epic with a typed slack link',
        slackLink: 'https://filigran-community.slack.com/archives/C0BMANSB4CW',
      });

      const detail =
        await xtmPlatformRoadmapPage.openEpicDetail('TitleSlackFreeText');
      await expect(
        detail.getByRole('link', {
          name: 'Stay in the loop on the Filigran Community',
        })
      ).toHaveAttribute(
        'href',
        'https://filigran-community.slack.com/archives/C0BMANSB4CW'
      );
      await xtmPlatformRoadmapPage.closeEpicDetail();
    });
  });

  test('Should allow users that are not connected to view the xtm platform roadmap', async ({
    page,
  }) => {
    await testXTMPlatformRoadmapForUser(page);
  });

  test('Should allow community user to view the xtm platform roadmap', async ({
    page,
  }) => {
    await testXTMPlatformRoadmapForUser(page, 'user15@test.fr');
  });

  test('Should display added epics timeline counts on the homepage roadmap section', async ({
    page,
  }) => {
    await seedNextEpics();

    await page.goto('/en');

    const roadmapSection = page.locator('section').filter({
      has: page.getByRole('heading', {
        level: 2,
        name: 'XTM Platform Roadmap',
      }),
    });

    await test.step('roadmap section is visible on the homepage', async () => {
      await expect(roadmapSection).toBeVisible();
    });

    await test.step('Next timeline label is visible', async () => {
      await expect(
        roadmapSection.getByText('Next', { exact: true })
      ).toBeVisible();
    });

    await test.step('"See more" navigates to the roadmap page', async () => {
      await page.getByRole('link', { name: 'See more' }).click();
      await page.waitForURL(/xtm-platform-roadmap/);
    });
  });

  async function testXTMPlatformRoadmapForUser(page, userEmail?: string) {
    if (userEmail) {
      await loginPage.navigateToAndLogin(userEmail);
    } else {
      await loginPage.navigateToPublicPages();
    }

    await seedNextEpics();

    await page.goto('/cybersecurity-solutions/xtm-platform-roadmap');

    await test.step("It should display the epics' page correctly", async () => {
      await expect(
        page.getByRole('button', { name: 'Create' })
      ).not.toBeVisible();

      await expect(
        page.getByText('TitleDraft1', { exact: true })
      ).not.toBeVisible();
      await expect(page.getByText('Title2', { exact: true })).toBeVisible();
      await expect(page.getByText('Title3', { exact: true })).toBeVisible();
    });
    await test.step('It should filter on a single product', async () => {
      await xtmPlatformRoadmapPage.filterByProducts(['OpenAEV (1)']);
      await expect(page.getByText('Title2', { exact: true })).not.toBeVisible();
      await expect(page.getByText('Title3', { exact: true })).toBeVisible();
    });

    await test.step('It should filter on several products', async () => {
      await xtmPlatformRoadmapPage.filterByProducts([
        'OpenAEV (1)',
        'OpenCTI (1)',
      ]);
      await expect(page.getByText('Title2', { exact: true })).toBeVisible();
      await expect(page.getByText('Title3', { exact: true })).toBeVisible();
    });

    await test.step('It should display details', async () => {
      await page.getByText('Title3').click();
      await expect(
        page.getByText('This is a second epic', { exact: true })
      ).toBeVisible();
    });
  }
});
