import { describe, expect, it } from 'vitest';
import { ActionType } from '../../knexfile';
import { UserLoadUserBy } from '../model/user';
import { TypedNode } from '../pub';
import { meUserSSESecurity } from './user-security-access';

const USER_ID = 'b8f1c0a6-3c1e-4a8e-9a55-3f0f6c1d2e01';
const OTHER_USER_ID = 'c2d7e5f4-7b9a-4f1e-8c3d-6a5b4c3d2e02';

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
