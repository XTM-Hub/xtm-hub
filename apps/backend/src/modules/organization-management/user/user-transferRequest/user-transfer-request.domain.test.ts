import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { UserProvisioningDomain } from '../user-provisioning/user-provisioning.domain';
import { UserTransferRequestDomain } from './user-transfer-request.domain';

describe('userTransferRequestDomain', () => {
  describe('countTransferRequestsForUser', () => {
    it('should count transfer requests involving the user in either direction, ignoring unrelated ones', async () => {
      const user = await UserProvisioningDomain.createUser(
        { email: `count-transfer-requests-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );
      const counterpartA = await UserProvisioningDomain.createUser(
        { email: `count-transfer-requests-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );
      const counterpartB = await UserProvisioningDomain.createUser(
        { email: `count-transfer-requests-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );
      const unrelatedA = await UserProvisioningDomain.createUser(
        { email: `count-transfer-requests-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );
      const unrelatedB = await UserProvisioningDomain.createUser(
        { email: `count-transfer-requests-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );

      expect(
        await UserTransferRequestDomain.countTransferRequestsForUser(user.id)
      ).toBe(0);

      await UserTransferRequestDomain.insertNewUserTransfer({
        from_user_id: unrelatedA.id,
        to_user_id: unrelatedB.id,
      });
      await UserTransferRequestDomain.insertNewUserTransfer({
        from_user_id: user.id,
        to_user_id: counterpartA.id,
      });
      await UserTransferRequestDomain.insertNewUserTransfer({
        from_user_id: counterpartB.id,
        to_user_id: user.id,
      });

      expect(
        await UserTransferRequestDomain.countTransferRequestsForUser(user.id)
      ).toBe(2);
    });
  });
});
