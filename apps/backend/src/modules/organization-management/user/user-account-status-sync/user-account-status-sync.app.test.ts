import type { Management } from 'auth0';
import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import {
  DeploymentRequestHubStatus,
  PlatformIdentifier,
  UserAccountStatus,
} from '../../../../__generated__/resolvers-types';
import { DeploymentRequestId } from '../../../../model/kanel/public/DeploymentRequest';
import { ServiceGroupId } from '../../../../model/kanel/public/ServiceGroup';
import User, { UserId } from '../../../../model/kanel/public/User';
import * as mailService from '../../../../server/mail-service';
import { auth0ClientMock } from '../../../../thirdparty/auth0/mock';
import { PgBossProducer } from '../../../../thirdparty/pgboss/producer';
import { logApp } from '../../../../utils/app-logger.util';
import { ErrorCode } from '../../../../utils/error/error.code';
import * as FeatureFlagUtil from '../../../../utils/feature-flag.util';
import { chunk } from '../../../../utils/utils';
import { ServiceGroupApp } from '../../../deployment/group/service-group.app';
import { UserDomain } from '../user-domain/user.domain';
import {
  decideAuth0Sync,
  UserAccountStatusSyncApp,
} from './user-account-status-sync.app';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Older than any user another test may leave behind, so that they come first in the run.
const ANCIENT_DAYS = 40000;
const FREE_TRIAL_BUNDLE_USER_ADDED_TEMPLATE = 'free_trial_bundle_user_added';
const rateLimitError = () => TestHelper.auth0.managementError(429);
const OPTIONS = {
  maxUsersPerRun: 500,
  concurrency: 3,
  deadlineMinutes: 30,
};

