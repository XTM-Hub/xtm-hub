import { invalidateOrganizationQueries } from '@/components/organization/organization-query-invalidation';
import {
  meOrganizationDomainsKeys,
  meOrganizationsKeys,
} from '@graphql/me/me.keys';
import { organizationKeys } from '@graphql/organization/organization.keys';
import { QueryClient } from '@tanstack/react-query';

describe('invalidateOrganizationQueries', () => {
  it.each`
    key                                | description
    ${organizationKeys.all()}          | ${'the admin organization list'}
    ${meOrganizationsKeys.all()}       | ${"the header switcher's organizations"}
    ${meOrganizationDomainsKeys.all()} | ${"the trial user options' organization domains"}
  `('should invalidate $description', async ({ key }) => {
    // Given
    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue();

    // When
    await invalidateOrganizationQueries(queryClient);

    // Then
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: key });
  });
});
