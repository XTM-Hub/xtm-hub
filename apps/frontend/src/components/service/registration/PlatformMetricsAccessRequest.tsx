'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Alert, Button, Icon } from '@filigran/design-system';
import {
  OrganizationCapability,
  useUsersWithCapabilitiesInOrganizationQuery,
} from '@graphql/generated';
import { useContext } from 'react';

export const MAX_DISPLAYED_ADMINISTRATORS = 5;

export const MANAGE_USER_CAPABILITIES_DOCUMENTATION_URL =
  'https://docs.hub.filigran.io/latest/user/manage-organization/#manage-user-capabilities';

interface PlatformMetricsAccessRequestProps {
  platformTitle: string;
}

/**
 * Stands in for the platform metrics when the user may not see them: leads
 * them to an administrator of their organization who can grant the capability.
 */
export const PlatformMetricsAccessRequest = ({
  platformTitle,
}: PlatformMetricsAccessRequestProps) => {
  const t = useTranslate();
  const { me } = useContext(PortalContext);
  const organizationId = me?.selected_organization_id ?? '';

  const { data } = useUsersWithCapabilitiesInOrganizationQuery(
    portalGraphqlClient,
    {
      input: {
        organizationId,
        capabilities: [OrganizationCapability.AdministrateOrganization],
      },
    },
    { enabled: organizationId.length > 0 }
  );
  const administrators = (
    data?.usersWithCapabilitiesInOrganization ?? []
  ).slice(0, MAX_DISPLAYED_ADMINISTRATORS);

  const emailSubject = encodeURIComponent(
    t('Register.Metrics.AccessRequest.EmailSubject', {
      platform: platformTitle,
    })
  );
  const emailBody = encodeURIComponent(
    t('Register.Metrics.AccessRequest.EmailBody', { platform: platformTitle })
  );

  return (
    <Alert
      severity="info"
      className="mt-3"
      title={t('Register.Metrics.AccessRequest.Title')}
      description={
        <>
          {t('Register.Metrics.AccessRequest.Description')}
          {administrators.length > 0 && (
            <>
              {' '}
              {t('Register.Metrics.AccessRequest.AdministratorList')}
              {/* Alert renders the description in a <p>, which cannot hold a <ul>. */}
              <span
                role="list"
                className="mt-2 flex flex-col items-start gap-1">
                {administrators.map((administrator) => (
                  <span
                    role="listitem"
                    key={administrator.id}>
                    <a
                      className="content-compact-link"
                      href={`mailto:${administrator.email}?subject=${emailSubject}&body=${emailBody}`}>
                      {administrator.email}
                    </a>
                  </span>
                ))}
              </span>
            </>
          )}
        </>
      }
      action={
        <Button
          asChild
          priority="secondary"
          size="sm">
          <a
            href={MANAGE_USER_CAPABILITIES_DOCUMENTATION_URL}
            target="_blank"
            rel="noopener noreferrer">
            {t('Register.Metrics.AccessRequest.SeeDocumentation')}
            <Icon
              name="external-link"
              size={16}
            />
          </a>
        </Button>
      }
    />
  );
};
