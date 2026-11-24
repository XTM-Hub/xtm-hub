import { expect, test } from '../../fixtures/baseFixtures';
import { SECOND_ORGA } from '../../db-utils/const';
import { getPlatformRegistration } from '../../db-utils/platform-configuration.helper';
import { createOrganizationMember } from '../../db-utils/user.helper';
import AdminRegisteredPlatformsPage from '../../model/admin-registered-platforms.pageModel';
import LoginPage from '../../model/login.pageModel';
import RegisterPage, { PlatformDetails } from '../../model/register.pageModel';
import {
  announceCheckpoint,
  announceDbQueryBeforeAfter,
  announceInitialData,
  announceStep,
  clearStepBanner,
} from './demo-caption.util';

// Recorded with `yarn test:e2e:demo tests/tests_files/demo/admin-registered-platforms.demo.spec.ts`, which sets
// E2E_DEMO. The same scenarios run, without captions, in ../admin-registered-platforms.spec.ts.
test.skip(
  !process.env.E2E_DEMO,
  'Demo recording only: run it with test:e2e:demo'
);

const PLATFORM: PlatformDetails = {
  url: 'http://localhost:3000',
  title: 'Platform To Unregister',
  id: '0b8d2f1c-6a52-4d54-9f5b-3a3d0a1e7c11',
  contract: 'EE',
};
const TAKEOVER_ORGANIZATION = 'Takeover Org';
const TAKEOVER_USER_EMAIL = 'takeover@takeover-org.com';
const ADMIN_EMAIL = 'admin@filigran.io';

const REGISTRATION_QUERY =
  'SELECT status, organization, token_changed_since_first_connection\n' +
  'FROM PlatformConfiguration JOIN Subscription JOIN Organization\n' +
  `WHERE platform_id = '${PLATFORM.id}'`;

test('admin unregister, takeover by another organization, and an active registration that cannot be overridden', async ({
  page,
}) => {
  const loginPage = new LoginPage(page);
  const registerPage = new RegisterPage(page);
  const adminPage = new AdminRegisteredPlatformsPage(page);

  await createOrganizationMember({
    email: TAKEOVER_USER_EMAIL,
    organizationName: TAKEOVER_ORGANIZATION,
    capabilities: ['MANAGE_PLATFORM_REGISTRATION'],
  });

  await loginPage.navigateTo();
  await announceInitialData(
    page,
    'Disconnecting a platform from the admin side, and connecting it again',
    [
      `${SECOND_ORGA.NAME}: owns the platform, its registerer connects it`,
      `${TAKEOVER_ORGANIZATION}: another organization, its user may manage platform registrations`,
      'admin@filigran.io: platform admin, member of neither organization',
    ],
    9000
  );

  // The database view that proves each state, without ever showing the token.
  const registrationState = async (firstToken: string | null) => {
    const { status, organizationName, token } = await getPlatformRegistration(
      PLATFORM.id
    );
    return {
      status,
      organization: organizationName,
      token_changed_since_first_connection:
        firstToken === null ? null : token !== firstToken,
    };
  };

  await announceStep(
    page,
    `1. A ${SECOND_ORGA.NAME} member connects the platform`
  );
  await loginPage.login(SECOND_ORGA.REGISTERER_EMAIL);
  await page.waitForURL('/app');
  await registerPage.navigateTo('register-opencti', PLATFORM);
  await registerPage.selectOrganization(SECOND_ORGA.NAME);
  await registerPage.connect();
  await expect(
    page.getByRole('heading', {
      name: 'OpenCTI product connected successfully',
    })
  ).toBeVisible();
  const first = await getPlatformRegistration(PLATFORM.id);
  await announceCheckpoint(
    page,
    `Connected: the platform is active in ${SECOND_ORGA.NAME}`
  );

  await announceStep(
    page,
    `2. A user of ${TAKEOVER_ORGANIZATION} tries to connect the same platform while it is active`
  );
  await clearStepBanner(page);
  await loginPage.switchUser(TAKEOVER_USER_EMAIL);
  await registerPage.navigateTo('register-opencti', PLATFORM);
  await registerPage.selectOrganization(TAKEOVER_ORGANIZATION);
  await registerPage.connect();
  await expect(
    page.getByRole('heading', { name: 'Registration failed' })
  ).toBeVisible();
  await announceCheckpoint(
    page,
    'Refused: an active registration cannot be overridden by another organization'
  );
  await announceDbQueryBeforeAfter(
    page,
    `Nothing changed: still active in ${SECOND_ORGA.NAME}`,
    REGISTRATION_QUERY,
    { status: first.status, organization: first.organizationName },
    await registrationState(first.token)
  );

  await announceStep(
    page,
    `3. The platform admin unregisters it, as the ${SECOND_ORGA.NAME} member who connected it left`
  );
  await clearStepBanner(page);
  await loginPage.switchUser(ADMIN_EMAIL);
  await adminPage.navigateTo();
  await adminPage.search(PLATFORM.title);
  await expect(adminPage.getStatus(PLATFORM.title, 'Active')).toBeVisible();
  const beforeUnregister = await registrationState(first.token);
  await adminPage.unregister(PLATFORM.title);
  await expect(adminPage.getStatus(PLATFORM.title, 'Inactive')).toBeVisible();
  await expect(adminPage.getUnregisterButton(PLATFORM.title)).toHaveCount(0);
  await announceCheckpoint(
    page,
    'Unregistered: the row is inactive and the button is gone'
  );
  const unregistered = await registrationState(first.token);
  await announceDbQueryBeforeAfter(
    page,
    'The registration is inactive in the database',
    REGISTRATION_QUERY,
    beforeUnregister,
    unregistered
  );

  await announceStep(
    page,
    `4. A user of ${TAKEOVER_ORGANIZATION} connects the unregistered platform`
  );
  await clearStepBanner(page);
  await loginPage.switchUser(TAKEOVER_USER_EMAIL);
  await registerPage.navigateTo('register-opencti', PLATFORM);
  await registerPage.selectOrganization(TAKEOVER_ORGANIZATION);
  await registerPage.connect();
  await expect(
    page.getByRole('heading', {
      name: 'OpenCTI product connected successfully',
    })
  ).toBeVisible();
  await announceCheckpoint(
    page,
    `Connected again, now in ${TAKEOVER_ORGANIZATION}, with a new token`
  );
  await announceDbQueryBeforeAfter(
    page,
    `Taken over: active in ${TAKEOVER_ORGANIZATION} with a new token`,
    REGISTRATION_QUERY,
    unregistered,
    await registrationState(first.token)
  );

  await announceStep(
    page,
    '5. The admin sees it active in its new organization'
  );
  await clearStepBanner(page);
  await loginPage.switchUser(ADMIN_EMAIL);
  await adminPage.navigateTo();
  await adminPage.search(PLATFORM.title);
  await expect(adminPage.getStatus(PLATFORM.title, 'Active')).toBeVisible();
  await expect(adminPage.getRow(PLATFORM.title)).toContainText(
    TAKEOVER_ORGANIZATION
  );
  await announceCheckpoint(
    page,
    `Active in ${TAKEOVER_ORGANIZATION}, and it can be unregistered again`,
    6000
  );
});
