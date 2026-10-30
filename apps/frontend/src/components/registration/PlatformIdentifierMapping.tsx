import {
  LogoXtmOneIcon,
  OpenAevIconIcon,
  OpenCtiIconIcon,
} from '@filigran/icon';
import { ServiceDefinitionIdentifier as ServiceDefinitionIdentifierFragment } from '@generated/serviceInstance_fragment.graphql';
import {
  PlatformContract,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import openaevTextLogo from '@public/logo_openaev_text.png';
import openaevTextDarkLogo from '@public/logo_openaev_text_dark.png';
import openctiTextLogo from '@public/logo_opencti_text.png';
import openctiTextDarkLogo from '@public/logo_opencti_text_dark.png';
import xtmoneTextLogo from '@public/logo_xtmone_text.png';
import xtmoneTextDarkLogo from '@public/logo_xtmone_text_dark.png';
import { StaticImageData } from 'next/image';
import { JSX } from 'react';

export interface PlatformMetadata {
  name: string;
  lightTextLogo: StaticImageData;
  darkTextLogo: StaticImageData;
  Icon: ({ className }: { className: string }) => JSX.Element;
  iconClassName: string;
}

export const PlatformMetadataMapping: Record<
  PlatformIdentifier,
  PlatformMetadata
> = {
  [PlatformIdentifier.Opencti]: {
    name: 'OpenCTI',
    lightTextLogo: openctiTextLogo,
    darkTextLogo: openctiTextDarkLogo,
    Icon: ({ className }) => <OpenCtiIconIcon className={className} />,
    iconClassName: 'text-filigran-brand-primary',
  },
  [PlatformIdentifier.Openaev]: {
    name: 'OpenAEV',
    lightTextLogo: openaevTextLogo,
    darkTextLogo: openaevTextDarkLogo,
    Icon: ({ className }) => <OpenAevIconIcon className={className} />,
    iconClassName: 'text-filigran-brand-primary',
  },
  [PlatformIdentifier.Xtmone]: {
    name: 'XTM One',
    lightTextLogo: xtmoneTextLogo,
    darkTextLogo: xtmoneTextDarkLogo,
    Icon: ({ className }) => <LogoXtmOneIcon className={className} />,
    iconClassName: 'text-filigran-ia-primary',
  },
};

export const CONTRACT_LABEL_BY_CONTRACT: Record<PlatformContract, string> = {
  [PlatformContract.Ce]: 'Contracts.CE',
  [PlatformContract.Ee]: 'Contracts.EE',
  [PlatformContract.Trial]: 'Contracts.TRIAL',
};

export const translateServiceDefinitionIdentifier = (
  serviceDefinitionIdentifier: ServiceDefinitionIdentifierFragment
): string => {
  const platformIdentifier =
    ServiceDefinitionIdentifierToPlatformIdentifier[
      serviceDefinitionIdentifier
    ] ?? PlatformIdentifier.Openaev;

  return PlatformMetadataMapping[platformIdentifier].name;
};

export const ServiceDefinitionIdentifierToPlatformIdentifier: Partial<
  Record<ServiceDefinitionIdentifierFragment, PlatformIdentifier>
> = {
  [ServiceDefinitionIdentifier.OpenctiRegistration]: PlatformIdentifier.Opencti,
  [ServiceDefinitionIdentifier.OpenaevRegistration]: PlatformIdentifier.Openaev,
  [ServiceDefinitionIdentifier.XtmoneRegistration]: PlatformIdentifier.Xtmone,
};

export const getRegisteredPlatformServiceIdentifier = (
  platformIdentifier: PlatformIdentifier
): ServiceDefinitionIdentifier => {
  const mapping: Record<PlatformIdentifier, ServiceDefinitionIdentifier> = {
    [PlatformIdentifier.Opencti]:
      ServiceDefinitionIdentifier.OpenctiRegistration,
    [PlatformIdentifier.Openaev]:
      ServiceDefinitionIdentifier.OpenaevRegistration,
    [PlatformIdentifier.Xtmone]: ServiceDefinitionIdentifier.XtmoneRegistration,
  };

  return mapping[platformIdentifier];
};
