import { describe, expect, it } from 'vitest';
import {
  CAPABILITY_READ_ORGANIZATION_MEMBERS,
  CAPABILITY_READ_SAAS_METRICS,
  requestContextSimpleUserFiligran2,
} from '../../../../tests/tests.const';
import { CAPABILITY_BYPASS } from '../../../portal.const';
import { isUserRestrictedToOwnOrganizationMembers } from './organization.security';

const CAPABILITY_CASES = [
  { name: 'BYPASS', capabilities: [CAPABILITY_BYPASS], restricted: false },
  {
    name: 'READ_ORGANIZATION_MEMBERS',
    capabilities: [CAPABILITY_READ_ORGANIZATION_MEMBERS],
    restricted: false,
  },
  {
    name: 'another portal capability only',
    capabilities: [CAPABILITY_READ_SAAS_METRICS],
    restricted: true,
  },
  { name: 'no portal capability', capabilities: [], restricted: true },
];

describe('isUserRestrictedToOwnOrganizationMembers', () => {
  it.each(CAPABILITY_CASES)(
    'should return $restricted when the user holds $name',
    ({ capabilities, restricted }) => {
      // Given
      const user = { ...requestContextSimpleUserFiligran2.user, capabilities };

      // When
      const result = isUserRestrictedToOwnOrganizationMembers(user);

      // Then
      expect(result).toBe(restricted);
    }
  );
});
