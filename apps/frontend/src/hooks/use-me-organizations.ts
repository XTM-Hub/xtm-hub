import { PortalContext } from '@/components/me/AppPortalContext';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { meContext_fragment$data } from '@generated/meContext_fragment.graphql';
import {
  MeOrganizationsQuery,
  useMeOrganizationsQuery,
} from '@graphql/generated';
import { meOrganizationsKeys } from '@graphql/me/me.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useContext, useEffect, useMemo, useRef } from 'react';

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

// The user loaded on the server is placeholder data, not initial data: the
// server renders every visitor with the same QueryClient, so initial data
// written to its cache would show one user's organizations to the next.
// Placeholder data is never cached, and still gives the first render the
// organizations and the selection. The query fetches once when it mounts in
// the browser, then again only on an organization edit or deletion, which
// invalidates it, or when the portal user's organizations or selection change,
// as on a MeUser.edit event. Placeholder data is dropped when a fetch fails,
// so the server's organizations stay available until one succeeds.
export const useMeOrganizations = () => {
  const { me } = useContext(PortalContext);
  const queryClient = useQueryClient();
  const portalOrganizations = useMemo(
    () => (me ? toMeOrganizationsQuery(me) : undefined),
    [me]
  );
  const { data } = useMeOrganizationsQuery(portalGraphqlClient, undefined, {
    queryKey: [...useMeOrganizationsQuery.getKey(), me?.id],
    enabled: Boolean(me),
    placeholderData: portalOrganizations,
    staleTime: Infinity,
  });

  // Refetches rather than writing the portal user to the cache: the portal
  // user is not updated by organization edits, so its names can be older than
  // the cached ones. Every component using this hook sees the same change, so
  // they share the refetch instead of cancelling each other's.
  const portalSnapshot = JSON.stringify(portalOrganizations ?? null);
  const previousPortalSnapshot = useRef(portalSnapshot);
  useEffect(() => {
    if (previousPortalSnapshot.current === portalSnapshot) {
      return;
    }
    previousPortalSnapshot.current = portalSnapshot;
    void queryClient.invalidateQueries(
      { queryKey: meOrganizationsKeys.all() },
      { cancelRefetch: false }
    );
  }, [portalSnapshot, queryClient]);

  return { data: data ?? portalOrganizations };
};
