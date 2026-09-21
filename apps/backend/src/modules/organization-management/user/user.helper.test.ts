import { describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import * as pub from '../../../pub';
import { UserHelper } from './user.helper';

describe('userHelper', () => {
  describe('dispatchPendingDeletedForOrganizations', () => {
    it('should dispatch a UserPending delete event for each given organization', async () => {
      const user = await TestHelper.user.load({
        id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      });
      const dispatchSpy = vi.spyOn(pub, 'dispatch');

      await UserHelper.dispatchPendingDeletedForOrganizations(user, [
        TEST_ORGANIZATIONS.FILIGRAN.ID,
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      ]);

      expect(dispatchSpy).toHaveBeenCalledTimes(2);
      expect(dispatchSpy).toHaveBeenCalledWith(
        'UserPending',
        'delete',
        expect.objectContaining({
          id: user.id,
          pending_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        }),
        'User'
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        'UserPending',
        'delete',
        expect.objectContaining({
          id: user.id,
          pending_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        }),
        'User'
      );
    });

    it('should not dispatch anything when given an empty list of organizations', async () => {
      const user = await TestHelper.user.load({
        id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      });
      const dispatchSpy = vi.spyOn(pub, 'dispatch');

      await UserHelper.dispatchPendingDeletedForOrganizations(user, []);

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });
});