describe('userAccountStatusSyncApp.syncUserAccountStatusWithAuth0', () => {
  const createdUserIds: UserId[] = [];
  const createdBundleIds: DeploymentRequestId[] = [];
  // Auth0 accounts by lowercased email, read by the mocked client.
  let auth0Accounts: Map<string, Management.UserResponseSchema[]>;

  const createUser = async (
    status: UserAccountStatus,
    daysSinceInvitation = 1
  ): Promise<User> => {
    const user = await TestHelper.user.insert({
      email: `${uuidv4()}@auth0-sync.test`,
      status,
      invitation_date: new Date(Date.now() - daysSinceInvitation * MS_PER_DAY),
    });
    createdUserIds.push(user.id);
    return user;
  };

  const addTrialMembership = async (user: User) => {
    const { bundle, children } =
      await TestHelper.deploymentRequest.createBundle({
        bundle: { end_date: new Date(Date.now() + 10 * MS_PER_DAY) },
        children: [
          {
            platform_identifier: PlatformIdentifier.Opencti,
            hub_status: DeploymentRequestHubStatus.Active,
            platform_id: uuidv4(),
          },
        ],
      });
    createdBundleIds.push(bundle.id);
    const groupId = uuidv4() as ServiceGroupId;
    await TestHelper.serviceGroup.create({
      id: groupId,
      name: 'Admin',
      service_instance_id: children[0]!.service_instance_id,
    });
    await TestHelper.serviceGroupUser.create({
      user_id: user.id,
      group_id: groupId,
    });
  };

  const trialMailRecipients = (sendMailSpy: { mock: { calls: unknown[][] } }) =>
    (sendMailSpy.mock.calls as [{ template: string; to: string }][])
      .map(([mail]) => mail)
      .filter(
        ({ template }) => template === FREE_TRIAL_BUNDLE_USER_ADDED_TEMPLATE
      )
      .map(({ to }) => to);

  const account = (
    user: User,
    lastPasswordReset?: string
  ): Management.UserResponseSchema => ({
    user_id: `auth0|${user.id}`,
    email: user.email,
    last_password_reset: lastPasswordReset,
  });

  const setAccounts = (user: User, accounts: Management.UserResponseSchema[]) =>
    auth0Accounts.set(user.email.toLowerCase(), accounts);

  const statusOf = async (user: User) =>
    (await TestHelper.user.load({ id: user.id })).status;

  const requestedEmails = () =>
    vi
      .mocked(auth0ClientMock.getUsersByEmails)
      .mock.calls.flatMap(([emails]) => emails);

  const errorLogsAbout = (users: User[]) =>
    vi
      .mocked(logApp.error)
      .mock.calls.filter(([, fields]) =>
        users.some(({ id }) => JSON.stringify(fields ?? {}).includes(id))
      );

  const countUsersToSync = async () => {
    const waiting = await TestHelper.user.loadAll({
      status: UserAccountStatus.Waiting,
    });
    const invited = await TestHelper.user.loadAll({
      status: UserAccountStatus.Invited,
    });
    return waiting.length + invited.length;
  };

  beforeEach(async () => {
    auth0Accounts = new Map();
    vi.spyOn(FeatureFlagUtil, 'isFeatureEnabled').mockReturnValue(true);
    vi.spyOn(auth0ClientMock, 'getUsersByEmails').mockImplementation(
      async (emails) =>
        new Map(
          emails.flatMap((email) => {
            const accounts = auth0Accounts.get(email.toLowerCase());
            return accounts ? [[email.toLowerCase(), accounts] as const] : [];
          })
        )
    );
    // Same contract as the real function: the status is written on success.
    vi.spyOn(ServiceGroupApp, 'grantUserAccessAndSetStatus').mockImplementation(
      async (user, newStatus) => {
        await TestHelper.user.update({ id: user.id }, { status: newStatus });
      }
    );
    vi.spyOn(logApp, 'info').mockImplementation(() => logApp);
    vi.spyOn(logApp, 'warn').mockImplementation(() => logApp);
    vi.spyOn(logApp, 'error').mockImplementation(() => logApp);
    vi.spyOn(logApp, 'debug').mockImplementation(() => logApp);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    try {
      for (const bundleId of createdBundleIds) {
        await TestHelper.deploymentRequest.deleteBundle(bundleId);
      }
      for (const id of createdUserIds) {
        await TestHelper.user.delete({ id });
      }
    } finally {
      createdBundleIds.length = 0;
      createdUserIds.length = 0;
    }
  });

  it('should do nothing when the TRIAL_INVITE flag is disabled', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Waiting);
    vi.spyOn(FeatureFlagUtil, 'isFeatureEnabled').mockReturnValue(false);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(auth0ClientMock.getUsersByEmails).not.toHaveBeenCalled();
    expect(logApp.info).toHaveBeenCalledWith(
      'Auth0 sync skipped: TRIAL_INVITE disabled'
    );
    expect(await statusOf(user)).toBe(UserAccountStatus.Waiting);
  });

  it('should log and return when no user needs syncing', async () => {
    // Given
    vi.spyOn(UserDomain, 'loadUsersToSyncAccountStatus').mockResolvedValue([]);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(auth0ClientMock.getUsersByEmails).not.toHaveBeenCalled();
    expect(logApp.info).toHaveBeenCalledWith('Auth0 sync: no users to sync');
  });

  it('should grant access and clear the status of a waiting user who reset his password', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Waiting);
    const accounts = [account(user, '2026-01-01T00:00:00.000Z')];
    setAccounts(user, accounts);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(ServiceGroupApp.grantUserAccessAndSetStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: user.id }),
      null,
      UserAccountStatus.Waiting,
      { syncAuth0: true, prefetchedAuth0Users: accounts }
    );
    expect(await statusOf(user)).toBeNull();
    expect(logApp.info).toHaveBeenCalledWith('Auth0 sync: access granted', {
      userId: user.id,
    });
    expect(logApp.info).toHaveBeenCalledWith(
      expect.stringMatching(/^Auth0 sync done in \d+ms: /)
    );
  });

  it('should keep a waiting user waiting when access cannot be granted', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Waiting);
    setAccounts(user, [account(user, '2026-01-01T00:00:00.000Z')]);
    vi.spyOn(ServiceGroupApp, 'grantUserAccessAndSetStatus').mockRejectedValue(
      new Error('auth0 is down')
    );

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(await statusOf(user)).toBe(UserAccountStatus.Waiting);
    expect(logApp.error).toHaveBeenCalledWith(
      'Auth0 sync: 1 users could not be granted access',
      { count: 1, userIds: [user.id] }
    );
  });

  it('should grant access and set invited for a waiting user with an account but no password reset', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Waiting);
    setAccounts(user, [account(user)]);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(ServiceGroupApp.grantUserAccessAndSetStatus).toHaveBeenCalledTimes(
      1
    );
    expect(await statusOf(user)).toBe(UserAccountStatus.Invited);
    expect(logApp.info).toHaveBeenCalledWith(
      'Auth0 sync: user status changed from waiting to invited',
      {
        userId: user.id,
        fromStatus: UserAccountStatus.Waiting,
        toStatus: UserAccountStatus.Invited,
      }
    );
  });

  it('should keep a waiting user waiting when no Auth0 account exists', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Waiting);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(ServiceGroupApp.grantUserAccessAndSetStatus).not.toHaveBeenCalled();
    expect(await statusOf(user)).toBe(UserAccountStatus.Waiting);
    expect(requestedEmails()).toContain(user.email);
  });

  it('should grant access with a null status to an invited user who reset his password', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Invited);
    const accounts = [account(user, '2026-01-01T00:00:00.000Z')];
    setAccounts(user, accounts);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(ServiceGroupApp.grantUserAccessAndSetStatus).toHaveBeenCalledTimes(
      1
    );
    expect(ServiceGroupApp.grantUserAccessAndSetStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: user.id }),
      null,
      UserAccountStatus.Invited,
      { syncAuth0: false, prefetchedAuth0Users: accounts }
    );
    expect(await statusOf(user)).toBeNull();
    expect(logApp.info).toHaveBeenCalledWith(
      'Auth0 sync: user status changed from invited to null',
      {
        userId: user.id,
        fromStatus: UserAccountStatus.Invited,
        toStatus: null,
      }
    );
  });

  it('should leave an invited user who did not reset his password unchanged', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Invited);
    setAccounts(user, [account(user)]);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(ServiceGroupApp.grantUserAccessAndSetStatus).not.toHaveBeenCalled();
    expect(await statusOf(user)).toBe(UserAccountStatus.Invited);
  });

  it('should expire an invited user whose Auth0 account is gone', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Invited);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(await statusOf(user)).toBe(UserAccountStatus.Expired);
    expect(logApp.info).toHaveBeenCalledWith(
      'Auth0 sync: user status changed from invited to expired',
      {
        userId: user.id,
        fromStatus: UserAccountStatus.Invited,
        toStatus: UserAccountStatus.Expired,
      }
    );
  });

  it('should consider a password reset on any of several Auth0 accounts and pass them all to the grant', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Waiting);
    const accounts = [
      account(user),
      { ...account(user, '2026-01-01T00:00:00.000Z'), user_id: 'auth0|other' },
    ];
    setAccounts(user, accounts);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(ServiceGroupApp.grantUserAccessAndSetStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: user.id }),
      null,
      UserAccountStatus.Waiting,
      { syncAuth0: true, prefetchedAuth0Users: accounts }
    );
    expect(await statusOf(user)).toBeNull();
  });

  it('should ignore users that are not waiting or invited', async () => {
    // Given
    const expired = await createUser(UserAccountStatus.Expired);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(requestedEmails()).not.toContain(expired.email);
    expect(await statusOf(expired)).toBe(UserAccountStatus.Expired);
  });

  it('should look up Auth0 accounts by chunks of 50 emails', async () => {
    // Given
    const users: User[] = [];
    for (let i = 0; i < 51; i++) {
      users.push(await createUser(UserAccountStatus.Waiting));
    }
    const total = await countUsersToSync();
    const expectedSizes = chunk(Array.from({ length: total }), 50).map(
      (usersChunk) => usersChunk.length
    );

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    const calls = vi.mocked(auth0ClientMock.getUsersByEmails).mock.calls;
    expect(calls.map(([emails]) => emails.length)).toEqual(expectedSizes);
    expect(expectedSizes[0]).toBe(50);
    expect(requestedEmails()).toEqual(
      expect.arrayContaining(users.map(({ email }) => email))
    );
    expectedSizes.forEach((size, index) => {
      expect(logApp.info).toHaveBeenCalledWith(
        `Auth0 sync: fetched 0 accounts for ${size} users (chunk ${index + 1}/${expectedSizes.length})`
      );
    });
  });

  it('should process the oldest invitations first and warn when capped', async () => {
    // Given
    const oldest = await createUser(UserAccountStatus.Waiting, ANCIENT_DAYS);
    await createUser(UserAccountStatus.Waiting, ANCIENT_DAYS - 1);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0({
      ...OPTIONS,
      maxUsersPerRun: 1,
    });

    // Then
    expect(vi.mocked(auth0ClientMock.getUsersByEmails).mock.calls).toEqual([
      [[oldest.email]],
    ]);
    expect(logApp.warn).toHaveBeenCalledWith(
      'Auth0 sync capped at max_users_per_run (1): remaining users will be synced by the next runs'
    );
  });

  it('should leave everything for the next run when the deadline is reached', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Waiting);
    setAccounts(user, [account(user, '2026-01-01T00:00:00.000Z')]);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0({
      ...OPTIONS,
      deadlineMinutes: 0,
    });

    // Then
    expect(auth0ClientMock.getUsersByEmails).not.toHaveBeenCalled();
    expect(await statusOf(user)).toBe(UserAccountStatus.Waiting);
    expect(logApp.warn).toHaveBeenCalledWith(
      'Auth0 sync stopped: deadline of 0 minutes reached'
    );
    expect(ServiceGroupApp.grantUserAccessAndSetStatus).not.toHaveBeenCalled();
  });

  it('should stop the run when the Auth0 rate limit persists', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Invited);
    vi.spyOn(auth0ClientMock, 'getUsersByEmails').mockRejectedValue(
      rateLimitError()
    );

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(await statusOf(user)).toBe(UserAccountStatus.Invited);
    expect(logApp.warn).toHaveBeenCalledWith(
      'Auth0 sync stopped: Auth0 rate limit persists, remaining users left for next run'
    );
    expect(errorLogsAbout([user])).toEqual([]);
  });

  it('should count users as failed when an Auth0 lookup fails', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Waiting);
    vi.spyOn(auth0ClientMock, 'getUsersByEmails').mockRejectedValue(
      new Error('auth0 is down')
    );

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(await statusOf(user)).toBe(UserAccountStatus.Waiting);
    expect(logApp.error).toHaveBeenCalledWith(
      'Auth0 sync: unable to fetch accounts for a chunk',
      expect.objectContaining({ userIds: expect.arrayContaining([user.id]) })
    );
  });

  it('should log one aggregated error for users still waiting or invited after more than 5 days', async () => {
    // Given
    const staleWaiting = await createUser(UserAccountStatus.Waiting, 6);
    const staleInvited = await createUser(UserAccountStatus.Invited, 7);
    setAccounts(staleInvited, [account(staleInvited)]);
    const fresh = await createUser(UserAccountStatus.Waiting, 2);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    const staleCalls = vi
      .mocked(logApp.error)
      .mock.calls.filter(([message]) =>
        /users still waiting or invited after more than 5 days$/.test(
          String(message)
        )
      );
    expect(staleCalls).toHaveLength(1);
    expect(staleCalls[0]![1]).toMatchObject({
      userIds: expect.arrayContaining([staleWaiting.id, staleInvited.id]),
    });
    expect(staleCalls[0]![1]).not.toMatchObject({
      userIds: expect.arrayContaining([fresh.id]),
    });
  });

  it('should still apply database-only transitions of fetched users when the rate limit hits the second chunk', async () => {
    // Given
    const invitedToActivate = await createUser(
      UserAccountStatus.Invited,
      ANCIENT_DAYS
    );
    setAccounts(invitedToActivate, [
      account(invitedToActivate, '2026-01-01T00:00:00.000Z'),
    ]);
    for (let i = 0; i < 49; i++) {
      await createUser(UserAccountStatus.Waiting, ANCIENT_DAYS - 1);
    }
    const laterUser = await createUser(
      UserAccountStatus.Waiting,
      ANCIENT_DAYS - 2
    );
    vi.spyOn(auth0ClientMock, 'getUsersByEmails')
      .mockImplementationOnce(
        async () =>
          new Map([
            [
              invitedToActivate.email.toLowerCase(),
              auth0Accounts.get(invitedToActivate.email.toLowerCase())!,
            ],
          ])
      )
      .mockRejectedValueOnce(rateLimitError());

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(await statusOf(invitedToActivate)).toBeNull();
    expect(await statusOf(laterUser)).toBe(UserAccountStatus.Waiting);
    expect(logApp.warn).toHaveBeenCalledWith(
      'Auth0 sync stopped: Auth0 rate limit persists, remaining users left for next run'
    );
    expect(vi.mocked(auth0ClientMock.getUsersByEmails).mock.calls).toHaveLength(
      2
    );
    expect(requestedEmails()).toContain(laterUser.email);
  });

  it('should skip a database-only transition when the status changed concurrently', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Invited);
    vi.spyOn(auth0ClientMock, 'getUsersByEmails').mockImplementation(
      async () => {
        await TestHelper.user.update(
          { id: user.id },
          {
            status: UserAccountStatus.Waiting,
          }
        );
        return new Map();
      }
    );

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(await statusOf(user)).toBe(UserAccountStatus.Waiting);
    expect(logApp.info).toHaveBeenCalledWith(
      'Auth0 sync: user status changed concurrently, skipped',
      { userId: user.id }
    );
    expect(errorLogsAbout([user])).toEqual([]);
    expect(logApp.info).not.toHaveBeenCalledWith(
      expect.stringContaining('user status changed from'),
      expect.objectContaining({ userId: user.id })
    );
  });

  it('should validate an invited user who reset his password with one welcome email and no Auth0 sync', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Invited);
    await addTrialMembership(user);
    setAccounts(user, [account(user, '2026-01-01T00:00:00.000Z')]);
    vi.mocked(ServiceGroupApp.grantUserAccessAndSetStatus).mockRestore();
    const updateRbacSpy = vi.spyOn(auth0ClientMock, 'updateUserRBACInstance');
    const sendMailSpy = vi
      .spyOn(mailService, 'sendMail')
      .mockResolvedValue(undefined);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(await statusOf(user)).toBeNull();
    expect(trialMailRecipients(sendMailSpy)).toEqual([user.email]);
    expect(updateRbacSpy).not.toHaveBeenCalled();
  });

  it('should still grant an invited user but skip a waiting user when the rate limit hits the second chunk', async () => {
    // Given
    const invited = await createUser(UserAccountStatus.Invited, ANCIENT_DAYS);
    const waiting = await createUser(UserAccountStatus.Waiting, ANCIENT_DAYS);
    const resetAccounts = [invited, waiting].map((user) => {
      const accounts = [account(user, '2026-01-01T00:00:00.000Z')];
      setAccounts(user, accounts);
      return [user.email.toLowerCase(), accounts] as const;
    });
    for (let i = 0; i < 48; i++) {
      await createUser(UserAccountStatus.Waiting, ANCIENT_DAYS - 1);
    }
    await createUser(UserAccountStatus.Waiting, ANCIENT_DAYS - 2);
    vi.spyOn(auth0ClientMock, 'getUsersByEmails')
      .mockImplementationOnce(async () => new Map(resetAccounts))
      .mockRejectedValueOnce(rateLimitError());

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(ServiceGroupApp.grantUserAccessAndSetStatus).toHaveBeenCalledTimes(
      1
    );
    expect(ServiceGroupApp.grantUserAccessAndSetStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: invited.id }),
      null,
      UserAccountStatus.Invited,
      { syncAuth0: false, prefetchedAuth0Users: expect.anything() }
    );
    expect(await statusOf(invited)).toBeNull();
    expect(await statusOf(waiting)).toBe(UserAccountStatus.Waiting);
  });

  it('should skip an invited user validated meanwhile, without email', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Invited);
    await addTrialMembership(user);
    setAccounts(user, [account(user, '2026-01-01T00:00:00.000Z')]);
    vi.mocked(ServiceGroupApp.grantUserAccessAndSetStatus).mockRestore();
    const sendMailSpy = vi.spyOn(mailService, 'sendMail');
    const sendJobSpy = vi.spyOn(PgBossProducer, 'send');
    vi.spyOn(auth0ClientMock, 'getUsersByEmails').mockImplementation(
      async () => {
        await TestHelper.user.update({ id: user.id }, { status: null });
        return new Map([
          [
            user.email.toLowerCase(),
            auth0Accounts.get(user.email.toLowerCase())!,
          ],
        ]);
      }
    );

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(await statusOf(user)).toBeNull();
    expect(logApp.info).toHaveBeenCalledWith(
      'Auth0 sync: user status changed concurrently, skipped',
      { userId: user.id }
    );
    expect(errorLogsAbout([user])).toEqual([]);
    expect(sendMailSpy).not.toHaveBeenCalled();
    expect(sendJobSpy).not.toHaveBeenCalled();
  });

  it('should skip a grant when the status changed concurrently, without email', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Waiting);
    setAccounts(user, [account(user, '2026-01-01T00:00:00.000Z')]);
    vi.mocked(ServiceGroupApp.grantUserAccessAndSetStatus).mockRestore();
    const sendMailSpy = vi.spyOn(mailService, 'sendMail');
    const sendJobSpy = vi.spyOn(PgBossProducer, 'send');
    vi.spyOn(auth0ClientMock, 'getUsersByEmails').mockImplementation(
      async () => {
        await TestHelper.user.update(
          { id: user.id },
          {
            status: UserAccountStatus.Invited,
          }
        );
        return new Map([
          [
            user.email.toLowerCase(),
            auth0Accounts.get(user.email.toLowerCase())!,
          ],
        ]);
      }
    );

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(await statusOf(user)).toBe(UserAccountStatus.Invited);
    expect(logApp.info).toHaveBeenCalledWith(
      'Auth0 sync: user status changed concurrently, skipped',
      { userId: user.id }
    );
    expect(errorLogsAbout([user])).toEqual([]);
    expect(sendMailSpy).not.toHaveBeenCalled();
    expect(sendJobSpy).not.toHaveBeenCalled();
  });

  it('should skip a user when the grant reports a concurrent status change', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Waiting);
    setAccounts(user, [account(user, '2026-01-01T00:00:00.000Z')]);
    vi.spyOn(
      ServiceGroupApp,
      'grantUserAccessAndSetStatus'
    ).mockRejectedValueOnce(new Error(ErrorCode.UserStatusChangedConcurrently));

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(await statusOf(user)).toBe(UserAccountStatus.Waiting);
    expect(logApp.info).toHaveBeenCalledWith(
      'Auth0 sync: user status changed concurrently, skipped',
      { userId: user.id }
    );
    expect(errorLogsAbout([user])).toEqual([]);
  });

  it('should log one aggregated error listing at most 20 users when grants fail', async () => {
    // Given
    for (let i = 0; i < 21; i++) {
      const user = await createUser(UserAccountStatus.Waiting);
      setAccounts(user, [account(user, '2026-01-01T00:00:00.000Z')]);
    }
    vi.spyOn(ServiceGroupApp, 'grantUserAccessAndSetStatus').mockRejectedValue(
      new Error('auth0 is down')
    );

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    const notGrantedCalls = vi
      .mocked(logApp.error)
      .mock.calls.filter(([message]) =>
        /users could not be granted access$/.test(String(message))
      );
    expect(notGrantedCalls).toHaveLength(1);
    expect(notGrantedCalls[0]![0]).toBe(
      'Auth0 sync: 21 users could not be granted access'
    );
    expect(notGrantedCalls[0]![1]).toMatchObject({ count: 21 });
    expect(
      (notGrantedCalls[0]![1] as { userIds: string[] }).userIds
    ).toHaveLength(20);
  });

  it('should not log a stale error for a user resolved during the run', async () => {
    // Given
    const user = await createUser(UserAccountStatus.Waiting, 10);
    setAccounts(user, [account(user, '2026-01-01T00:00:00.000Z')]);

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0(OPTIONS);

    // Then
    expect(errorLogsAbout([user])).toEqual([]);
    expect(await statusOf(user)).toBeNull();
  });

  it('should count a grant hitting the rate limit as skipped and skip the next grants without error log', async () => {
    // Given
    const first = await createUser(UserAccountStatus.Waiting, 5);
    const second = await createUser(UserAccountStatus.Waiting, 4);
    setAccounts(first, [account(first, '2026-01-01T00:00:00.000Z')]);
    setAccounts(second, [account(second, '2026-01-01T00:00:00.000Z')]);
    vi.spyOn(
      ServiceGroupApp,
      'grantUserAccessAndSetStatus'
    ).mockRejectedValueOnce(rateLimitError());

    // When
    await UserAccountStatusSyncApp.syncUserAccountStatusWithAuth0({
      ...OPTIONS,
      concurrency: 1,
    });

    // Then
    expect(ServiceGroupApp.grantUserAccessAndSetStatus).toHaveBeenCalledTimes(
      1
    );
    expect(await statusOf(first)).toBe(UserAccountStatus.Waiting);
    expect(await statusOf(second)).toBe(UserAccountStatus.Waiting);
    expect(logApp.warn).toHaveBeenCalledWith(
      'Auth0 sync stopped: Auth0 rate limit persists, remaining users left for next run'
    );
    expect(errorLogsAbout([first, second])).toEqual([]);
  });
});

