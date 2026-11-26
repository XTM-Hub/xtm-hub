import {
  LogoFiligranIcon,
  LogoXtmOneIcon,
  OpenAevIconIcon,
  OpenCtiIconIcon,
  OpenGrcIcon,
} from '@filigran/icon';
import { FiligranProduct } from '@graphql/generated';
import { ReactNode } from 'react';

export interface FiligranProductMetadata {
  name: string;
  logo: ReactNode;
}

export const FiligranProductMapping: Record<
  FiligranProduct,
  FiligranProductMetadata
> = {
  [FiligranProduct.Xtmhub]: {
    name: 'XTM Hub',
    logo: (
      <LogoFiligranIcon
        aria-hidden={true}
        className="w-5 h-5"
      />
    ),
  },
  [FiligranProduct.Opencti]: {
    name: 'OpenCTI',
    logo: (
      <OpenCtiIconIcon
        aria-hidden={true}
        className="w-5 h-5"
      />
    ),
  },
  [FiligranProduct.Openaev]: {
    name: 'OpenAEV',
    logo: (
      <OpenAevIconIcon
        aria-hidden={true}
        className="w-5 h-5"
      />
    ),
  },
  [FiligranProduct.Xtmone]: {
    name: 'XTM One',
    logo: (
      <LogoXtmOneIcon
        aria-hidden={true}
        className="w-5 h-5"
      />
    ),
  },
  // OpenGRC is OpenCRQ's former name: its icon is still exported as OpenGrcIcon.
  [FiligranProduct.Opencrq]: {
    name: 'OpenCRQ',
    logo: (
      <OpenGrcIcon
        aria-hidden={true}
        className="w-5 h-5"
      />
    ),
  },
};
