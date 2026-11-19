import { describe, expect, it } from 'vitest';
import {
  CAPABILITY_READ_ORGANIZATION_MEMBERS,
  CAPABILITY_READ_SAAS_METRICS,
  requestContextSimpleUserFiligran2,
} from '../../../../tests/tests.const';
import { UserLoadUserBy } from '../../../model/user';
import { CAPABILITY_BYPASS } from '../../../portal.const';
import { isUserRestrictedToOwnOrganizationMembers } from './organization.security';

describe('isUserRestrictedToOwnOrganizationMembers', () => {
  it.each([
    ['BYPASS', [CAPABILITY_BYPASS], false],
    [
      'READ_ORGANIZATION_MEMBERS',
      [CAPABILITY_READ_ORGANIZATION_MEMBERS],
      false,
    ],
    ['another portal capability only', [CAPABILITY_READ_SAAS_METRICS], true],
    ['no portal capability', [], true],
    ['no capabilities at all', undefined, true],
  ])(
    'should answer the expected restriction when the user has %s',
    (_, capabilities, expected) => {
      // Given
      const user = {
        ...requestContextSimpleUserFiligran2.user,
        capabilities,
      } as UserLoadUserBy;

      // When
      const restricted = isUserRestrictedToOwnOrganizationMembers(user);

      // Then
      expect(restricted).toBe(expected);
    }
  );
});