describe('decideAuth0Sync', () => {
  const noReset = [{ user_id: 'auth0|1', email: 'a@x.io' }];
  const withReset = [
    { user_id: 'auth0|1', email: 'a@x.io', last_password_reset: '2026-01-01' },
  ];

  it.each([
    {
      status: UserAccountStatus.Invited,
      accounts: [],
      expected: { syncAuth0: false, newStatus: UserAccountStatus.Expired },
    },
    {
      status: UserAccountStatus.Waiting,
      accounts: [],
      expected: { syncAuth0: false, newStatus: undefined },
    },
    {
      status: UserAccountStatus.Waiting,
      accounts: withReset,
      expected: { syncAuth0: true, newStatus: null },
    },
    {
      status: UserAccountStatus.Invited,
      accounts: withReset,
      expected: { syncAuth0: false, newStatus: null },
    },
    {
      status: UserAccountStatus.Waiting,
      accounts: noReset,
      expected: { syncAuth0: true, newStatus: UserAccountStatus.Invited },
    },
    {
      status: UserAccountStatus.Invited,
      accounts: noReset,
      expected: { syncAuth0: false, newStatus: undefined },
    },
  ])(
    'should return $expected for a $status user with $accounts.length accounts',
    ({ status, accounts, expected }) => {
      // When
      const target = decideAuth0Sync(status, accounts);

      // Then
      expect(target).toEqual(expected);
    }
  );
});
