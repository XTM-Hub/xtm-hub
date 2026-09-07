'use client';

import {
  getRegisteredPlatformServiceIdentifier,
  PlatformMetadataMapping,
} from '@/components/registration/PlatformIdentifierMapping';
import { PlatformUpdateSheet } from '@/components/service/components/PlatformUpdateSheet';
import { XtmoneStatusState } from '@/components/xtm-platform-trial/useXtmoneIntegrationStatus';
import { XtmoneConnectionStatus } from '@/components/xtm-platform-trial/XtmoneConnectionStatus';
import { useDateFormatter } from '@/utils/date';
import { EditIcon } from '@filigran/icon';
import { Badge, Button, Card, CardContent, Separator } from '@filigran/ui';
import { GradientButton } from '@filigran/ui/servers';
import { xtmPlatformBundleKeys } from '@graphql/deployment/deployment.keys';
import {
  PlatformConfigurationStatus,
  PlatformIdentifier,
  XtmPlatformBundleProductFragment,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface BundleProductCardProps {
  product: XtmPlatformBundleProductFragment;
  xtmoneStatus: XtmoneStatusState;
  canManage: boolean;
}

export const BundleProductCard = ({
  product,
  xtmoneStatus,
  canManage,
}: BundleProductCardProps) => {
  const t = useTranslations();
  const formatDate = useDateFormatter();
  const queryClient = useQueryClient();
  const [openEditName, setOpenEditName] = useState(false);

  if (!product.platform_identifier) {
    return null;
  }

  const { darkTextLogo, lightTextLogo, name } =
    PlatformMetadataMapping[product.platform_identifier];
  const registeredPlatform = product.registered_platform;
  const isXtmone = product.platform_identifier === PlatformIdentifier.Xtmone;
  const hasAccess = (registeredPlatform?.myGroups?.length ?? 0) > 0;
  const accessUrl =
    registeredPlatform?.url?.trim() || product.url?.trim() || null;
  const canAccess = isXtmone ? !!accessUrl : hasAccess && !!accessUrl;
  const roleLabel = (registeredPlatform?.myGroups ?? [])
    .map((role) => role.name)
    .join(', ');
  const accessLabel = t('XtmPlatformTrial.Products.AccessProduct', {
    productName: name,
  });

  const hasConnectivityInfo = registeredPlatform?.status != null;
  const isConnected =
    registeredPlatform?.status === PlatformConfigurationStatus.Active;
  const lastConnectionCheck =
    registeredPlatform?.last_connectivity_check ?? null;

  const productNameRow = (
    <div className="flex items-center justify-between gap-s py-l">
      <span className="text-content-body-base text-text-default-secondary shrink-0 whitespace-nowrap">
        {t('XtmPlatformTrial.Products.ProductName')}:
      </span>
      <div className="flex items-center gap-xs min-w-0">
        <Badge className="h-6 border-none bg-feedback-info-secondary-transparency text-content-body-base text-text-default-primary truncate">
          {product.service_instance?.name ?? '-'}
        </Badge>
        {canManage && (
          <Button
            variant="ghost"
            className="size-6 shrink-0 rounded-lg border border-elevation-border-strong p-0 text-text-default-primary"
            aria-label={t('XtmPlatformTrial.Products.EditName')}
            onClick={() => setOpenEditName(true)}>
            <EditIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Card className="h-full bg-elevation-background-layer-1">
      <CardContent className="p-4 flex flex-col gap-m h-full">
        <div className="flex gap-s items-center min-w-0">
          <Image
            src={darkTextLogo}
            alt={name}
            className="hidden h-9 w-auto shrink-0 dark:block"
          />
          <Image
            src={lightTextLogo}
            alt={name}
            className="block h-9 w-auto shrink-0 dark:hidden"
          />
        </div>
        {isXtmone ? (
          <div className="flex flex-col">
            {productNameRow}
            <Separator className="mb-m" />
            <XtmoneConnectionStatus status={xtmoneStatus} />
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-elevation-border-subtle-layer-1">
            {productNameRow}
            <div className="flex items-start justify-between gap-s py-l">
              <span className="text-content-body-base text-text-default-secondary shrink-0 whitespace-nowrap">
                {t('XtmPlatformTrial.Products.ConnectionStatus')}:
              </span>
              {!hasConnectivityInfo ? (
                <span className="text-content-body-base text-text-default-secondary text-left">
                  {t('XtmPlatformTrial.Products.StatusUnavailable')}
                </span>
              ) : isConnected ? (
                <span className="text-content-body-base text-feedback-success-primary text-left">
                  {t('XtmPlatformTrial.Products.StatusActive')}
                </span>
              ) : (
                <span className="text-content-body-base text-left">
                  <span className="text-feedback-error-primary">
                    {t('XtmPlatformTrial.Products.ConnectionLost')}
                  </span>{' '}
                  <span className="text-text-default-primary">
                    {t('XtmPlatformTrial.Products.ReconnectHint')}
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-s py-l">
              <span className="text-content-body-base text-text-default-secondary shrink-0 whitespace-nowrap">
                {t('XtmPlatformTrial.Products.LastConnection')}:
              </span>
              <span className="text-content-body-compact truncate">
                {formatDate(lastConnectionCheck ?? undefined, 'DATE_FULL') ??
                  '-'}
              </span>
            </div>
            <div className="flex items-start justify-between gap-s py-l">
              <span className="text-content-body-base text-text-default-secondary shrink-0 whitespace-nowrap">
                {t('XtmPlatformTrial.Products.Role')}:
              </span>
              {hasAccess ? (
                <span className="text-content-body-compact truncate">
                  {roleLabel}
                </span>
              ) : (
                <span className="text-content-body-compact text-left text-text-default-primary">
                  {t('XtmPlatformTrial.Products.NoRole')}{' '}
                  {t('XtmPlatformTrial.Products.NoRoleHint')}
                </span>
              )}
            </div>
          </div>
        )}
        <div className="flex justify-end mt-auto">
          {isXtmone ? (
            canAccess && accessUrl ? (
              <Link
                href={accessUrl}
                target="_blank"
                rel="noopener noreferrer">
                <GradientButton
                  variant="ia"
                  className="bg-background dark:bg-none"
                  tabIndex={-1}>
                  {accessLabel}
                </GradientButton>
              </Link>
            ) : (
              <Button disabled>{accessLabel}</Button>
            )
          ) : (
            <Button
              asChild={canAccess}
              disabled={!canAccess}>
              {canAccess && accessUrl ? (
                <Link
                  href={accessUrl}
                  target="_blank"
                  rel="noopener noreferrer">
                  {accessLabel}
                </Link>
              ) : (
                <span>{accessLabel}</span>
              )}
            </Button>
          )}
        </div>
      </CardContent>
      {canManage && (
        <PlatformUpdateSheet
          serviceInstanceId={product.service_instance_id}
          serviceInstanceName={product.service_instance?.name ?? ''}
          platformUrl={product.url ?? ''}
          serviceDefinitionIdentifier={getRegisteredPlatformServiceIdentifier(
            product.platform_identifier
          )}
          open={openEditName}
          setOpen={setOpenEditName}
          onUpdated={() =>
            queryClient.invalidateQueries({
              queryKey: xtmPlatformBundleKeys.all(),
            })
          }
        />
      )}
    </Card>
  );
};
