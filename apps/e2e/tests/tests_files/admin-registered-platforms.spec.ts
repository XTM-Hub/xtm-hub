import { expect, test } from '../fixtures/baseFixtures';
import { SECOND_ORGA } from '../db-utils/const';
import { getPlatformRegistration } from '../db-utils/platform-configuration.helper';
import { createOrganizationMember } from '../db-utils/user.helper';
import AdminRegisteredPlatformsPage from '../model/admin-registered-platforms.pageModel';
import LoginPage from '../model/login.pageModel';
import RegisterPage, { PlatformDetails } from '../model/register.pageModel';

const PLATFORM: PlatformDetails = {
  url: 'http://localhost:3000',
  title: 'Platform To Unregister',
  id: '0b8d2f1c-6a52-4d54-9f5b-3a3d0a1e7c11',
  contract: 'EE',
};

// Belongs to a new organization where it may manage registrations, and to none of the organization that owns the
// platform.
const TAKEOVER_ORGANIZATION = 'Takeover Org';
const TAKEOVER_USER_EMAIL = 'takeover@takeover-org.com';
const ADMIN_EMAIL = 'admin@filigran.io';

test.describe('Admin unregister of a registered platform', () => {
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let adminPage: AdminRegisteredPlatformsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    adminPage = new AdminRegisteredPlatformsPage(page);

    await createOrganizationMember({
      email: TAKEOVER_USER_EMAIL,
      organizationName: TAKEOVER_ORGANIZATION,
      capabilities: ['MANAGE_PLATFORM_REGISTRATION'],
    });

    // Given a platform connected by a member of SECOND ORGA
    await loginPage.navigateToAndLogin(SECOND_ORGA.REGISTERER_EMAIL);
    await page.waitForURL('/app');
    await registerPage.navigateTo('register-opencti', PLATFORM);
    await registerPage.selectOrganization(SECOND_ORGA.NAME);
    await registerPage.connect();
    await expect(
      page.getByRole('heading', {
        name: 'OpenCTI product connected successfully',
      })
    ).toBeVisible();
  });

  test('a user of another organization cannot take over an active registration', async ({
    page,
  }) => {
    const before = await getPlatformRegistration(PLATFORM.id);
    expect(before).toMatchObject({
      status: 'active',
      organizationName: SECOND_ORGA.NAME,
    });

    // When a user of another organization connects the same platform
    await loginPage.switchUser(TAKEOVER_USER_EMAIL);
    await registerPage.navigateTo('register-opencti', PLATFORM);
    await registerPage.selectOrganization(TAKEOVER_ORGANIZATION);
    await registerPage.connect();

    // Then it is refused and nothing changed
    await expect(
      page.getByRole('heading', { name: 'Registration failed' })
    ).toBeVisible();
    await expect(
      page.getByText('Missing permissions', { exact: true })
    ).toBeVisible();
    expect(await getPlatformRegistration(PLATFORM.id)).toEqual(before);
  });

  test('an admin unregisters a platform and a user of another organization connects it again', async ({
    page,
  }) => {
    const connected = await getPlatformRegistration(PLATFORM.id);

    await test.step('the platform admin unregisters it, without being in its organization', async () => {
      await loginPage.switchUser(ADMIN_EMAIL);
      await adminPage.navigateTo();
      await adminPage.search(PLATFORM.title);
      await expect(adminPage.getStatus(PLATFORM.title, 'Active')).toBeVisible();
      await expect(adminPage.getRow(PLATFORM.title)).toContainText(
        SECOND_ORGA.NAME
      );

      await adminPage.unregister(PLATFORM.title);

      await expect(
        adminPage.getUnregisterSuccess(PLATFORM.title)
      ).toBeVisible();
      await expect(
        adminPage.getStatus(PLATFORM.title, 'Inactive')
      ).toBeVisible();
      await expect(adminPage.getUnregisterButton(PLATFORM.title)).toHaveCount(
        0
      );
      expect(await getPlatformRegistration(PLATFORM.id)).toMatchObject({
        status: 'inactive',
        organizationName: SECOND_ORGA.NAME,
      });
    });

    await test.step('a user of another organization connects it, with a new token', async () => {
      await loginPage.switchUser(TAKEOVER_USER_EMAIL);
      await registerPage.navigateTo('register-opencti', PLATFORM);
      await registerPage.selectOrganization(TAKEOVER_ORGANIZATION);
      await registerPage.connect();
      await expect(
        page.getByRole('heading', {
          name: 'OpenCTI product connected successfully',
        })
      ).toBeVisible();

      const reconnected = await getPlatformRegistration(PLATFORM.id);
      expect(reconnected).toMatchObject({
        status: 'active',
        organizationName: TAKEOVER_ORGANIZATION,
      });
      expect(reconnected.token).not.toBe(connected.token);
    });

    await test.step('the admin sees it active in its new organization, and may unregister it again', async () => {
      await loginPage.switchUser(ADMIN_EMAIL);
      await adminPage.navigateTo();
      await adminPage.search(PLATFORM.title);
      await expect(adminPage.getStatus(PLATFORM.title, 'Active')).toBeVisible();
      await expect(adminPage.getRow(PLATFORM.title)).toContainText(
        TAKEOVER_ORGANIZATION
      );
      await expect(adminPage.getUnregisterButton(PLATFORM.title)).toBeVisible();
    });
  });
});
