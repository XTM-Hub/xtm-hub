import { expect, test } from '../fixtures/baseFixtures';
import {
  ADMIN_USER,
  OTHER_ORGA_MEMBER,
  PLATFORM_TO_UNREGISTER as PLATFORM,
  SECOND_ORGA,
} from '../db-utils/const';
import { getPlatformRegistration } from '../db-utils/platform-configuration.helper';
import { createOrganizationMember } from '../db-utils/user.helper';
import AdminRegisteredPlatformsPage from '../model/admin-registered-platforms.pageModel';
import LoginPage from '../model/login.pageModel';
import RegisterPage from '../model/register.pageModel';

test.describe('Admin unregister of a registered platform', () => {
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let adminPage: AdminRegisteredPlatformsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    adminPage = new AdminRegisteredPlatformsPage(page);

    await createOrganizationMember({
      email: OTHER_ORGA_MEMBER.EMAIL,
      organizationName: OTHER_ORGA_MEMBER.ORGANIZATION_NAME,
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
    await loginPage.switchUser(OTHER_ORGA_MEMBER.EMAIL);
    await registerPage.navigateTo('register-opencti', PLATFORM);
    await registerPage.selectOrganization(OTHER_ORGA_MEMBER.ORGANIZATION_NAME);
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

  test('an admin unregisters a platform and its organization connects it again', async ({
    page,
  }) => {
    const connected = await getPlatformRegistration(PLATFORM.id);

    await test.step('the platform admin unregisters it, without being in its organization', async () => {
      await loginPage.switchUser(ADMIN_USER.EMAIL);
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

    await test.step('a member of its organization connects it again, with a new token', async () => {
      await loginPage.switchUser(SECOND_ORGA.REGISTERER_EMAIL);
      await registerPage.navigateTo('register-opencti', PLATFORM);
      await registerPage.selectOrganization(SECOND_ORGA.NAME);
      await registerPage.connect();
      await expect(
        page.getByRole('heading', {
          name: 'OpenCTI product connected successfully',
        })
      ).toBeVisible();

      const reconnected = await getPlatformRegistration(PLATFORM.id);
      expect(reconnected).toMatchObject({
        status: 'active',
        organizationName: SECOND_ORGA.NAME,
      });
      expect(reconnected.token).not.toBe(connected.token);
    });

    await test.step('the admin sees it active again, and may unregister it again', async () => {
      await loginPage.switchUser(ADMIN_USER.EMAIL);
      await adminPage.navigateTo();
      await adminPage.search(PLATFORM.title);
      await expect(adminPage.getStatus(PLATFORM.title, 'Active')).toBeVisible();
      await expect(adminPage.getUnregisterButton(PLATFORM.title)).toBeVisible();
    });
  });

  test('a user of another organization connects a platform an admin unregistered', async ({
    page,
  }) => {
    const connected = await getPlatformRegistration(PLATFORM.id);

    await test.step('the platform admin unregisters it', async () => {
      await loginPage.switchUser(ADMIN_USER.EMAIL);
      await adminPage.navigateTo();
      await adminPage.search(PLATFORM.title);
      await adminPage.unregister(PLATFORM.title);
      await expect(
        adminPage.getStatus(PLATFORM.title, 'Inactive')
      ).toBeVisible();
    });

    await test.step('a user of another organization connects it, with a new token', async () => {
      await loginPage.switchUser(OTHER_ORGA_MEMBER.EMAIL);
      await registerPage.navigateTo('register-opencti', PLATFORM);
      await registerPage.selectOrganization(
        OTHER_ORGA_MEMBER.ORGANIZATION_NAME
      );
      await registerPage.connect();
      await expect(
        page.getByRole('heading', {
          name: 'OpenCTI product connected successfully',
        })
      ).toBeVisible();

      const takenOver = await getPlatformRegistration(PLATFORM.id);
      expect(takenOver).toMatchObject({
        status: 'active',
        organizationName: OTHER_ORGA_MEMBER.ORGANIZATION_NAME,
      });
      expect(takenOver.token).not.toBe(connected.token);
    });

    await test.step('the admin sees it active in the new organization', async () => {
      await loginPage.switchUser(ADMIN_USER.EMAIL);
      await adminPage.navigateTo();
      await adminPage.search(PLATFORM.title);
      await expect(adminPage.getStatus(PLATFORM.title, 'Active')).toBeVisible();
      await expect(adminPage.getRow(PLATFORM.title)).toContainText(
        OTHER_ORGA_MEMBER.ORGANIZATION_NAME
      );
      await expect(adminPage.getRow(PLATFORM.title)).not.toContainText(
        SECOND_ORGA.NAME
      );
    });
  });
});
