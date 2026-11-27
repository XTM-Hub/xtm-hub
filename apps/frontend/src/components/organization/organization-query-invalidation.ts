import {
  meOrganizationDomainsKeys,
  meOrganizationsKeys,
} from '@graphql/me/me.keys';
import {
  adminOrganizationsKeys,
  organizationKeys,
} from '@graphql/organization/organization.keys';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Organizations are read by the admin list, by the organization pickers, by the
 * header switcher (the user's own, names) and by the trial user options (domains).
 * Creating, editing or deleting one can change any of them, so every write
 * invalidates all of them at once.
 */
export const invalidateOrganizationQueries = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: adminOrganizationsKeys.all() }),
    queryClient.invalidateQueries({ queryKey: organizationKeys.all() }),
    queryClient.invalidateQueries({ queryKey: meOrganizationsKeys.all() }),
    queryClient.invalidateQueries({
      queryKey: meOrganizationDomainsKeys.all(),
    }),
  ]);
