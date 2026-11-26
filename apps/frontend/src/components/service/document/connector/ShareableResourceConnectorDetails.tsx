'use client';

import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { ShareableResourceDetailsLink } from '@/components/service/document/ShareableResourceDetailsLink';
import { ShareableResourceBasicInformation } from '@/components/service/document/ui/ShareableResourceBasicInformation';
import { ShareableResourceDetailItem } from '@/components/service/document/ui/ShareableResourceDetailItem';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { roundToNearest } from '@/lib/utils';
import {
  FiligranWebsiteUtm,
  withFiligranWebsiteUtm,
} from '@/utils/filigran-website-utm';
import { Button } from '@filigran/design-system';
import { LogoGitIcon, OpenInNewIcon } from '@filigran/icon';
import { PlatformIdentifier } from '@graphql/generated';
import Link from 'next/link';
import * as React from 'react';

export interface ShareableResourceConnectorDetailsProps {
  connectorDetails: {
    name: string;
    source_code?: string | null;
    subscription_link?: string | null;
    integration_type?: string | null;
    product_version?: string | null;
    share_number?: number | null;
    manager_supported?: boolean;
    datasheet_url?: string | null;
    blogpost_url?: string | null;
    demo_url?: string | null;
    minimum_deployable_version?: string | null;
    contact?: string | null;
  };
  compatibilityItem?: React.ReactNode;
  filigranWebsiteUtm?: FiligranWebsiteUtm;
}

const CONNECTOR_DOCUMENTATION =
  'https://docs.opencti.io/latest/usage/import/external-connectors/';
export const ShareableResourceConnectorDetails = ({
  connectorDetails,
  compatibilityItem,
  filigranWebsiteUtm,
}: ShareableResourceConnectorDetailsProps) => {
  const t = useTranslate();
  const platformName = PlatformMetadataMapping[PlatformIdentifier.Opencti].name;

  return (
    <ShareableResourceBasicInformation>
      {connectorDetails.source_code && (
        <ShareableResourceDetailItem
          label={t('Service.Connectors.IntegrationDocumentationAndCode')}>
          <Button
            className="p-0 underline"
            priority="tertiary"
            asChild>
            <Link
              {...analyticsId('resource_source_code_open')}
              href={connectorDetails.source_code}
              target="_blank">
              <LogoGitIcon
                aria-hidden={true}
                className="h-4 w-4 mr-2"
              />
              {connectorDetails.name}
            </Link>
          </Button>
        </ShareableResourceDetailItem>
      )}
      {connectorDetails.subscription_link && (
        <ShareableResourceDetailItem
          label={t('Service.Connectors.VisitVendor')}>
          <Button
            className="p-0 uppercase underline"
            priority="tertiary"
            asChild>
            <Link
              {...analyticsId('resource_vendor_open')}
              href={
                filigranWebsiteUtm
                  ? withFiligranWebsiteUtm(
                      connectorDetails.subscription_link,
                      filigranWebsiteUtm
                    )
                  : connectorDetails.subscription_link
              }
              rel="noopener noreferrer"
              target="_blank">
              <OpenInNewIcon
                aria-hidden={true}
                className="h-4 w-4 mr-2"
              />
              {t('Service.Connectors.VendorContact')}
            </Link>
          </Button>
        </ShareableResourceDetailItem>
      )}
      {connectorDetails.integration_type && (
        <ShareableResourceDetailItem
          label={t('Service.ShareableResources.Details.IntegrationType')}>
          <div className="flex items-center gap-2">
            <span>
              {t(
                `Service.OpenctiIntegrations.Type.${connectorDetails.integration_type}`
              )}
            </span>
          </div>
        </ShareableResourceDetailItem>
      )}
      <ShareableResourceDetailItem
        label={t('Service.ShareableResources.Details.ProductVersion', {
          platform: platformName,
        })}>
        <span>{connectorDetails?.product_version}</span>
      </ShareableResourceDetailItem>
      {!!connectorDetails?.minimum_deployable_version && (
        <ShareableResourceDetailItem
          label={t(
            'Service.ShareableResources.Details.MinimumDeployableVersion',
            {
              platform: platformName,
            }
          )}>
          {compatibilityItem || (
            <span>{connectorDetails?.minimum_deployable_version}</span>
          )}
        </ShareableResourceDetailItem>
      )}
      <ShareableResourceDetailItem
        label={t('Service.ShareableResources.Details.OpenCTIDocumentation')}>
        <ShareableResourceDetailsLink
          url={CONNECTOR_DOCUMENTATION}
          filigranWebsiteUtm={filigranWebsiteUtm}
        />
      </ShareableResourceDetailItem>

      {connectorDetails?.datasheet_url && (
        <ShareableResourceDetailItem
          label={t('Service.ShareableResources.Details.DatasheetURL')}>
          <ShareableResourceDetailsLink
            url={connectorDetails.datasheet_url}
            filigranWebsiteUtm={filigranWebsiteUtm}
          />
        </ShareableResourceDetailItem>
      )}
      {connectorDetails?.blogpost_url && (
        <ShareableResourceDetailItem
          label={t('Service.ShareableResources.Details.BlogpostURL')}>
          <ShareableResourceDetailsLink
            url={connectorDetails.blogpost_url}
            filigranWebsiteUtm={filigranWebsiteUtm}
          />
        </ShareableResourceDetailItem>
      )}
      {connectorDetails?.demo_url && (
        <ShareableResourceDetailItem
          label={t('Service.ShareableResources.Details.DemoURL')}>
          <ShareableResourceDetailsLink
            url={connectorDetails.demo_url}
            filigranWebsiteUtm={filigranWebsiteUtm}
          />
        </ShareableResourceDetailItem>
      )}
      <ShareableResourceDetailItem
        label={t('Service.ShareableResources.Details.Shares')}>
        <span>{roundToNearest(connectorDetails.share_number)}</span>
      </ShareableResourceDetailItem>
      {connectorDetails.contact && (
        <ShareableResourceDetailItem
          label={t('Service.ShareableResources.Details.ContributorContact')}>
          <span>{connectorDetails.contact}</span>
        </ShareableResourceDetailItem>
      )}
    </ShareableResourceBasicInformation>
  );
};
