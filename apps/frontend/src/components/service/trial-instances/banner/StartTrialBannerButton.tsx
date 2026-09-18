'use client';

import { ArrowRightAltIcon, KeyboardArrowRightIcon } from '@filigran/icon';
import { Button } from '@filigran/ui/servers';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import { invalidatePrivateNavigationQueries } from '@/components/menu/navigation/private/private-navigation-query-invalidation';
import { RegisterRegisteredPlatformsQuery } from '@/components/registration/register/register.graphql';

import {
  CreateDeploymentRequestMutation,
  DeploymentRequestsAvailableQuery,
} from '@/components/service/trial-instances/trial-instances.graphql';

import {
  TryFiligranProductForm,
  tryFiligranProductFormSchema,
} from '@/components/service/trial-instances/TryFiligranProductForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import { toast } from '@filigran/ui/clients';
import { trialInstancesCreateDeploymentRequestMutation } from '@generated/trialInstancesCreateDeploymentRequestMutation.graphql';

import {
  fetchQuery,
  loadQuery,
  useMutation,
  useRelayEnvironment,
} from 'react-relay';

import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { PRODUCTS_AVAILABLE_ON_TRIAL } from '@/components/service/trial-instances/banner/TryFiligranProductsBanner';
import { useOrgaFreeTrial } from '@/components/service/trial-instances/useOrgaFreeTrials';
import { IconActionContext } from '@/components/ui/IconActions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@filigran/ui';
import { trialInstancesDeploymentRequestsAvailableQuery } from '@generated/trialInstancesDeploymentRequestsAvailableQuery.graphql';
import {
  DeploymentRequestSource,
  PlatformIdentifier,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

// Component
export const StartTrialBannerButton = () => {
  const t = useTranslations();
  const environment = useRelayEnvironment();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { availableTrials, isBlacklisted, refetch } = useOrgaFreeTrial();

  const [openSheet, setOpenSheet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [platformIdentifier, setPlatformIdentifier] =
    useState<PlatformIdentifier>(PlatformIdentifier.Opencti);
  if (isBlacklisted) {
    return (
      <Button
        /* eslint-disable-next-line xtm-hub-theme-rules/no-fixed-tailwind-color */
        className="ml-xl bg-white text-black text-[12px] px-2 py-0.5 min-h-0 h-auto"
        disabled>
        {t('Service.Trials.StartTrial')}
        <KeyboardArrowRightIcon className="ml-s size-4" />
      </Button>
    );
  }
  const [commitCreateDeploymentRequestMutationMutation] =
    useMutation<trialInstancesCreateDeploymentRequestMutation>(
      CreateDeploymentRequestMutation
    );

  const deploymentRequestsAvailabilityQueryRef = useMemo(
    () =>
      loadQuery<trialInstancesDeploymentRequestsAvailableQuery>(
        environment,
        DeploymentRequestsAvailableQuery,
        {}
      ),
    [environment]
  );

  const handleSubmit = (
    values: z.infer<typeof tryFiligranProductFormSchema>
  ) => {
    setOpenSheet(false);
    const { acceptTerms: _, use_case, ...valuesWithoutAcceptTerms } = values;
    commitCreateDeploymentRequestMutationMutation({
      variables: {
        input: {
          ...valuesWithoutAcceptTerms,
          products: [platformIdentifier],
          use_cases_by_product: [
            { platform_identifier: platformIdentifier, use_case },
          ],
          source: DeploymentRequestSource.Xtmhub,
        },
      },
      updater: () => {
        window.dispatchEvent(new Event('refresh-registered-platforms'));
        fetchQuery(environment, RegisterRegisteredPlatformsQuery, {
          input: { identifier: platformIdentifier },
        }).subscribe({});
        refetch({}, { fetchPolicy: 'network-only' });
      },

      onCompleted: (response) => {
        invalidatePrivateNavigationQueries(queryClient);
        toast({
          title: t('Utils.Success'),
          description: t('Service.Trials.Form.FormRequested'),
        });

        const serviceInstanceId =
          response?.createDeploymentRequest?.service_instance_id;
        if (serviceInstanceId) {
          router.push(
            `/app/service/${platformIdentifier}_registration/${serviceInstanceId}`
          );
        }
      },
      onError: (error) => {
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    });
  };
  const handleProductChosen = (platformIdentifier: PlatformIdentifier) => {
    setOpenSheet(true);
    setMenuOpen(false);
    setPlatformIdentifier(platformIdentifier);
  };

  const getButton = (product: PlatformIdentifier) => {
    return (
      <Button
        variant="tertiary"
        onClick={() => handleProductChosen(product)}>
        <Image
          width="25"
          height="25"
          src={PlatformMetadataMapping[product].logoUrl}
          alt="Logo"
          className="mr-s"
        />
        {PlatformMetadataMapping[product].name}
      </Button>
    );
  };
  return (
    <SheetWithPreventingDialog
      title={t('Service.Trials.StartTrialWithName', {
        platformName: PlatformMetadataMapping[platformIdentifier].name,
      })}
      setOpen={setOpenSheet}
      open={openSheet}
      trigger={
        availableTrials.length === PRODUCTS_AVAILABLE_ON_TRIAL ? (
          <DropdownMenu
            open={menuOpen}
            onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-s cursor-pointer">
                <Button
                  onClick={() => setOpenSheet(true)}
                  /* eslint-disable-next-line xtm-hub-theme-rules/no-fixed-tailwind-color */
                  className="bg-white text-black text-[12px] px-2 py-0.5 min-h-0 h-auto">
                  {t('Service.Trials.StartTrial')}
                  <div
                    className={`ml-s inline-flex transition-transform ${
                      menuOpen ? 'rotate-90' : 'rotate-0'
                    }`}>
                    <KeyboardArrowRightIcon className="h-3 w-3" />
                  </div>
                </Button>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-full flex flex-col">
              <IconActionContext.Provider value={{ setMenuOpen }}>
                {getButton(PlatformIdentifier.Opencti)}
                {getButton(PlatformIdentifier.Openaev)}
              </IconActionContext.Provider>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            onClick={() => {
              setOpenSheet(true);
              setPlatformIdentifier(availableTrials[0]! as PlatformIdentifier);
            }}
            /* eslint-disable-next-line xtm-hub-theme-rules/no-fixed-tailwind-color */
            className="bg-white text-black text-[12px] px-s py-0.5 min-h-0 h-auto">
            {t('Service.Trials.StartTrial')}
            <ArrowRightAltIcon className="ml-s size-4" />
          </Button>
        )
      }>
      <TryFiligranProductForm
        handleSubmit={handleSubmit}
        handleCloseSheet={() => setOpenSheet(false)}
        deploymentRequestsAvailabilityQueryRef={
          deploymentRequestsAvailabilityQueryRef
        }
        platformIdentifier={platformIdentifier}
      />
    </SheetWithPreventingDialog>
  );
};
