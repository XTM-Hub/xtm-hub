import {
  meOrganizationDomainsKeys,
  meOrganizationsKeys,
} from '@graphql/me/me.keys';
import { organizationKeys } from '@graphql/organization/organization.keys';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Besides the admin list, the user's own organizations are read by the header
 * switcher (names) and by the trial user options (domains). Editing or deleting
 * an organization the admin belongs to changes both, so every write invalidates
 * all of them at once.
 */
export const invalidateOrganizationQueries = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: organizationKeys.all() }),
    queryClient.invalidateQueries({ queryKey: meOrganizationsKeys.all() }),
    queryClient.invalidateQueries({
      queryKey: meOrganizationDomainsKeys.all(),
    }),
  ]);
