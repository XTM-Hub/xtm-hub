import { PortalContext } from '@/components/me/AppPortalContext';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { meContext_fragment$data } from '@generated/meContext_fragment.graphql';
import {
  MeOrganizationsQuery,
  useMeOrganizationsQuery,
} from '@graphql/generated';
import { useContext } from 'react';

const toMeOrganizationsQuery = (
  me: meContext_fragment$data
): MeOrganizationsQuery => ({
  me: {
    id: me.id,
    selected_organization_id: me.selected_organization_id,
    organizations: me.organizations.map(({ id, name, personal_space }) => ({
      id,
      name,
      personal_space,
    })),
  },
});

// Seeded with the user loaded on the server, so the first render already has
// the organizations and the selection. Only an organization edit or deletion,
// which invalidates the query, loads it again; if that fails, the seeded
// organizations stay available.
export const useMeOrganizations = () => {
  const { me } = useContext(PortalContext);
  return useMeOrganizationsQuery(portalGraphqlClient, undefined, {
    enabled: Boolean(me),
    initialData: me ? () => toMeOrganizationsQuery(me) : undefined,
    staleTime: Infinity,
  });
};
