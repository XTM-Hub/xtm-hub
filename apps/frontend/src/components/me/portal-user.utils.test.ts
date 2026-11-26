import { toPortalUser } from '@/components/me/portal-user.utils';
import { mockUser } from '@graphql/mocks';
import { describe, expect, it } from 'vitest';

const USER_ID = 'user-1';
const ORGANIZATION_ID = 'organization-1';

describe('toPortalUser', () => {
  it('should keep every field of the user when the required fields are resolved', () => {
    // Given
    const user = mockUser({
      id: USER_ID,
      selected_organization_id: ORGANIZATION_ID,
    });

    // When
    const portalUser = toPortalUser(user);

    // Then
    expect(portalUser).toEqual(user);
  });

  it.each([['selected_organization_id'], ['capabilities'], ['organizations']])(
    'should name the field when %s is not resolved',
    (field) => {
      // Given
      const user = mockUser({ id: USER_ID, [field]: null });

      // When
      const convert = () => toPortalUser(user);

      // Then
      expect(convert).toThrow(`Current user ${USER_ID} is missing ${field}`);
    }
  );
});
