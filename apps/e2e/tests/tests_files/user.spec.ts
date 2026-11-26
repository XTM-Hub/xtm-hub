import { expect, test } from '../fixtures/baseFixtures.js';
import LoginPage from '../model/login.pageModel';
import { addOrganization } from '../db-utils/organization.helper';
import {
  addPendingUserToOrganization,
  createUserWithPersonalSpace,
} from '../db-utils/user.helper';
import UserPage from '../model/user.pageModel';

const TEST_USER = {
  userOrganizationName: 'SECOND ORGA',
  userEmail: 'userInE2E@second-orga.com',
  adminThales: 'admin@second-orga.com',
  otherThalesUserEmail: 'user@second-orga.com',
  pendingUserEmail: 'user.new.pending@second-orga.com',
};

test.describe('User Management', () => {
  let loginPage: LoginPage;
  let userPage: UserPage;

  test.beforeEach(async ({ page }) => {
    await addOrganization(TEST_USER.userOrganizationName);

    loginPage = new LoginPage(page);
    userPage = new UserPage(page);
  });

  test('Should perform complete CRUD of users as BYPASS', async ({ page }) => {
    await loginPage.navigateToAndLogin();
    await userPage.navigateToUserListAdmin();

    await test.step('Add user', async () => {
      await userPage.addUser(
        TEST_USER.userEmail,
        TEST_USER.userOrganizationName
      );
      await expect(
        page
          .getByRole('cell', { name: TEST_USER.userEmail, exact: true })
          .locator('span')
      ).toBeVisible();
    });

    await test.step('Edit user', async () => {
      await userPage.editUser(TEST_USER.userEmail);
      await expect(
        page.getByRole('heading', { name: TEST_USER.userEmail })
      ).toBeVisible();
    });

    await test.step('Disable user', async () => {
      await userPage.disableUser(TEST_USER.userEmail);
      await expect(page.getByRole('cell', { name: 'Disabled' })).toBeVisible();
    });

    await test.step('Delete user', async () => {
      await userPage.deleteUser(TEST_USER.userEmail);
      await expect(
        page
          .getByRole('cell', { name: TEST_USER.userEmail, exact: true })
          .locator('span')
      ).not.toBeVisible();
    });
  });

  test('Should only see authorized users', async ({ page }) => {
    await loginPage.navigateToAndLogin();

    await userPage.navigateToUserListAdmin();
    await expect(page.getByText(TEST_USER.otherThalesUserEmail)).toBeVisible();
    await userPage.navigateToUserManageAccess();
    await expect(
      page.getByText(TEST_USER.otherThalesUserEmail)
    ).not.toBeVisible();
    await loginPage.logout();
    await loginPage.navigateToAndLogin(TEST_USER.userEmail);
    await expect(
      page.getByRole('button', { name: 'Settings', exact: true })
    ).not.toBeVisible();
  });
  test('Should not edit first and last name as MANAGE_ACCESS user', async ({
    page,
  }) => {
    await loginPage.navigateToAndLogin(TEST_USER.adminThales);
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Users', exact: true })
      .click();
    await page.getByRole('button', { name: 'Add user' }).click();
    await expect(
      page.getByRole('textbox', { name: 'First name' })
    ).not.toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Last name' })
    ).not.toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByText(TEST_USER.otherThalesUserEmail).click();
    await expect(
      page.getByRole('textbox', { name: 'First name' })
    ).not.toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Last name' })
    ).not.toBeVisible();
  });

  test('Should approve pending user from action query params', async ({
    page,
  }) => {
    await createUserWithPersonalSpace(TEST_USER.pendingUserEmail);
    const { userId } = await addPendingUserToOrganization(
      TEST_USER.pendingUserEmail,
      TEST_USER.userOrganizationName
    );
    const pendingUserNodeId = Buffer.from(`User:${userId}`).toString('base64');

    await loginPage.navigateToAndLogin(TEST_USER.adminThales);
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Users', exact: true })
      .click();
    await page.goto(
      `/app/manage/user?action=approve&user_id=${pendingUserNodeId}`
    );

    await expect(page).toHaveURL(/\/app\/manage\/user(?:\?.*)?$/);
    await expect(page).not.toHaveURL(/action=approve/);
    await expect(page).not.toHaveURL(/user_id=/);
    await expect(
      page.getByRole('heading', { name: 'Add this user to your organization?' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(
      page.getByText(
        `User request for ${TEST_USER.pendingUserEmail} has been approved`,
        { exact: true }
      )
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Users Requests (0)' })
    ).toBeVisible();
  });
});
