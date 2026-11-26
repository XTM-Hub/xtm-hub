import { describe, expect, it } from 'vitest';
import { ActionType } from '../../knexfile';
import { TEST_ORGANIZATIONS } from '../../tests/tests.const';
import { UserLoadUserBy } from '../model/user';
import { TypedNode } from '../pub';
import { meUserSSESecurity } from './user-security-access';

const USER_ID = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID;
const OTHER_USER_ID = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID;

describe('user-security-access', () => {
  describe('meUserSSESecurity', () => {
    it.each`
      isUserDefined | action      | nodeId           | expected | reason
      ${false}      | ${'edit'}   | ${USER_ID}       | ${false} | ${'user is not defined'}
      ${true}       | ${'edit'}   | ${USER_ID}       | ${true}  | ${'the edited user is the subscriber'}
      ${true}       | ${'delete'} | ${USER_ID}       | ${true}  | ${'the deleted user is the subscriber'}
      ${true}       | ${'edit'}   | ${OTHER_USER_ID} | ${false} | ${'the edited user is another user'}
      ${true}       | ${'add'}    | ${USER_ID}       | ${false} | ${'the action is not edit nor delete'}
    `(
      'should return $expected when $reason',
      ({ isUserDefined, action, nodeId, expected }) => {
        const user = isUserDefined
          ? ({ id: USER_ID } as UserLoadUserBy)
          : undefined;
        const data = {
          [action]: { id: nodeId, __typename: 'User' },
        } as { [action in ActionType]: TypedNode };

        const result = meUserSSESecurity({ user, data });

        expect(result).toBe(expected);
      }
    );
  });
});
